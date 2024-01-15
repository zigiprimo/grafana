package datasource

import (
	"context"
	"fmt"
	"path/filepath"

	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/infra/kvstore"
	"github.com/grafana/grafana/pkg/infra/localcache"
	"github.com/grafana/grafana/pkg/infra/tracing"
	"github.com/grafana/grafana/pkg/infra/usagestats/service"
	"github.com/grafana/grafana/pkg/plugins"
	pluginscfg "github.com/grafana/grafana/pkg/plugins/config"
	"github.com/grafana/grafana/pkg/plugins/manager/loader"
	"github.com/grafana/grafana/pkg/plugins/manager/pipeline/bootstrap"
	"github.com/grafana/grafana/pkg/plugins/manager/pipeline/discovery"
	"github.com/grafana/grafana/pkg/plugins/manager/pipeline/initialization"
	"github.com/grafana/grafana/pkg/plugins/manager/pipeline/termination"
	"github.com/grafana/grafana/pkg/plugins/manager/pipeline/validation"
	"github.com/grafana/grafana/pkg/plugins/manager/registry"
	"github.com/grafana/grafana/pkg/plugins/manager/signature"
	"github.com/grafana/grafana/pkg/plugins/manager/sources"
	"github.com/grafana/grafana/pkg/services/accesscontrol/acimpl"
	"github.com/grafana/grafana/pkg/services/accesscontrol/ossaccesscontrol"
	"github.com/grafana/grafana/pkg/services/datasources/guardian"
	datasourceservice "github.com/grafana/grafana/pkg/services/datasources/service"
	"github.com/grafana/grafana/pkg/services/encryption/provider"
	encryptionservice "github.com/grafana/grafana/pkg/services/encryption/service"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/services/hooks"
	"github.com/grafana/grafana/pkg/services/kmsproviders/osskmsproviders"
	"github.com/grafana/grafana/pkg/services/licensing"
	"github.com/grafana/grafana/pkg/services/pluginsintegration/config"
	"github.com/grafana/grafana/pkg/services/pluginsintegration/pluginstore"
	"github.com/grafana/grafana/pkg/services/quota/quotaimpl"
	"github.com/grafana/grafana/pkg/services/secrets/database"
	secretskv "github.com/grafana/grafana/pkg/services/secrets/kvstore"
	"github.com/grafana/grafana/pkg/services/secrets/manager"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/grafana/grafana/pkg/services/sqlstore/migrations"
	"github.com/grafana/grafana/pkg/services/supportbundles/bundleregistry"
	"github.com/grafana/grafana/pkg/setting"
	testdatasource "github.com/grafana/grafana/pkg/tsdb/grafana-testdata-datasource"
)

const testDataPluginID = "grafana-testdata-datasource"

