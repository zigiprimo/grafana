package snapshots

import (
	"context"

	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/infra/log"
)

var (
	logger = log.New("snapshots")
)

type Service interface {
	GetSnapshotDataByID(ctx context.Context, cmd GetSnapshotDataCommand) (SnapshotData, error)
	CreateSnapshotData(ctx context.Context, cmd CreateSnapshotDataCommand) error
	UpdateSnapshotDataById(ctx context.Context, cmd UpdateSnapshotDataByIdCommand) error
	DeleteSnapshotDataById(ctx context.Context, cmd DeleteSnapshotDataByIdCommand) error
}

type SnapshotDataService struct {
	SQLStore      db.DB
	RouteRegister routing.RouteRegister
}

func ProvideService(sqlStore db.DB, routeRegister routing.RouteRegister) *SnapshotDataService {
	s := &SnapshotDataService{SQLStore: sqlStore, RouteRegister: routeRegister}

	s.registerAPIEndpoints()

	return s
}

func (s SnapshotDataService) GetSnapshotDataByID(ctx context.Context, cmd GetSnapshotDataCommand) (SnapshotData, error) {
	return s.getSnapshotDataByID(ctx, cmd)
}

func (s SnapshotDataService) CreateSnapshotData(ctx context.Context, cmd CreateSnapshotDataCommand) error {
	return s.createSnapshotData(ctx, cmd)
}

func (s SnapshotDataService) UpdateSnapshotDataById(ctx context.Context, cmd UpdateSnapshotDataByIdCommand) error {
	// return s.updateSnapshotDataById(ctx, cmd)
	return nil
}

func (s SnapshotDataService) DeleteSnapshotDataById(ctx context.Context, cmd DeleteSnapshotDataByIdCommand) error {
	return s.deleteSnapshotDataById(ctx, cmd)
}
