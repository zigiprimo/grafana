package finder

import (
	"context"
	"path/filepath"

	"github.com/Masterminds/semver/v3"

	"github.com/grafana/grafana/pkg/services/featuremgmt"

	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/log"
)

type dupeSelector struct {
	features plugins.FeatureToggles
	log      log.Logger
}

func newDupeSelector(features plugins.FeatureToggles) *dupeSelector {
	return &dupeSelector{
		features: features,
		log:      log.New("plugins.duplicate-selector"),
	}
}

func (ds *dupeSelector) Filter(_ context.Context, class plugins.Class, ps []plugins.FoundPlugin) ([]plugins.FoundPlugin, error) {
	if len(ps) == 0 {
		return ps, nil
	}

	// Check if multiple plugins with the same ID exist
	dupes := make(map[string][]plugins.FoundPlugin)
	for _, p := range ps {
		dupes[p.JSONData.ID] = append(dupes[p.JSONData.ID], p)
	}
	if len(dupes) == 0 {
		return ps, nil
	}

	var res []plugins.FoundPlugin
	for _, d := range dupes {
		if len(d) == 1 {
			res = append(res, d[0])
			continue
		}

		res = append(res, ds.resolve(class, d))
	}

	return res, nil
}

// resolve will resolve a single plugin from a list of plugins with the same ID.
func (ds *dupeSelector) resolve(class plugins.Class, plugins []plugins.FoundPlugin) plugins.FoundPlugin {
	if len(plugins) == 1 {
		return plugins[0]
	}

	// recursively compare plugins until we resolve a single plugin
	for i := 0; i < len(plugins)-1; i++ {
		for j := i + 1; j < len(plugins); {
			ds.log.Debug("Comparing duplicate plugins", "i", plugins[i].FS.Base(), "j", plugins[j].FS.Base())
			c := ds.cmp(class, plugins[i], plugins[j])
			if c == 1 {
				return ds.resolve(class, append(plugins[j+1:], plugins[i]))
			} else if c == -1 {
				return ds.resolve(class, plugins[j:])
			} else {
				return ds.resolve(class, plugins[j:])
			}
		}
	}

	return ds.resolve(class, plugins)
}

// cmp compares two plugins and returns 1 if p1 is preferred over p2, -1 if vice versa, and 0 if they are equal.
func (ds *dupeSelector) cmp(class plugins.Class, p1, p2 plugins.FoundPlugin) int {
	p1InDist := inDistFolder(p1)
	p2InDist := inDistFolder(p2)

	if class == plugins.ClassCore {
		externalCoreFeatureEnabled := ds.features.IsEnabledGlobally(featuremgmt.FlagExternalCorePlugins)
		if !externalCoreFeatureEnabled {
			if p1InDist && !p2InDist {
				return 1
			}

			if !p1InDist && p2InDist {
				return -1
			}
		}
	}

	if p1InDist && !p2InDist {
		return 1
	}

	if !p1InDist && p2InDist {
		return -1
	}

	return ds.compareVersions(p1, p2)
}

// compareVersions tries to parse the version of two plugins and returns 1 if p1 is preferred over p2, -1 if vice versa,
// and 0 if they are equal.
func (ds *dupeSelector) compareVersions(p1, p2 plugins.FoundPlugin) int {
	sv1, err := pluginVersion(p1)
	sv2, err2 := pluginVersion(p2)
	if err != nil && err2 != nil {
		ds.log.Debug("Could not parse versions", "pluginId", p1.JSONData.ID, "version", p1.JSONData.Info.Version, "pluginId", p2.JSONData.ID, "version", p2.JSONData.Info.Version)
		return 0
	}

	if err != nil {
		ds.log.Debug("Could not parse version", "pluginId", p1.JSONData.ID, "version", p1.JSONData.Info.Version)
		return 1
	}
	if err2 != nil {
		ds.log.Debug("Could not parse version", "pluginId", p2.JSONData.ID, "version", p2.JSONData.Info.Version)
		return -1
	}

	return sv1.Compare(sv2)
}

func pluginVersion(p plugins.FoundPlugin) (*semver.Version, error) {
	return semver.NewVersion(p.JSONData.Info.Version)
}

// inDistFolder returns true if the parent directory of the plugin is named "dist".
func inDistFolder(b plugins.FoundPlugin) bool {
	return filepath.Base(b.FS.Base()) == "dist"
}