// NewStandaloneDatasource is a helper function to create a new datasource API server for a group
// This currently has no dependencies and only works for testdata.  In future iterations
// this will include here (or elsewhere) versions that can load config from HG api or
// the remote SQL directly
func NewStandaloneDatasource(group string) (*DataSourceAPIBuilder, error) {
	if group != "testdata.datasource.grafana.app" {
		return nil, fmt.Errorf("only testadata is currently supported")
	}

	cfg, err := setting.NewCfgFromArgs(setting.CommandLineArgs{
		// TODO: Add support for args?
	})
	if err != nil {
		return nil, err
	}

	tracingService, err := tracing.ProvideService(cfg)
	if err != nil {
		return nil, err
	}
	inProcBus := bus.ProvideBus(tracingService)
	sqlStore, err := sqlstore.ProvideService(cfg, migrations.ProvideOSSMigrations(), inProcBus, tracingService)
	if err != nil {
		return nil, err
	}
	routeRegisterImpl := routing.ProvideRegister()
	accessControl := acimpl.ProvideAccessControl(cfg)
	cacheService := localcache.ProvideService()
	featureManager, err := featuremgmt.ProvideManagerService(cfg, licensing.ProvideService(cfg, hooks.ProvideService()))
	if err != nil {
		return nil, err
	}
	featureToggles := featuremgmt.ProvideToggles(featureManager)
	ac, err := acimpl.ProvideService(cfg, sqlStore, routeRegisterImpl, cacheService, accessControl, featureToggles)
	if err != nil {
		return nil, err
	}
	usageStats, err := service.ProvideService(cfg, kvstore.ProvideService(sqlStore), routeRegisterImpl, tracingService, accessControl, ac, bundleregistry.ProvideService())
	if err != nil {
		return nil, err
	}
	encryptionService, err := encryptionservice.ProvideEncryptionService(provider.ProvideEncryptionProvider(), usageStats, cfg)
	if err != nil {
		return nil, err
	}
	kmsProvider := osskmsproviders.ProvideService(encryptionService, cfg, featureToggles)
	secretsService, err := manager.ProvideSecretsService(database.ProvideSecretsStore(sqlStore), kmsProvider, encryptionService, cfg, featureToggles, usageStats)
	if err != nil {
		return nil, err
	}
	pluginCfg, err := config.ProvideConfig(setting.ProvideProvider(cfg), cfg, featureToggles)
	if err != nil {
		return nil, err
	}
	pluginRegistry := registry.ProvideService()
	pluginLoader, err := createLoader(pluginCfg, pluginRegistry)
	if err != nil {
		return nil, err
	}
	pluginStore, err := pluginstore.ProvideService(pluginRegistry, newTestDataPluginSource(cfg), pluginLoader)
	if err != nil {
		return nil, err
	}
	secretsKVStore, err := secretskv.ProvideService(sqlStore, secretsService, pluginStore, kvstore.ProvideService(sqlStore), featureToggles, cfg)
	if err != nil {
		return nil, err
	}
	datasourcePermissions := ossaccesscontrol.ProvideDatasourcePermissionsService()
	quotaService := quotaimpl.ProvideService(sqlStore, cfg)
	datasourceService, err := datasourceservice.ProvideService(sqlStore, secretsService, secretsKVStore, cfg, featureToggles, accessControl, datasourcePermissions, quotaService, pluginStore)
	if err != nil {
		return nil, err
	}
	cacheServiceImpl := datasourceservice.ProvideCacheService(cacheService, sqlStore, guardian.ProvideGuardian())
	testdataPlugin, found := pluginStore.Plugin(context.Background(), testDataPluginID)
	if !found {
		return nil, fmt.Errorf("plugin %s not found", testDataPluginID)
	}

	return NewDataSourceAPIBuilder(
		testdataPlugin.JSONData,
		testdatasource.ProvideService(),
		datasourceService,
		cacheServiceImpl,
		accessControl,
	)
}

var _ sources.Registry = (*testDataPluginSource)(nil)

type testDataPluginSource struct {
	cfg *setting.Cfg
}

func newTestDataPluginSource(cfg *setting.Cfg) *testDataPluginSource {
	return &testDataPluginSource{
		cfg: cfg,
	}
}

func (t *testDataPluginSource) List(_ context.Context) []plugins.PluginSource {
	p := filepath.Join(t.cfg.StaticRootPath, "app/plugins/datasource", testDataPluginID)
	return []plugins.PluginSource{sources.NewLocalSource(plugins.ClassCore, []string{p})}
}

func createLoader(cfg *pluginscfg.Cfg, pr registry.Service) (loader.Service, error) {
	d := discovery.New(cfg, discovery.Opts{
		FindFilterFuncs: []discovery.FindFilterFunc{
			func(ctx context.Context, _ plugins.Class, b []*plugins.FoundBundle) ([]*plugins.FoundBundle, error) {
				return discovery.NewDuplicatePluginFilterStep(pr).Filter(ctx, b)
			},
		},
	})
	b := bootstrap.New(cfg, bootstrap.Opts{
		DecorateFuncs: []bootstrap.DecorateFunc{}, // no decoration required
	})
	v := validation.New(cfg, validation.Opts{
		ValidateFuncs: []validation.ValidateFunc{
			validation.SignatureValidationStep(signature.NewValidator(signature.NewUnsignedAuthorizer(cfg))),
		},
	})
	i := initialization.New(cfg, initialization.Opts{
		InitializeFuncs: []initialization.InitializeFunc{
			initialization.PluginRegistrationStep(pr),
		},
	})
	t, err := termination.New(cfg, termination.Opts{
		TerminateFuncs: []termination.TerminateFunc{
			termination.DeregisterStep(pr),
		},
	})
	if err != nil {
		return nil, err
	}

	return loader.New(d, b, v, i, t), nil
}
