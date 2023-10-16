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

	// type ChangeEnabledCmd struct {
	// 	Enabled bool   `json:"enabled"`
	// 	AuthUrl string `json:"auth_url"`
	// }
	// var cmd ChangeEnabledCmd
	// err := web.Bind(c.Req, &cmd)
	// if err != nil {
	// 	return response.Error(http.StatusBadRequest, "invalid request", err)
	// }
	var input map[string]string
	err := web.Bind(c.Req, &input)
	if err != nil {
		return response.Error(http.StatusBadRequest, "invalid request", err)
	}
	updates := make(setting.SettingsBag)
	section := fmt.Sprintf("auth.%s", id)
	// updates[section] = map[string]string{
	// 	"auth_url": cmd.AuthUrl,
	// 	"enabled": fmt.Sprintf("%t", cmd.Enabled),
	// }
	updates[section] = input
	hs.SettingsProvider.Update(updates, nil)
	return response.JSON(http.StatusOK, map[string]string{"id": id})
}
