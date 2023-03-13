package sources

import (
	"context"

	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/manager/loader"
	"github.com/grafana/grafana/pkg/plugins/manager/loader/finder"
)

type LocalSource struct {
	loader loader.Service
	finder *finder.Local
	class  plugins.Class
}

func NewLocalSource(loader loader.Service, class plugins.Class, paths []string) *LocalSource {
	return &LocalSource{
		class:  class,
		loader: loader,
		finder: finder.NewLocalFinder(paths),
	}
}

func (s *LocalSource) PluginClass(_ context.Context) plugins.Class {
	return s.class
}

func (s *LocalSource) GetPlugins(ctx context.Context) ([]*plugins.Plugin, error) {
	found, err := s.finder.Find(ctx)
	if err != nil {
		return nil, err
	}

	return s.loader.Load(ctx, &localInstalledPlugins{
		class:   s.PluginClass(ctx),
		plugins: found,
	})
}

var _ plugins.PluginSourceInstance = (*localInstalledPlugins)(nil)

type localInstalledPlugins struct {
	class   plugins.Class
	plugins []*plugins.FoundBundle
}

func (p *localInstalledPlugins) PluginClass(_ context.Context) plugins.Class {
	return p.class
}

func (p *localInstalledPlugins) DefaultSignature(_ context.Context) (plugins.Signature, bool) {
	switch p.class {
	case plugins.Core:
		return plugins.Signature{
			Status: plugins.SignatureInternal,
			//Type:       plugins.GrafanaSignature,
			//SigningOrg: "Grafana Labs",
		}, true
	default:
		return plugins.Signature{}, false
	}
}

func (p *localInstalledPlugins) GetPlugins(_ context.Context) []*plugins.FoundBundle {
	return p.plugins
}
