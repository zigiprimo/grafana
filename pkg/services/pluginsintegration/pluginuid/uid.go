package pluginuid

import (
	"github.com/grafana/grafana-plugin-sdk-go/backend"

	"github.com/grafana/grafana/pkg/plugins/pluginuid"
	"github.com/grafana/grafana/pkg/services/datasources"
	"github.com/grafana/grafana/pkg/services/pluginsintegration/pluginsettings"
)

func FromPluginContext(pCtx backend.PluginContext) pluginuid.UID {
	return pluginuid.UID(pCtx.PluginID)
}

func FromDataSource(ds *datasources.DataSource) pluginuid.UID {
	return pluginuid.UID(ds.Type)
}

func FromPluginID(pluginID string) pluginuid.UID {
	return pluginuid.UID(pluginID)
}

func FromPluginSettingInfo(ps *pluginsettings.InfoDTO) pluginuid.UID {
	return pluginuid.UID(ps.PluginID)
}
