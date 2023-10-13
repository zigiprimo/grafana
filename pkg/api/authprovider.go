package api

import (
	"fmt"
	"net/http"

	"github.com/grafana/grafana/pkg/api/response"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/web"
)

func (hs *HTTPServer) UpdateAuthProvider(c *contextmodel.ReqContext) response.Response {
	id, ok := web.Params(c.Req)[":key"]
	if ok != true {
		return response.Error(http.StatusNotFound, "id is invalid", nil)
	}

	type ChangeEnabledCmd struct {
		Enabled  bool   `json:"enabled"`
		TokenUrl string `json:"token_url"`
	}
	var cmd ChangeEnabledCmd
	err := web.Bind(c.Req, &cmd)
	if err != nil {
		return response.Error(http.StatusBadRequest, "invalid request", err)
	}
	updates := make(setting.SettingsBag)
	section := fmt.Sprintf("auth.%s", id)
	updates[section] = map[string]string{"token_url": cmd.TokenUrl, "enabled": fmt.Sprintf("%t", cmd.Enabled)}
	hs.SettingsProvider.Update(updates, nil)
	return response.JSON(http.StatusOK, map[string]string{"id": id})
}
