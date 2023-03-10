package sources

import (
	"context"

	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/manager/loader/finder"
)

type LocalSource struct {
	class plugins.Class
	paths []string
}

func NewLocalSource(class plugins.Class, paths []string) *LocalSource {
	return &LocalSource{
		class: class,
		paths: paths,
	}
}

func (s *LocalSource) PluginClass(_ context.Context) plugins.Class {
	return s.class
}

func (s *LocalSource) DefaultSignature(_ context.Context) (plugins.Signature, bool) {
	switch s.class {
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

func (s *LocalSource) Get(ctx context.Context) ([]*plugins.FoundBundle, error) {
	f := finder.NewLocalFinder(s.paths)
	return f.Find(ctx)
}
