package process

import (
	"context"

	"github.com/grafana/grafana/pkg/plugins/pluginuid"
)

type Service interface {
	// Start executes a backend plugin process.
	Start(ctx context.Context, pluginUID pluginuid.UID) error
	// Stop terminates a backend plugin process.
	Stop(ctx context.Context, pluginUID pluginuid.UID) error
}
