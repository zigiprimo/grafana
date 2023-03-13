package sources

import (
	"context"
	"path/filepath"

	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/config"
	"github.com/grafana/grafana/pkg/plugins/log"
	"github.com/grafana/grafana/pkg/plugins/manager/loader"
	"github.com/grafana/grafana/pkg/setting"
)

type Service struct {
	loader loader.Service
	srcs   []*LocalSource
	log    log.Logger
}

func ProvideService(gCfg *setting.Cfg, cfg *config.Cfg, loader loader.Service) *Service {
	return &Service{
		srcs: []*LocalSource{
			NewLocalSource(loader, plugins.Core, corePluginPaths(gCfg.StaticRootPath)),
			NewLocalSource(loader, plugins.Bundled, []string{gCfg.BundledPluginsPath}),
			NewLocalSource(loader, plugins.External, append([]string{cfg.PluginsPath}, pluginFSPaths(cfg.PluginSettings)...)),
		},
		log: log.New("plugin.sources"),
	}
}

func (s *Service) List(_ context.Context) []plugins.Source {
	var res []plugins.Source
	for _, src := range s.srcs {
		res = append(res, src)
	}
	return res
}

// corePluginPaths provides a list of the Core plugin file system paths
func corePluginPaths(staticRootPath string) []string {
	datasourcePaths := filepath.Join(staticRootPath, "app/plugins/datasource")
	panelsPath := filepath.Join(staticRootPath, "app/plugins/panel")
	return []string{datasourcePaths, panelsPath}
}

// pluginSettingPaths provides plugin file system paths defined in cfg.PluginSettings
func pluginFSPaths(ps map[string]map[string]string) []string {
	var pluginSettingDirs []string
	for _, s := range ps {
		path, exists := s["path"]
		if !exists || path == "" {
			continue
		}
		pluginSettingDirs = append(pluginSettingDirs, path)
	}
	return pluginSettingDirs
}
