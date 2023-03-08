package sources

import (
	"context"

	"github.com/grafana/grafana/pkg/plugins"
)

type Resolver interface {
	Get(context.Context, plugins.Class) (plugins.PluginSource, bool)
	List(context.Context) []plugins.PluginSource
}
