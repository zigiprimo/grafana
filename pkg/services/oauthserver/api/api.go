package api

import (
	"net/http"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/middleware"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/oauthserver"
	"github.com/grafana/grafana/pkg/web"
)

type api struct {
	router      routing.RouteRegister
	oauthServer oauthserver.OAuth2Server
}

func NewAPI(
	router routing.RouteRegister,
	oauthServer oauthserver.OAuth2Server,
) *api {
	return &api{
		router:      router,
		oauthServer: oauthServer,
	}
}

func (a *api) RegisterAPIEndpoints() {
	a.router.Group("/oauth2", func(oauthRouter routing.RouteRegister) {
		oauthRouter.Post("/introspect", a.handleIntrospectionRequest)
		oauthRouter.Post("/token", a.handleTokenRequest)

		reqGrafanaAdmin := middleware.ReqGrafanaAdmin
		oauthRouter.Post("/register", reqGrafanaAdmin, a.register)
	})
}

func (a *api) register(c *contextmodel.ReqContext) response.Response {
	registration := &oauthserver.ExternalServiceRegistration{}
	err := web.Bind(c.Req, registration)
	if err != nil {
		return response.Error(http.StatusBadRequest, "invalid registration", err)
	}
	app, err := a.oauthServer.SaveExternalService(c.Req.Context(), registration)
	if err != nil {
		return response.Error(http.StatusInternalServerError, "could not register app", err)
	}
	return response.JSON(http.StatusOK, app)
}

func (a *api) handleTokenRequest(c *contextmodel.ReqContext) {
	a.oauthServer.HandleTokenRequest(c.Resp, c.Req)
}

func (a *api) handleIntrospectionRequest(c *contextmodel.ReqContext) {
	a.oauthServer.HandleIntrospectionRequest(c.Resp, c.Req)
}
