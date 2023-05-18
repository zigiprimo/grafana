package snapshots

import (
	"net/http"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/api/routing"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/web"
)

// n0pbiN
func (s *SnapshotDataService) registerAPIEndpoints() {
	s.RouteRegister.Group("/api/snapshot-data", func(snapshotRoute routing.RouteRegister) {
		snapshotRoute.Get("/:uid", routing.Wrap(s.getSnapshotDataHandler))
		snapshotRoute.Post("/", routing.Wrap(s.createSnapshotHandler))
		// snapshotRoute.Patch("/:id", routing.Wrap(hs.UpdateSnapshot))
		// snapshotRoute.Delete("/:id", routing.Wrap(hs.DeleteSnapshot))
	})
}

func (s *SnapshotDataService) createSnapshotHandler(c *contextmodel.ReqContext) response.Response {
	cmd := CreateSnapshotDataCommand{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}

	err := s.CreateSnapshotData(c.Req.Context(), cmd)
	if err != nil {
		return response.Error(http.StatusInternalServerError, "Failed to add snapshot", err)
	}

	return response.JSON(http.StatusOK, CreateSnapshotResponse{Message: "Snapshot created"})
}

func (s *SnapshotDataService) getSnapshotDataHandler(c *contextmodel.ReqContext) response.Response {
	cmd := GetSnapshotDataCommand{}

	cmd.UID = web.Params(c.Req)[":uid"]

	snapshot, err := s.GetSnapshotDataByID(c.Req.Context(), cmd)
	if err != nil {
		return response.Error(http.StatusInternalServerError, "Failed to get snapshot", err)
	}

	return response.JSON(http.StatusOK, snapshot)
}
