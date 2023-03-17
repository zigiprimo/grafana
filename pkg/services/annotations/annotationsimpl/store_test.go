package annotationsimpl

import (
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/components/simplejson"
	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/annotations"
	"github.com/grafana/grafana/pkg/services/dashboards"
	dashboardstore "github.com/grafana/grafana/pkg/services/dashboards/database"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/services/quota/quotatest"
	"github.com/grafana/grafana/pkg/services/tag/tagimpl"
	"github.com/grafana/grafana/pkg/services/user"
	"github.com/grafana/grafana/pkg/setting"
)

func testIntegrationAnnotations(t *testing.T, getStore func(db.DB, *setting.Cfg, int64) store) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	sql := db.InitTestDB(t)
	var maximumTagsLength int64 = 60
	repo := getStore(sql, sql.Cfg, maximumTagsLength)

	testUser := &user.SignedInUser{
		OrgID: 1,
		Permissions: map[int64]map[string][]string{
			1: {
				accesscontrol.ActionAnnotationsRead: []string{accesscontrol.ScopeAnnotationsAll},
				dashboards.ActionDashboardsRead:     []string{dashboards.ScopeDashboardsAll},
			},
		},
	}

	t.Run("Testing annotation create, read", func(t *testing.T) {
		t.Cleanup(func() {
			err := sql.WithDbSession(context.Background(), func(dbSession *db.Session) error {
				_, err := dbSession.Exec("DELETE FROM annotation WHERE 1=1")
				if err != nil {
					return err
				}
				_, err = dbSession.Exec("DELETE FROM annotation_tag WHERE 1=1")
				return err
			})
			assert.NoError(t, err)
		})

		quotaService := quotatest.New(false, nil)
		dashboardStore, err := dashboardstore.ProvideDashboardStore(sql, sql.Cfg, featuremgmt.WithFeatures(), tagimpl.ProvideService(sql, sql.Cfg), quotaService)
		require.NoError(t, err)

		testDashboard1 := dashboards.SaveDashboardCommand{
			UserID: 1,
			OrgID:  1,
			Dashboard: simplejson.NewFromAny(map[string]interface{}{
				"title": "Dashboard 1",
			}),
		}

		dashboard, err := dashboardStore.SaveDashboard(context.Background(), testDashboard1)
		require.NoError(t, err)

		testDashboard2 := dashboards.SaveDashboardCommand{
			UserID: 1,
			OrgID:  1,
			Dashboard: simplejson.NewFromAny(map[string]interface{}{
				"title": "Dashboard 2",
			}),
		}
		dashboard2, err := dashboardStore.SaveDashboard(context.Background(), testDashboard2)
		require.NoError(t, err)

		annotation := &annotations.Item{
			OrgID:       1,
			UserID:      1,
			DashboardID: dashboard.ID,
			Text:        "hello",
			Type:        "alert",
			Epoch:       10,
			Tags:        []string{"outage", "error", "type:outage", "server:server-1"},
			Data:        simplejson.NewFromAny(map[string]interface{}{"data1": "I am a cool data", "data2": "I am another cool data"}),
		}
		err = repo.Add(context.Background(), annotation)
		require.NoError(t, err)
		assert.Greater(t, annotation.ID, int64(0))
		assert.Equal(t, annotation.Epoch, annotation.EpochEnd)

		annotation2 := &annotations.Item{
			OrgID:       1,
			UserID:      1,
			DashboardID: dashboard2.ID,
			Text:        "hello",
			Type:        "alert",
			Epoch:       21, // Should swap epoch & epochEnd
			EpochEnd:    20,
			Tags:        []string{"outage", "type:outage", "server:server-1", "error"},
		}
		err = repo.Add(context.Background(), annotation2)
		require.NoError(t, err)
		assert.Greater(t, annotation2.ID, int64(0))
		assert.Equal(t, int64(20), annotation2.Epoch)
		assert.Equal(t, int64(21), annotation2.EpochEnd)

		organizationAnnotation1 := &annotations.Item{
			OrgID:  1,
			UserID: 1,
			Text:   "deploy",
			Type:   "",
			Epoch:  15,
			Tags:   []string{"deploy"},
		}
		err = repo.Add(context.Background(), organizationAnnotation1)
		require.NoError(t, err)
		assert.Greater(t, organizationAnnotation1.ID, int64(0))

		globalAnnotation2 := &annotations.Item{
			OrgID:  1,
			UserID: 1,
			Text:   "rollback",
			Type:   "",
			Epoch:  17,
			Tags:   []string{"rollback"},
		}
		err = repo.Add(context.Background(), globalAnnotation2)
		require.NoError(t, err)
		assert.Greater(t, globalAnnotation2.ID, int64(0))
		t.Run("Can query for annotation by dashboard id", func(t *testing.T) {
			items, err := repo.Get(context.Background(), &annotations.ItemQuery{
				OrgID:        1,
				DashboardID:  dashboard.ID,
				From:         0,
				To:           15,
				SignedInUser: testUser,
			})

			require.NoError(t, err)
			assert.Len(t, items, 1)

			assert.Equal(t, []string{"outage", "error", "type:outage", "server:server-1"}, items[0].Tags)

			assert.GreaterOrEqual(t, items[0].Created, int64(0))
			assert.GreaterOrEqual(t, items[0].Updated, int64(0))
			assert.Equal(t, items[0].Updated, items[0].Created)
		})

		badAnnotation := &annotations.Item{
			OrgID:  1,
			UserID: 1,
			Text:   "rollback",
			Type:   "",
			Epoch:  17,
			Tags:   []string{strings.Repeat("a", int(maximumTagsLength+1))},
		}
		err = repo.Add(context.Background(), badAnnotation)
		require.Error(t, err)
		require.ErrorIs(t, err, annotations.ErrBaseTagLimitExceeded)
	})
}
