package annotationsimpl

import (
	"context"
<<<<<<< Updated upstream
	"encoding/json"
	"fmt"
	"strconv"
=======
	"fmt"
>>>>>>> Stashed changes
	"time"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/annotations"
	"github.com/grafana/grafana/pkg/services/tag"
	"github.com/grafana/grafana/pkg/setting"
	"k8s.io/utils/pointer"
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

	return r.httpLokiClient.push(ctx, result)
}

func (r *lokiRepositoryImpl) AddMany(ctx context.Context, items []annotations.Item) error {
	return nil
}

func (r *lokiRepositoryImpl) Update(ctx context.Context, item *annotations.Item) error {
	return nil
}

func (r *lokiRepositoryImpl) Get(ctx context.Context, query *annotations.ItemQuery) ([]*annotations.ItemDTO, error) {
	selectors := []selector{}
	res, err := r.httpLokiClient.rangeQuery(ctx, selectors, query.From, query.To)
	if err != nil {
		return nil, err
	}

	items := make([]*annotations.ItemDTO, 0)
<<<<<<< Updated upstream
	for _, stream := range res.Data.Result {
		for _, sample := range stream.Values {
			a := annotations.Item{}
			err := json.Unmarshal([]byte(sample.V), &a)
			if err != nil {
				r.log.Error("failed to unmarshal annotation item", "error", err, "value", sample.V)
				continue
			}

			items = append(items, &annotations.ItemDTO{
				AlertID:      a.AlertID,
				DashboardID:  a.DashboardID,
				AlertName:    "",
				DashboardUID: pointer.String(""),
				PanelID:      a.PanelID,
				UserID:       a.UserID,
				NewState:     a.NewState,
				PrevState:    a.PrevState,
				Created:      a.Created,
				Updated:      a.Updated,
				Text:         a.Text,
				Tags:         a.Tags,
				Login:        "",
				Email:        "",
				AvatarURL:    "",
				Data:         a.Data,
			})
		}
	}
=======
	res, err := r.httpLokiClient.rangeQuery(ctx, []Selector{{Label: "key", Op: Eq, Value: "val"}}, time.Now().Add(-time.Hour).UnixNano(), time.Now().UnixNano())
	if err != nil {
		return []*annotations.ItemDTO{}, err
	}
	fmt.Println(">>>>>>>>>>", res.Data.Result)
>>>>>>> Stashed changes
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
