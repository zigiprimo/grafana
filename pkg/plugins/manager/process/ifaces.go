package process

import (
	"context"

	"github.com/grafana/grafana/pkg/plugins"
)

type Service interface {
	// Start executes a backend plugin process.
	Start(ctx context.Context, pluginUID plugins.UID) error
	// Stop terminates a backend plugin process.
	Stop(ctx context.Context, pluginUID plugins.UID) error
}
