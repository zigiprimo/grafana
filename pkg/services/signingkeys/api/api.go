package api

import (
	"net/http"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/api/routing"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/signingkeys"
)

type Api struct {
	routeRegister routing.RouteRegister
	signingKeySvc signingkeys.Service
}

func NewAPI(routeRegister routing.RouteRegister, signingKeySvc signingkeys.Service) *Api {
	return &Api{
		routeRegister: routeRegister,
		signingKeySvc: signingKeySvc,
	}
}

func (a *Api) RegisterAPIEndpoints() {
	a.routeRegister.Get("/.well-known/jwks.json", routing.Wrap(a.getJWKS))
}

func (a *Api) getJWKS(c *contextmodel.ReqContext) response.Response {
	keyset := a.signingKeySvc.GetJWKS()

	return response.JSON(http.StatusOK, keyset)
}
