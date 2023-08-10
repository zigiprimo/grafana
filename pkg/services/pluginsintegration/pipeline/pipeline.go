package pipeline

import (
	"context"

	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/config"
	"github.com/grafana/grafana/pkg/plugins/envvars"
	"github.com/grafana/grafana/pkg/plugins/manager/loader/angular/angularinspector"
	"github.com/grafana/grafana/pkg/plugins/manager/loader/assetpath"
	"github.com/grafana/grafana/pkg/plugins/manager/loader/finder"
	"github.com/grafana/grafana/pkg/plugins/manager/pipeline/bootstrap"
	"github.com/grafana/grafana/pkg/plugins/manager/pipeline/discovery"
	"github.com/grafana/grafana/pkg/plugins/manager/pipeline/initialization"
	"github.com/grafana/grafana/pkg/plugins/manager/pipeline/termination"
	"github.com/grafana/grafana/pkg/plugins/manager/pipeline/validation"
	"github.com/grafana/grafana/pkg/plugins/manager/process"
	"github.com/grafana/grafana/pkg/plugins/manager/registry"
	"github.com/grafana/grafana/pkg/plugins/manager/signature"
	"github.com/grafana/grafana/pkg/plugins/oauth"
	"github.com/grafana/grafana/pkg/plugins/state"
	"github.com/grafana/grafana/pkg/services/pluginsintegration/pluginerrs"
)

func ProvideDiscoveryStage(cfg *config.Cfg, pf finder.Finder, pr registry.Service,
	stateManager state.Manager) *discovery.Discovery {
	return discovery.New(cfg, discovery.Opts{
		FindFunc: func(ctx context.Context, src plugins.PluginSource) ([]*plugins.FoundBundle, error) {
			return pf.Find(ctx, src)
		},
		FindFilterFuncs: []discovery.FindFilterFunc{
			func(ctx context.Context, _ plugins.Class, b []*plugins.FoundBundle) ([]*plugins.FoundBundle, error) {
				return discovery.NewDuplicatePluginFilterStep(pr).Filter(ctx, b)
			},
		},
		OnSuccessFunc: func(ctx context.Context, class plugins.Class, bundles []*plugins.FoundBundle) {
			for _, b := range bundles {
				stateManager.SetPluginState(state.PluginInfo{
					PluginID: b.Primary.JSONData.ID,
					Version:  b.Primary.JSONData.Info.Version,
				}, state.StatusDiscovered)

				for _, child := range b.Children {
					stateManager.SetPluginState(state.PluginInfo{
						PluginID: child.JSONData.ID,
						Version:  child.JSONData.Info.Version,
					}, state.StatusDiscovered)
				}
			}
		},
		OnErrorFunc: func(ctx context.Context, class plugins.Class, bundles []*plugins.FoundBundle, err error) {
			for _, b := range bundles {
				stateManager.SetPluginState(state.PluginInfo{
					PluginID: b.Primary.JSONData.ID,
					Version:  b.Primary.JSONData.Info.Version,
				}, state.StatusError)

				for _, child := range b.Children {
					stateManager.SetPluginState(state.PluginInfo{
						PluginID: child.JSONData.ID,
						Version:  child.JSONData.Info.Version,
					}, state.StatusError)
				}
			}
		},
	})
}

func ProvideBootstrapStage(cfg *config.Cfg, sc plugins.SignatureCalculator, a *assetpath.Service,
	stateManager state.Manager) *bootstrap.Bootstrap {
	return bootstrap.New(cfg, bootstrap.Opts{
		ConstructFunc: bootstrap.DefaultConstructFunc(sc, a),
		DecorateFuncs: bootstrap.DefaultDecorateFuncs,
		OnSuccessFunc: func(ctx context.Context, ps []*plugins.Plugin) {
			for _, p := range ps {
				stateManager.SetPluginState(state.PluginInfo{
					PluginID: p.ID,
					Version:  p.Info.Version,
				}, state.StatusBootstrapped)
			}
		},
		OnErrorFunc: func(ctx context.Context, bundles []*plugins.FoundBundle, err error) {
			for _, b := range bundles {
				stateManager.SetPluginState(state.PluginInfo{
					PluginID: b.Primary.JSONData.ID,
					Version:  b.Primary.JSONData.Info.Version,
				}, state.StatusError)

				for _, child := range b.Children {
					stateManager.SetPluginState(state.PluginInfo{
						PluginID: child.JSONData.ID,
						Version:  child.JSONData.Info.Version,
					}, state.StatusError)
				}

			}
		},
	})
}

