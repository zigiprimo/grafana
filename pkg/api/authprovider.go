package api

import (
	"net/http"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/login/social"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/web"
	"github.com/mitchellh/mapstructure"
)

func (hs *HTTPServer) UpdateAuthProvider(c *contextmodel.ReqContext) response.Response {
	id, ok := web.Params(c.Req)[":key"]
	if ok != true {
		return response.Error(http.StatusNotFound, "id is invalid", nil)
	}

	connector, err := hs.SocialService.GetConnector(id)
	if err != nil {
		return response.Error(http.StatusNotFound, "id is invalid", nil)
	}

	var data map[string]interface{}
	err = web.Bind(c.Req, &data)
	if err != nil {
		return response.Error(http.StatusBadRequest, "invalid request", err)
	}

	// Return a list, etc instead of an error/errorlist to the user
	var oauthInfo social.OAuthInfo
	err = mapstructure.Decode(data, &oauthInfo)
	if err != nil {
		return response.Error(http.StatusBadRequest, "invalid request", err)
	}

	err = connector.Validate(&oauthInfo)
	if err != nil {
		return response.Error(http.StatusBadRequest, "invalid request", err)
	}

	hs.SocialService.UpdateProvider("azuread", &oauthInfo)

	// type ChangeEnabledCmd struct {
	// 	Enabled bool   `json:"enabled"`
	// 	AuthUrl string `json:"auth_url"`
	// }
	// var cmd ChangeEnabledCmd
	// err := web.Bind(c.Req, &cmd)
	// if err != nil {
	// 	return response.Error(http.StatusBadRequest, "invalid request", err)
	// }
	// var input map[string]string
	// err := web.Bind(c.Req, &input)
	// if err != nil {
	// 	return response.Error(http.StatusBadRequest, "invalid request", err)
	// }
	// updates := make(setting.SettingsBag)
	// section := fmt.Sprintf("auth.%s", id)
	// // updates[section] = map[string]string{
	// // 	"auth_url": cmd.AuthUrl,
	// // 	"enabled": fmt.Sprintf("%t", cmd.Enabled),
	// // }
	// updates[section] = input
	// hs.SettingsProvider.Update(updates, nil)
	return response.JSON(http.StatusNoContent, nil)
}
