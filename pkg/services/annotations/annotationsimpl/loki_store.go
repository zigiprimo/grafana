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
	acFilter, acArgs, err := getAccessControlFilterAlternate(query.SignedInUser)
	if err != nil {
		return nil, err
	}

	dashboardIDs := make([]string, 0)
	err = r.db.WithDbSession(ctx, func(sess *db.Session) error {
		var sql bytes.Buffer
		// #TODO any checks to do for OrgID before?
		sql.WriteString(fmt.Sprintf("SELECT id FROM dashboard WHERE org_id = %d AND (%s)", query.OrgID, acFilter))
		if err := sess.SQL(sql.String(), acArgs...).Find(&dashboardIDs); err != nil {
			dashboardIDs = nil
			return err
		}
		// #TODO: as a first step make a database call to find all dashboards for which the user has permissions
		// use this to add the appropriate selectors
		// next step would be to pass dashboard_uid as a label in the call to Add() and then use that when filtering
		// EDIT about passing dashboard_uid: considering user.Permissions aren't to be relied on, we still need to
		// query the permissions table either way so we might as well continuing querying the dashboards table. Passing the
		// dashboard_uid label is no longer required for filtering purposes.
		return nil
	})
	if err != nil {
		return nil, err
	}

	// #TODO: if we want to skip the use of regex here, we could filter loki results instead of
	// the selectors we send to loki. The advantage of filtering selectors is that we can check
	// some permissions before ever querying loki (for example user having permissions for the org)
	// and we don't have to do permission checks in two places.
	// However I imagine the list of IDs we include in the regex could get quite long. That's a potential issue.
	// #TODO: does it work/make sense to have two selectors for dashboard_id? one with eq operator and the other with eqRegEx?
	if len(dashboardIDs) > 0 {
		selectors = append(selectors, selector{
			label: "dashboard_id",
			op:    eqRegEx,
			value: fmt.Sprintf("(%s)", strings.Join(dashboardIDs, "|")),
		})
	}
	return selectors, err
}

// #TODO: fix naming. This is an almost exact copy of the one in xorm_store.go but some parts of the query string have
// been modified to remove references to the larger query string we aren't using.
func getAccessControlFilterAlternate(user *user.SignedInUser) (string, []interface{}, error) {
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

	return annotations.FindTagsResult{}, nil
}

func (r *lokiRepositoryImpl) CleanAnnotations(ctx context.Context, cfg setting.AnnotationCleanupSettings, annotationType string) (int64, error) {
	var totalAffected int64

	return totalAffected, nil
}

func (r *lokiRepositoryImpl) CleanOrphanedAnnotationTags(ctx context.Context) (int64, error) {
	return 0, nil
}
