package grafanaapiserver

import (
	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/middleware"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/setting"
)

func (s *service) registerRoutes(cfg *setting.Cfg) {
	proxyHandler := func(k8sRoute routing.RouteRegister) {
		handler := func(c *contextmodel.ReqContext) {
			if s.handler == nil {
				c.Resp.WriteHeader(404)
				_, _ = c.Resp.Write([]byte("Not found"))
				return
			}

			if handle, ok := s.handler.(func(c *contextmodel.ReqContext)); ok {
				handle(c)
				return
			}
		}
		k8sRoute.Get("/apiserver-metrics", middleware.MetricsEndpointBasicAuth(cfg), handler)
		k8sRoute.Get("/metrics", middleware.MetricsEndpointBasicAuth(cfg), handler)
		//k8sRoute.Any("/playlists", middleware.ReqSignedIn, handler)
		//k8sRoute.Any("/*", middleware.ReqSignedIn, handler)
	}

	s.rr.Group("/apiserver-metrics", proxyHandler)
	s.rr.Group("/apis", proxyHandler)
	s.rr.Group("/openapi", proxyHandler)
}
