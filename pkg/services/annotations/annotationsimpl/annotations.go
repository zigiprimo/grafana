package annotationsimpl

import (
	"context"
	"fmt"
	"net/http"

	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/annotations"
	"github.com/grafana/grafana/pkg/services/datasources"
	"github.com/grafana/grafana/pkg/services/tag"
	"github.com/grafana/grafana/pkg/setting"
)

type RepositoryImpl struct {
	store store
}

func ProvideService(db db.DB, cfg *setting.Cfg, tagService tag.Service, datasourceSrv datasources.DataSourceService) (*RepositoryImpl, error) {
	lokiDatasources, err := datasourceSrv.GetDataSourcesByType(context.TODO(), &datasources.GetDataSourcesByTypeQuery{
		Type: "loki",
	})
	if err != nil {
		// TODO change error to errutil
		return nil, fmt.Errorf("failed to fetch loki data sources: %w", err)
	}

	if len(lokiDatasources) <= 0 {
		// TODO change error to errutil
		return nil, fmt.Errorf("no loki data sources found")
	}

	lokiCfg, err := newLokiConfig(lokiDatasources[0])
	if err != nil {
		// TODO change error to errutil
		return nil, fmt.Errorf("failed to get loki config: %w", err)
	}

	// TODO fix me: use database or loki store depending on the configuration
	return &RepositoryImpl{
		store: &lokiRepositoryImpl{
			cfg:               cfg,
			db:                db,
			log:               log.New("annotations"),
			tagService:        tagService,
			maximumTagsLength: cfg.AnnotationMaximumTagsLength,
			httpLokiClient:    newLokiClient(lokiCfg, &http.Client{}, log.New("annotations.loki")),
		},
	}, nil
}

func (r *RepositoryImpl) Save(ctx context.Context, item *annotations.Item) error {
	return r.store.Add(ctx, item)
}

// SaveMany inserts multiple annotations at once.
// It does not return IDs associated with created annotations. If you need this functionality, use the single-item Save instead.
func (r *RepositoryImpl) SaveMany(ctx context.Context, items []annotations.Item) error {
	return r.store.AddMany(ctx, items)
}

func (r *RepositoryImpl) Update(ctx context.Context, item *annotations.Item) error {
	return r.store.Update(ctx, item)
}

func (r *RepositoryImpl) Find(ctx context.Context, query *annotations.ItemQuery) ([]*annotations.ItemDTO, error) {
	return r.store.Get(ctx, query)
}

func (r *RepositoryImpl) Delete(ctx context.Context, params *annotations.DeleteParams) error {
	return r.store.Delete(ctx, params)
}

func (r *RepositoryImpl) FindTags(ctx context.Context, query *annotations.TagsQuery) (annotations.FindTagsResult, error) {
	return r.store.GetTags(ctx, query)
}
