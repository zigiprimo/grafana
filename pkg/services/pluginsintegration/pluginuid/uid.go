package pluginuid

import (
	"github.com/grafana/grafana/pkg/plugins"
)

func FromPluginID(pluginID string) plugins.UID {
	return plugins.UID(pluginID)
}
