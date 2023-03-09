package sources

import (
	"context"

	"github.com/grafana/grafana/pkg/plugins"
)

type Resolver interface {
	List(context.Context) []Sourcer
}

type Sourcer interface {
	Source(ctx context.Context) ([]*plugins.FoundBundle, error)
	PluginClass(ctx context.Context) plugins.Class
	DefaultSignature(ctx context.Context) (plugins.Signature, bool)
}
