package annotationsimpl

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/infra/log"
	ac "github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/annotations"
	"github.com/grafana/grafana/pkg/services/dashboards"
	"github.com/grafana/grafana/pkg/services/sqlstore/permissions"
	"github.com/grafana/grafana/pkg/services/sqlstore/searchstore"
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
		selectors, err = r.filterByAccessControl(ctx, selectors, query)
		if err != nil {
			return nil, err
		}
	}

	from := query.From * int64(time.Millisecond)
	to := query.To * int64(time.Millisecond)
	res, err := r.httpLokiClient.rangeQuery(ctx, selectors, from, to)
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

func (r *lokiRepositoryImpl) filterByAccessControl(ctx context.Context, selectors []selector, query *annotations.ItemQuery) ([]selector, error) {
	acFilter, acArgs, err := getACFilter(query.SignedInUser)
	if err != nil {
		return nil, err
	}

	dashboardIDs := make([]string, 0)
	err = r.db.WithDbSession(ctx, func(sess *db.Session) error {
		var sql bytes.Buffer
		sql.WriteString(fmt.Sprintf("SELECT id FROM dashboard WHERE org_id = %d AND (%s)", query.OrgID, acFilter))
		if err := sess.SQL(sql.String(), acArgs...).Find(&dashboardIDs); err != nil {
			dashboardIDs = nil
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	if len(dashboardIDs) > 0 {
		selectors = append(selectors, selector{
			label: "dashboard_id",
			op:    eqRegEx,
			value: fmt.Sprintf("(%s)", strings.Join(dashboardIDs, "|")),
		})
	}
	return selectors, err
}

// Almost exact copy of getAccessControlFilter except it replaces `a.dashboard_id` with `id`.
func getACFilter(user *user.SignedInUser) (string, []interface{}, error) {
	if user == nil || user.Permissions[user.OrgID] == nil {
		return "", nil, errors.New("missing permissions")
	}
	scopes, has := user.Permissions[user.OrgID][ac.ActionAnnotationsRead]
	if !has {
		return "", nil, errors.New("missing permissions")
	}
	types, hasWildcardScope := ac.ParseScopes(ac.ScopeAnnotationsProvider.GetResourceScopeType(""), scopes)
	if hasWildcardScope {
		types = map[interface{}]struct{}{annotations.Dashboard.String(): {}, annotations.Organization.String(): {}}
	}

	var filters []string
	var params []interface{}
	for t := range types {
		// annotation read permission with scope annotations:type:organization allows listing annotations that are not associated with a dashboard
		if t == annotations.Organization.String() {
			filters = append(filters, "id = 0")
		}
		// annotation read permission with scope annotations:type:dashboard allows listing annotations from dashboards which the user can view
		if t == annotations.Dashboard.String() {
			dashboardFilter, dashboardParams := permissions.NewAccessControlDashboardPermissionFilter(user, dashboards.PERMISSION_VIEW, searchstore.TypeDashboard).Where()

			filter := fmt.Sprintf("id IN(SELECT id FROM dashboard WHERE %s)", dashboardFilter)

			filters = append(filters, filter)
			params = dashboardParams
		}
	}
	return strings.Join(filters, " OR "), params, nil
}

func (r *lokiRepositoryImpl) Delete(ctx context.Context, params *annotations.DeleteParams) error {
	return nil
}

func (r *lokiRepositoryImpl) GetTags(ctx context.Context, query *annotations.TagsQuery) (annotations.FindTagsResult, error) {
	// var items []*annotations.Tag
	// if query.Limit == 0 {
	// 	query.Limit = 100
	// }

	// var sql bytes.Buffer
	// params := make([]interface{}, 0)
	// tagKey := `tag.` + r.db.GetDialect().Quote("key")
	// tagValue := `tag.` + r.db.GetDialect().Quote("value")

	// we need to get unique of the annotation of org_id, and make sure that annotation_tag.annotation_id is in the result, otherwise discard it.
	// 1. get all annotation id with org_id filter

	// sql.WriteString(`
	// SELECT
	// 	` + tagKey + `,
	// 	` + tagValue + `,
	// 	count(*) as count
	// FROM tag
	// INNER JOIN annotation_tag ON tag.id = annotation_tag.tag_id`)

	// sql.WriteString(`WHERE EXISTS(SELECT 1 FROM annotation WHERE annotation.id = annotation_tag.annotation_id AND annotation.org_id = ?)`)
	// params = append(params, query.OrgID)

	// sql.WriteString(` AND (` + tagKey + ` ` + r.db.GetDialect().LikeStr() + ` ? OR ` + tagValue + ` ` + r.db.GetDialect().LikeStr() + ` ?)`)
	// params = append(params, `%`+query.Tag+`%`, `%`+query.Tag+`%`)

	// sql.WriteString(` GROUP BY ` + tagKey + `,` + tagValue)
	// sql.WriteString(` ORDER BY ` + tagKey + `,` + tagValue)
	// sql.WriteString(` ` + r.db.GetDialect().Limit(query.Limit))

	// err := dbSession.SQL(sql.String(), params...).Find(&items)
	// return err

	// if err != nil {
	// 	return annotations.FindTagsResult{Tags: []*annotations.TagsDTO{}}, err
	// }
	// tags := make([]*annotations.TagsDTO, 0)
	// for _, item := range items {
	// 	tag := item.Key
	// 	if len(item.Value) > 0 {
	// 		tag = item.Key + ":" + item.Value
	// 	}
	// 	tags = append(tags, &annotations.TagsDTO{
	// 		Tag:   tag,
	// 		Count: item.Count,
	// 	})
	// }

	return annotations.FindTagsResult{}, nil

}

func (r *lokiRepositoryImpl) CleanAnnotations(ctx context.Context, cfg setting.AnnotationCleanupSettings, annotationType string) (int64, error) {
	var totalAffected int64

	return totalAffected, nil
}

func (r *lokiRepositoryImpl) CleanOrphanedAnnotationTags(ctx context.Context) (int64, error) {
	return 0, nil
}
