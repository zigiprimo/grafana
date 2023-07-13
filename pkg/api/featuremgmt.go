package api

import (
	"github.com/grafana/grafana/pkg/api/response"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
)

func (hs *HTTPServer) GetFeatureToggles(ctx *contextmodel.ReqContext) response.Response {
	allFlags := hs.Features.GetFlags()
	enabledFlags := hs.Features.GetEnabled(ctx.Req.Context())

	for i, flag := range allFlags {
		allFlags[i].Enabled = enabledFlags[flag.Name]
	}

	// TODO filter out hidden configs
	// TODO set readonly field from configs

	return response.JSON(200, allFlags)
}
