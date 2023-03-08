package sources

import (
	"context"
	"path/filepath"

	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/config"
	"github.com/grafana/grafana/pkg/plugins/log"
	"github.com/grafana/grafana/pkg/setting"
)

type Service struct {
	srcs map[plugins.Class]plugins.PluginSource
	log  log.Logger
}

func ProvideService(gCfg *setting.Cfg, cfg *config.Cfg) *Service {
	return &Service{
		srcs: map[plugins.Class]plugins.PluginSource{
			plugins.Core:     {Class: plugins.Core, Paths: corePluginPaths(gCfg.StaticRootPath)},
			plugins.Bundled:  {Class: plugins.Bundled, Paths: []string{gCfg.BundledPluginsPath}},
			plugins.External: {Class: plugins.External, Paths: append([]string{cfg.PluginsPath}, pluginFSPaths(cfg.PluginSettings)...)},
		},
		log: log.New("plugin.sources"),
	}
}

func (s *Service) List(_ context.Context) []plugins.PluginSource {
	var srcs []plugins.PluginSource
	for _, src := range s.srcs {
		srcs = append(srcs, src)
	}

	return srcs
}

func (s *Service) Get(_ context.Context, class plugins.Class) (plugins.PluginSource, bool) {
	if srcs, exists := s.srcs[class]; exists {
		return srcs, true
	}

	return plugins.PluginSource{}, false
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
