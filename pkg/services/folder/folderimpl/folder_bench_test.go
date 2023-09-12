package folderimpl

import (
	"context"
	"fmt"
	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/components/simplejson"
	"github.com/grafana/grafana/pkg/infra/localcache"
	"github.com/grafana/grafana/pkg/infra/tracing"
	"github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/accesscontrol/acimpl"
	acdb "github.com/grafana/grafana/pkg/services/accesscontrol/database"
	"github.com/grafana/grafana/pkg/services/accesscontrol/ossaccesscontrol"
	"github.com/grafana/grafana/pkg/services/dashboards"
	"github.com/grafana/grafana/pkg/services/dashboards/database"
	dashboardservice "github.com/grafana/grafana/pkg/services/dashboards/service"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/services/folder"
	"github.com/grafana/grafana/pkg/services/guardian"
	"github.com/grafana/grafana/pkg/services/licensing/licensingtest"
	"github.com/grafana/grafana/pkg/services/org/orgimpl"
	"github.com/grafana/grafana/pkg/services/quota/quotatest"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/grafana/grafana/pkg/services/supportbundles/bundleregistry"
	"github.com/grafana/grafana/pkg/services/tag/tagimpl"
	"github.com/grafana/grafana/pkg/services/team"
	"github.com/grafana/grafana/pkg/services/team/teamimpl"
	"github.com/grafana/grafana/pkg/services/user"
	"github.com/grafana/grafana/pkg/services/user/userimpl"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"math/rand"
	"testing"
	"time"
)

const (
	LEVEL0_FOLDER_NUM = 300
	LEVEL1_FOLDER_NUM = 30
	LEVEL2_FOLDER_NUM = 5
	LEVEL3_FOLDER_NUM = 5

	TEAM_MEMBER_NUM = 1

	LEVEL0_FOLDER_PERMISSSIONS_NUM = 60
	LEVEL1_FOLDER_PERMISSSIONS_NUM = 10
	LEVEL2_FOLDER_PERMISSSIONS_NUM = 2

	MAXIMUM_INT_POSTGRES = 2147483647
)

var FOLDER_NUMS = []int{
	300,
	10,
	5,
	5,
	5,
	5,
}

type benchScenario struct {
	db *sqlstore.SQLStore
	// signedInUser is the user that is signed in to the server
	cfg          *setting.Cfg
	signedInUser *user.SignedInUser
	teamSvc      team.Service
	userSvc      user.Service
	folderSvc    folder.Service
}

func BenchmarkFolderListAndSearch(b *testing.B) {
	start := time.Now()
	b.Log("setup start")
	//sc := setupDB(b)
	sc := setupTestEnv(b)
	b.Log("setup time:", time.Since(start))

	benchmarks := []struct {
		desc        string
		expectedLen int
		features    *featuremgmt.FeatureManager
	}{
		{
			desc:        "get root folders with nested folders feature enabled",
			expectedLen: LEVEL0_FOLDER_NUM,
			//features:    featuremgmt.WithFeatures(featuremgmt.FlagNestedFolders, featuremgmt.FlagPermissionsFilterRemoveSubquery),
		},
	}
	for _, bm := range benchmarks {
		b.Run(bm.desc, func(b *testing.B) {
			b.ResetTimer()

			for i := 0; i < b.N; i++ {
				folders, err := sc.folderSvc.GetChildren(context.Background(), &folder.GetChildrenQuery{
					SignedInUser: sc.signedInUser,
					OrgID:        sc.signedInUser.OrgID,
					UID:          "",
				})
				require.NoError(b, err)
				assert.NotZero(b, len(folders))
				//assert.Len(b, folders, bm.expectedLen)
			}
		})
	}
}

