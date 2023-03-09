package sources

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/config"
	"github.com/grafana/grafana/pkg/setting"
)

func TestSources_List(t *testing.T) {
	t.Run("Plugin sources are populated by default and listed in specific order", func(t *testing.T) {
		cfg := &setting.Cfg{
			BundledPluginsPath: "path1",
		}
		pCfg := &config.Cfg{
			PluginsPath: "path2",
			PluginSettings: setting.PluginSettings{
				"foo": map[string]string{
					"path": "path3",
				},
				"bar": map[string]string{
					"url": "https://grafana.plugin",
				},
			},
		}

		s := ProvideService(cfg, pCfg)
		srcs := s.List(context.Background())
		expectedClasses := []plugins.Class{plugins.Core, plugins.Bundled, plugins.External}

		var classes []plugins.Class
		for _, src := range srcs {
			classes = append(classes, src.PluginClass(context.Background()))
		}

		require.Equal(t, expectedClasses, classes)
	})
}
