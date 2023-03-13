package annotationsimpl

import (
	"context"
	"time"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/annotations"
	"github.com/grafana/grafana/pkg/services/tag"
	"github.com/grafana/grafana/pkg/setting"
)

type lokiRepositoryImpl struct {
	cfg               *setting.Cfg
	log               log.Logger
	maximumTagsLength int64
	tagService        tag.Service
	httpLokiClient    *httpLokiClient
}

func (r *lokiRepositoryImpl) Add(ctx context.Context, item *annotations.Item) error {
	/*
		// if err := r.validateItem(item); err != nil {
		// 	return err
		// }
	*/
	item.Created = timeNow().UnixNano() / int64(time.Millisecond)
	item.Updated = item.Created
	if item.Epoch == 0 {
		item.Epoch = item.Created
	}

	tags := tag.ParseTagPairs(item.Tags)

	labels := map[string]string{
		"org_id":       strconv.Itoa(int(item.OrgID)),
		"alert_id":     strconv.Itoa(int(item.AlertID)),
		"dashboard_id": strconv.Itoa(int(item.DashboardID)),
		"panel_id":     strconv.Itoa(int(item.PanelID)),
		"user_id":      strconv.Itoa(int(item.UserID)),
		"type":         item.Type,
	}

	for _, t := range tags {
		labels[t.Key] = t.Value
	}

	blob, err := json.Marshal(item)
	if err != nil {
		// fix me: return errutil instead
		return fmt.Errorf("failed to marshal annotation: %w", err)
	}

	result := []stream{
		{
			Stream: labels,
			Values: []sample{
				{
					// fix me: use item.Epoch instead
					T: time.Now(),
					V: string(blob),
				},
			},
		},
	}
	spew.Dump("<<<<", result)

	return r.httpLokiClient.push(ctx, result)
}

func (r *lokiRepositoryImpl) AddMany(ctx context.Context, items []annotations.Item) error {
	return nil
}

func (r *lokiRepositoryImpl) Update(ctx context.Context, item *annotations.Item) error {
	return nil
}

func (r *lokiRepositoryImpl) Get(ctx context.Context, query *annotations.ItemQuery) ([]*annotations.ItemDTO, error) {
	items := make([]*annotations.ItemDTO, 0)
	return items, nil
}

func (r *lokiRepositoryImpl) Delete(ctx context.Context, params *annotations.DeleteParams) error {
	return nil
}

func (r *lokiRepositoryImpl) GetTags(ctx context.Context, query *annotations.TagsQuery) (annotations.FindTagsResult, error) {

	return annotations.FindTagsResult{}, nil
}

func (r *lokiRepositoryImpl) CleanAnnotations(ctx context.Context, cfg setting.AnnotationCleanupSettings, annotationType string) (int64, error) {
	var totalAffected int64

	return totalAffected, nil
}

func (r *lokiRepositoryImpl) CleanOrphanedAnnotationTags(ctx context.Context) (int64, error) {
	return 0, nil
}