func setupTestEnv(b testing.TB) benchScenario {
	b.Helper()

	sc := setupDB(b)

	license := licensingtest.NewFakeLicensing()
	license.On("FeatureEnabled", "accesscontrol.enforcement").Return(true).Maybe()

	features := featuremgmt.WithFeatures(featuremgmt.FlagNestedFolders, featuremgmt.FlagPermissionsFilterRemoveSubquery)

	quotaSrv := quotatest.New(false, nil)

	dashStore, err := database.ProvideDashboardStore(sc.db, sc.db.Cfg, features, tagimpl.ProvideService(sc.db, sc.db.Cfg), quotaSrv)
	require.NoError(b, err)

	folderStore := ProvideDashboardFolderStore(sc.db)

	ac := acimpl.ProvideAccessControl(sc.cfg)

	folderServiceWithFlagOn := ProvideService(ac, bus.ProvideBus(tracing.InitializeTracerForTest()), sc.cfg, dashStore, folderStore, sc.db, features)

	acSvc := acimpl.ProvideOSSService(sc.cfg, acdb.ProvideService(sc.db), localcache.ProvideService(), features)
	folderPermissions, err := ossaccesscontrol.ProvideFolderPermissions(
		features, routing.NewRouteRegister(), sc.db, ac, license, &dashboards.FakeDashboardStore{}, folderServiceWithFlagOn, acSvc, sc.teamSvc, sc.userSvc)
	require.NoError(b, err)
	dashboardPermissions, err := ossaccesscontrol.ProvideDashboardPermissions(
		features, routing.NewRouteRegister(), sc.db, ac, license, &dashboards.FakeDashboardStore{}, folderServiceWithFlagOn, acSvc, sc.teamSvc, sc.userSvc)
	require.NoError(b, err)

	dashboardSvc, err := dashboardservice.ProvideDashboardServiceImpl(
		sc.cfg, dashStore, folderStore, nil,
		features, folderPermissions, dashboardPermissions, ac,
		folderServiceWithFlagOn,
	)
	require.NoError(b, err)

	_ = guardian.ProvideService(sc.cfg, ac, dashboardSvc, sc.teamSvc)

	sc.folderSvc = folderServiceWithFlagOn
	return sc
}

func setupDB(b testing.TB) benchScenario {
	b.Helper()
	db := sqlstore.InitTestDB(b)
	IDs := map[int64]struct{}{}

	opts := sqlstore.NativeSettingsForDialect(db.GetDialect())
	opts.BatchSize = 1000

	quotaService := quotatest.New(false, nil)
	cfg := setting.NewCfg()

	teamSvc := teamimpl.ProvideService(db, cfg)
	orgService, err := orgimpl.ProvideService(db, cfg, quotaService)
	require.NoError(b, err)

	cache := localcache.ProvideService()
	userSvc, err := userimpl.ProvideService(db, orgService, cfg, teamSvc, cache, &quotatest.FakeQuotaService{}, bundleregistry.ProvideService())
	require.NoError(b, err)

	origNewGuardian := guardian.New
	//guardian.MockDashboardGuardian(&guardian.FakeDashboardGuardian{CanSaveValue: true, CanViewValue: true})

	b.Cleanup(func() {
		guardian.New = origNewGuardian
	})

	var orgID int64 = 1

	userIDs := make([]int64, 0, TEAM_MEMBER_NUM)
	for i := 0; i < TEAM_MEMBER_NUM; i++ {
		u, err := userSvc.Create(context.Background(), &user.CreateUserCommand{
			OrgID: orgID,
			Login: fmt.Sprintf("user%d", i),
		})
		require.NoError(b, err)
		require.NotZero(b, u.ID)
		userIDs = append(userIDs, u.ID)
	}

	signedInUser := user.SignedInUser{UserID: userIDs[0], OrgID: orgID, Permissions: map[int64]map[string][]string{
		orgID: {
			dashboards.ActionFoldersCreate: {},
			dashboards.ActionFoldersRead:   {},
		},
	}}

	foldersCap := LEVEL0_FOLDER_NUM + LEVEL0_FOLDER_NUM*LEVEL1_FOLDER_NUM + LEVEL0_FOLDER_NUM*LEVEL1_FOLDER_NUM*LEVEL2_FOLDER_NUM + LEVEL0_FOLDER_NUM*LEVEL1_FOLDER_NUM*LEVEL2_FOLDER_NUM*LEVEL2_FOLDER_NUM
	folders := make([]*f, 0, foldersCap)
	dashs := make([]*dashboards.Dashboard, 0, foldersCap)
	permissions := make([]accesscontrol.Permission, 0, foldersCap*2)

	b.Log("start generating folders")
	generateFolders(&folders, &dashs, &signedInUser, 0, FOLDER_NUMS[0], nil, IDs, len(FOLDER_NUMS)-1)
	b.Log(fmt.Sprintf("%d folders generated", len(folders)))

	err = db.WithDbSession(context.Background(), func(sess *sqlstore.DBSession) error {
		count, err := sess.BulkInsert("folder", folders, opts)
		require.NotZero(b, count)
		require.EqualValues(b, len(folders), count)
		require.NoError(b, err)

		count, err = sess.BulkInsert("dashboard", dashs, opts)
		require.NotZero(b, count)
		require.EqualValues(b, len(dashs), count)
		require.NoError(b, err)

		count, err = sess.BulkInsert("permission", permissions, opts)
		require.EqualValues(b, len(permissions), count)
		require.NoError(b, err)

		return err
	})
	require.NoError(b, err)

	return benchScenario{
		db:           db,
		cfg:          cfg,
		signedInUser: &signedInUser,
		teamSvc:      teamSvc,
		userSvc:      userSvc,
	}
}

