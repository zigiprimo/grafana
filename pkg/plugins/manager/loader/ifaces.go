package loader

import (
	"context"

	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/manager/sources"
)

// Service is responsible for loading plugins from the file system.
type Service interface {
	// Load will return a list of plugins found in the provided plugin source
	Load(ctx context.Context, src sources.Source) ([]*plugins.Plugin, error)
	// Unload will unload a specified plugin from the file system.
	Unload(ctx context.Context, pluginID string) error
}
