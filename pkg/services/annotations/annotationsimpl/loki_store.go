package annotationsimpl

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/infra/log"
	ac "github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/annotations"
	"github.com/grafana/grafana/pkg/services/tag"
	"github.com/grafana/grafana/pkg/services/user"
	"github.com/grafana/grafana/pkg/setting"
	"k8s.io/utils/pointer"
)

type lokiRepositoryImpl struct {
	cfg               *setting.Cfg
	log               log.Logger
	maximumTagsLength int64
	tagService        tag.Service
	httpLokiClient    *httpLokiClient
	db                db.DB
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
					T: time.Unix(0, item.Epoch*int64(time.Millisecond)),
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
	// res, err := r.httpLokiClient.rangeQuery(ctx, []Selector{{Label: "key", Op: Eq, Value: "val"}}, time.Now().Add(-time.Hour).UnixNano(), time.Now().UnixNano())

	selectors, err := buildSelectors(query)
	if err != nil {
		return nil, fmt.Errorf("failed to build the provided selectors: %w", err)
	}

	if !ac.IsDisabled(r.cfg) {
		selectors, err = filterByAccessControl(selectors, query.SignedInUser)
		if err != nil {
			return nil, err
		}
	}

	res, err := r.httpLokiClient.rangeQuery(ctx, selectors, query.From, query.To)
	if err != nil {
		return nil, err
	}

	items := make([]*annotations.ItemDTO, 0)
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
	return items, nil
}

func filterByAccessControl(selectors []selector, user *user.SignedInUser) ([]selector, error) {
	if user == nil || user.Permissions[user.OrgID] == nil {
		return nil, errors.New("missing permissions")
	}
	scopes, has := user.Permissions[user.OrgID][ac.ActionAnnotationsRead]
	if !has {
		return nil, errors.New("missing permissions")
	}
	types, hasWildcardScope := ac.ParseScopes(ac.ScopeAnnotationsProvider.GetResourceScopeType(""), scopes)
	if hasWildcardScope {
		types = map[interface{}]struct{}{annotations.Dashboard.String(): {}, annotations.Organization.String(): {}}
	}

	for t := range types {
		// annotation read permission with scope annotations:type:organization allows listing annotations that are not associated with a dashboard
		if t == annotations.Organization.String() {
			// TODO: improve the creation of the new selector here (using labels, newSelector etc)
			selectors = append(selectors, selector{label: "dashboard_id", op: eq, value: "0"})
		}
		// annotation read permission with scope annotations:type:dashboard allows listing annotations from dashboards which the user can view
		if t == annotations.Dashboard.String() {
			// TODO: as a first step make a database call to find all dashboards for which the user has permissions
			// use this to add the appropriate selectors
			// next step would be to pass dashboard_uid as a label in the call to Add() and then use that when filtering
		}
	}
	return selectors, nil
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