func generateFolders(folders *[]*f, dashs *[]*dashboards.Dashboard, signedInUser *user.SignedInUser, level int, foldersNum int, parent *f, IDs map[int64]struct{}, maxLevel int) {
	for i := 0; i < foldersNum; i++ {
		folderId := generateID(IDs)
		var parentUID *string = nil
		parentPath := ""
		if parent != nil {
			parentUID = &parent.UID
			parentPath = parent.Path
		}
		folderUid := fmt.Sprintf("folder-%d-%d", level, folderId)
		folder, dash := addFolder(orgID, folderId, folderUid, parentUID, parentPath)
		*folders = append(*folders, folder)
		*dashs = append(*dashs, dash)

		if level == 0 && i < 10 {
			readPermission := signedInUser.Permissions[orgID][dashboards.ActionFoldersRead]
			signedInUser.Permissions[orgID][dashboards.ActionFoldersRead] = append(readPermission, dashboards.ScopeFoldersPrefix+folderUid)
		} else if rand.Float32() < 0.001 {
			readPermission := signedInUser.Permissions[orgID][dashboards.ActionFoldersRead]
			signedInUser.Permissions[orgID][dashboards.ActionFoldersRead] = append(readPermission, dashboards.ScopeFoldersPrefix+folderUid)
		}

		if level < maxLevel-1 {
			generateFolders(folders, dashs, signedInUser, level+1, FOLDER_NUMS[level+1], folder, IDs, maxLevel)
		}
	}
}

type f struct {
	ID          int64   `xorm:"pk autoincr 'id'"`
	OrgID       int64   `xorm:"org_id"`
	UID         string  `xorm:"uid"`
	ParentUID   *string `xorm:"parent_uid"`
	Path        string
	Title       string
	Description string

	Created time.Time
	Updated time.Time
}

func (f *f) TableName() string {
	return "folder"
}

// SQL bean helper to save tags
type dashboardTag struct {
	Id          int64
	DashboardId int64
	Term        string
}

func addFolder(orgID int64, id int64, uid string, parentUID *string, parentPath string) (*f, *dashboards.Dashboard) {
	now := time.Now()
	title := uid
	f := &f{
		OrgID:     orgID,
		UID:       uid,
		Title:     title,
		ID:        id,
		Created:   now,
		Updated:   now,
		ParentUID: parentUID,
		Path:      parentPath + "/" + uid,
	}

	d := &dashboards.Dashboard{
		ID:       id,
		OrgID:    orgID,
		UID:      uid,
		Version:  1,
		Title:    title,
		Data:     simplejson.NewFromAny(map[string]any{"schemaVersion": 17, "title": title, "uid": uid, "version": 1}),
		IsFolder: true,
		Created:  now,
		Updated:  now,
	}
	return f, d
}

func generateID(reserved map[int64]struct{}) int64 {
	n := rand.Int63n(MAXIMUM_INT_POSTGRES)
	if _, existing := reserved[n]; existing {
		return generateID(reserved)
	}
	reserved[n] = struct{}{}
	return n
}
