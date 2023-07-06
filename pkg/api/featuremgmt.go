package api

import (
	"github.com/grafana/grafana/pkg/api/response"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
)

func (hs *HTTPServer) GetFeatureToggles(c *contextmodel.ReqContext) response.Response {
	allFlags := hs.Features.GetFlags()
	return response.JSON(200, allFlags)
}