func ProvideValidationStage(cfg *config.Cfg, sv signature.Validator, ai angularinspector.Inspector,
	et pluginerrs.SignatureErrorTracker, stateManager state.Manager) *validation.Validate {
	return validation.New(cfg, validation.Opts{
		ValidateFuncs: []validation.ValidateFunc{
			SignatureValidationStep(sv, et),
			validation.ModuleJSValidationStep(),
			validation.AngularDetectionStep(cfg, ai),
		},
		OnSuccessFunc: func(ctx context.Context, ps []*plugins.Plugin) {
			for _, p := range ps {
				stateManager.SetPluginState(state.PluginInfo{
					PluginID: p.ID,
					Version:  p.Info.Version,
				}, state.StatusValidated)
			}
		},
		OnErrorFunc: func(ctx context.Context, p *plugins.Plugin, err error) {
			stateManager.SetPluginState(state.PluginInfo{
				PluginID: p.ID,
				Version:  p.Info.Version,
			}, state.StatusError)
		},
	})
}

func ProvideInitializationStage(cfg *config.Cfg, pr registry.Service, l plugins.Licensing,
	bp plugins.BackendFactoryProvider, pm process.Service, externalServiceRegistry oauth.ExternalServiceRegistry,
	roleRegistry plugins.RoleRegistry, stateManager state.Manager) *initialization.Initialize {
	return initialization.New(cfg, initialization.Opts{
		InitializeFuncs: []initialization.InitializeFunc{
			initialization.BackendClientInitStep(envvars.NewProvider(cfg, l), bp),
			initialization.PluginRegistrationStep(pr),
			initialization.BackendProcessStartStep(pm),
			ExternalServiceRegistrationStep(cfg, externalServiceRegistry),
			RegisterPluginRolesStep(roleRegistry),
			ReportBuildMetrics,
		},
		OnSuccessFunc: func(ctx context.Context, ps []*plugins.Plugin) {
			for _, p := range ps {
				stateManager.SetPluginState(state.PluginInfo{
					PluginID: p.ID,
					Version:  p.Info.Version,
				}, state.StatusInitialized)
			}
		},
		OnErrorFunc: func(ctx context.Context, p *plugins.Plugin, err error) {
			stateManager.SetPluginState(state.PluginInfo{
				PluginID: p.ID,
				Version:  p.Info.Version,
			}, state.StatusError)
		},
	})
}

func ProvideTerminationStage(cfg *config.Cfg, pr registry.Service, pm process.Service,
	stateManager state.Manager) (*termination.Terminate, error) {
	return termination.New(cfg, termination.Opts{
		ResolveFunc: termination.TerminablePluginResolverStep(pr),
		TerminateFuncs: []termination.TerminateFunc{
			termination.BackendProcessTerminatorStep(pm),
			termination.DeregisterStep(pr),
			termination.FSRemoval,
		},
		OnSuccessFunc: func(ctx context.Context, p *plugins.Plugin) {
			stateManager.SetPluginState(state.PluginInfo{
				PluginID: p.ID,
				Version:  p.Info.Version,
			}, state.StatusUninstalled)
		},
		OnErrorFunc: func(ctx context.Context, pluginID, version string, err error) {
			stateManager.SetPluginState(state.PluginInfo{
				PluginID: pluginID,
				Version:  version,
			}, state.StatusError)
		},
	})
}
