package loader

import (
	"context"
	"errors"
	"fmt"
	"path"
	"strings"
	"time"

	"github.com/grafana/grafana/pkg/infra/metrics"
	"github.com/grafana/grafana/pkg/infra/slugify"
	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/config"
	"github.com/grafana/grafana/pkg/plugins/log"
	"github.com/grafana/grafana/pkg/plugins/manager/loader/angular/angularinspector"
	"github.com/grafana/grafana/pkg/plugins/manager/loader/assetpath"
	"github.com/grafana/grafana/pkg/plugins/manager/loader/finder"
	"github.com/grafana/grafana/pkg/plugins/manager/loader/initializer"
	"github.com/grafana/grafana/pkg/plugins/manager/pipeline/stages/discovery"
	"github.com/grafana/grafana/pkg/plugins/manager/process"
	"github.com/grafana/grafana/pkg/plugins/manager/registry"
	"github.com/grafana/grafana/pkg/plugins/manager/signature"
	"github.com/grafana/grafana/pkg/plugins/oauth"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/util"
)

var _ plugins.ErrorResolver = (*Loader)(nil)

type Loader struct {
	discovery discovery.Discoverer

	processManager          process.Service
	pluginRegistry          registry.Service
	roleRegistry            plugins.RoleRegistry
	pluginInitializer       initializer.Initializer
	signatureValidator      signature.Validator
	externalServiceRegistry oauth.ExternalServiceRegistry
	assetPath               *assetpath.Service
	log                     log.Logger
	cfg                     *config.Cfg

	angularInspector angularinspector.Inspector

	errs map[string]*plugins.SignatureError
}

func ProvideService(cfg *config.Cfg, license plugins.Licensing, authorizer plugins.PluginLoaderAuthorizer,
	pluginRegistry registry.Service, backendProvider plugins.BackendFactoryProvider, pluginFinder finder.Finder,
	roleRegistry plugins.RoleRegistry, assetPath *assetpath.Service, signatureCalculator plugins.SignatureCalculator,
	angularInspector angularinspector.Inspector, externalServiceRegistry oauth.ExternalServiceRegistry) *Loader {
	return New(cfg, license, authorizer, pluginRegistry, backendProvider, process.NewManager(pluginRegistry),
		roleRegistry, assetPath, angularInspector, externalServiceRegistry,
		discovery.NewDiscoveryStage(pluginFinder, pluginRegistry, signatureCalculator, assetPath))
}

func New(cfg *config.Cfg, license plugins.Licensing, authorizer plugins.PluginLoaderAuthorizer,
	pluginRegistry registry.Service, backendProvider plugins.BackendFactoryProvider,
	processManager process.Service, roleRegistry plugins.RoleRegistry, assetPath *assetpath.Service,
	angularInspector angularinspector.Inspector, externalServiceRegistry oauth.ExternalServiceRegistry,
	discovery discovery.Discoverer) *Loader {
	return &Loader{
		pluginRegistry:          pluginRegistry,
		pluginInitializer:       initializer.New(cfg, backendProvider, license),
		signatureValidator:      signature.NewValidator(authorizer),
		processManager:          processManager,
		errs:                    make(map[string]*plugins.SignatureError),
		log:                     log.New("plugin.loader"),
		roleRegistry:            roleRegistry,
		cfg:                     cfg,
		assetPath:               assetPath,
		angularInspector:        angularInspector,
		externalServiceRegistry: externalServiceRegistry,
		discovery:               discovery,
	}
}

// nolint:gocyclo
func (l *Loader) Load(ctx context.Context, src plugins.PluginSource) ([]*plugins.Plugin, error) {
	// <DISCOVERY STAGE>
	discoveredPlugins, err := l.discovery.Discover(ctx, src)
	if err != nil {
		return nil, err
	}
	// </DISCOVERY STAGE>

	// <VERIFICATION STAGE>
	verifiedPlugins := make([]*plugins.Plugin, 0, len(discoveredPlugins))
	for _, plugin := range discoveredPlugins {
		signingError := l.signatureValidator.Validate(plugin)
		if signingError != nil {
			l.log.Warn("Skipping loading plugin due to problem with signature",
				"pluginID", plugin.ID, "status", signingError.SignatureStatus)
			plugin.SignatureError = signingError
			l.errs[plugin.ID] = signingError
			// skip plugin so it will not be loaded any further
			continue
		}

		// clear plugin error if a pre-existing error has since been resolved
		delete(l.errs, plugin.ID)

		// verify module.js exists for SystemJS to load.
		// CDN plugins can be loaded with plugin.json only, so do not warn for those.
		if !plugin.IsRenderer() && !plugin.IsCorePlugin() {
			f, err := plugin.FS.Open("module.js")
			if err != nil {
				if errors.Is(err, plugins.ErrFileNotExist) {
					l.log.Warn("Plugin missing module.js", "pluginID", plugin.ID,
						"warning", "Missing module.js, If you loaded this plugin from git, make sure to compile it.")
				}
			} else if f != nil {
				if err := f.Close(); err != nil {
					l.log.Warn("Could not close module.js", "pluginID", plugin.ID, "err", err)
				}
			}
		}

		// detect angular for external plugins
		if plugin.IsExternalPlugin() {
			cctx, canc := context.WithTimeout(ctx, time.Minute*1)
			plugin.AngularDetected, err = l.angularInspector.Inspect(cctx, plugin)
			canc()

			if err != nil {
				l.log.Warn("could not inspect plugin for angular", "pluginID", plugin.ID, "err", err)
			}

			// Do not initialize plugins if they're using Angular and Angular support is disabled
			if plugin.AngularDetected && !l.cfg.AngularSupportEnabled {
				l.log.Error("Refusing to initialize plugin because it's using Angular, which has been disabled", "pluginID", plugin.ID)
				continue
			}
		}

		verifiedPlugins = append(verifiedPlugins, plugin)
	}
	// </VERIFICATION STAGE>

	// <ENRICHMENT STAGE>
	for _, plugin := range verifiedPlugins {
		if err = l.setImages(plugin); err != nil {
			return nil, err
		}

		// Hardcoded alias changes
		switch plugin.ID {
		case "grafana-pyroscope-datasource": // rebranding
			plugin.Alias = "phlare"
		case "debug": // panel plugin used for testing
			plugin.Alias = "debugX"
		}

		if plugin.IsApp() {
			setDefaultNavURL(plugin)
		}

		if plugin.Parent != nil && plugin.Parent.IsApp() {
			configureAppChildPlugin(plugin.Parent, plugin)
		}
	}
	// </ENRICHMENT STAGE>

	// <INITIALIZATION STAGE>
	initializedPlugins := make([]*plugins.Plugin, 0, len(verifiedPlugins))
	for _, p := range verifiedPlugins {
		err = l.pluginInitializer.Initialize(ctx, p)
		if err != nil {
			l.log.Error("Could not initialize plugin", "pluginId", p.ID, "err", err)
			continue
		}

		if err = l.pluginRegistry.Add(ctx, p); err != nil {
			l.log.Error("Could not start plugin", "pluginId", p.ID, "err", err)
			continue
		}

		if !p.IsCorePlugin() {
			l.log.Info("Plugin registered", "pluginID", p.ID)
		}

		initializedPlugins = append(initializedPlugins, p)
	}

	// <POST-INITIALIZATION STAGE>
	for _, p := range initializedPlugins {
		if err = l.processManager.Start(ctx, p.ID); err != nil {
			l.log.Error("Could not start plugin", "pluginId", p.ID, "err", err)
			continue
		}

		if p.ExternalServiceRegistration != nil && l.cfg.Features.IsEnabled(featuremgmt.FlagExternalServiceAuth) {
			s, err := l.externalServiceRegistry.RegisterExternalService(ctx, p.ID, p.ExternalServiceRegistration)
			if err != nil {
				l.log.Error("Could not register an external service. Initialization skipped", "pluginID", p.ID, "err", err)
				continue
			}
			p.ExternalService = s
		}

		if err = l.roleRegistry.DeclarePluginRoles(ctx, p.ID, p.Name, p.Roles); err != nil {
			l.log.Warn("Declare plugin roles failed.", "pluginID", p.ID, "err", err)
		}

		if !p.IsCorePlugin() && !p.IsBundledPlugin() {
			metrics.SetPluginBuildInformation(p.ID, string(p.Type), p.Info.Version, string(p.Signature))
		}
	}
	// </POST-INITIALIZATION STAGE>

	return initializedPlugins, nil
}

func (l *Loader) Unload(ctx context.Context, pluginID string) error {
	plugin, exists := l.pluginRegistry.Plugin(ctx, pluginID)
	if !exists {
		return plugins.ErrPluginNotInstalled
	}

	if plugin.IsCorePlugin() || plugin.IsBundledPlugin() {
		return plugins.ErrUninstallCorePlugin
	}

	if err := l.unload(ctx, plugin); err != nil {
		return err
	}
	return nil
}

func (l *Loader) load(ctx context.Context, p *plugins.Plugin) error {
	if err := l.pluginRegistry.Add(ctx, p); err != nil {
		return err
	}

	if !p.IsCorePlugin() {
		l.log.Info("Plugin registered", "pluginID", p.ID)
	}

	return l.processManager.Start(ctx, p.ID)
}

func (l *Loader) unload(ctx context.Context, p *plugins.Plugin) error {
	l.log.Debug("Stopping plugin process", "pluginId", p.ID)

	if err := l.processManager.Stop(ctx, p.ID); err != nil {
		return err
	}

	if err := l.pluginRegistry.Remove(ctx, p.ID); err != nil {
		return err
	}
	l.log.Debug("Plugin unregistered", "pluginId", p.ID)

	if remover, ok := p.FS.(plugins.FSRemover); ok {
		if err := remover.Remove(); err != nil {
			return err
		}
	}

	return nil
}

func (l *Loader) createPluginBase(pluginJSON plugins.JSONData, class plugins.Class, files plugins.FS,
	sig plugins.Signature) (*plugins.Plugin, error) {
	baseURL, err := l.assetPath.Base(pluginJSON, class, files.Base())
	if err != nil {
		return nil, fmt.Errorf("base url: %w", err)
	}
	moduleURL, err := l.assetPath.Module(pluginJSON, class, files.Base())
	if err != nil {
		return nil, fmt.Errorf("module url: %w", err)
	}
	plugin := &plugins.Plugin{
		JSONData:      pluginJSON,
		FS:            files,
		BaseURL:       baseURL,
		Module:        moduleURL,
		Class:         class,
		Signature:     sig.Status,
		SignatureType: sig.Type,
		SignatureOrg:  sig.SigningOrg,
	}

	plugin.SetLogger(log.New(fmt.Sprintf("plugin.%s", plugin.ID)))

	return plugin, nil
}

func (l *Loader) setImages(p *plugins.Plugin) error {
	var err error
	for _, dst := range []*string{&p.Info.Logos.Small, &p.Info.Logos.Large} {
		*dst, err = l.assetPath.RelativeURL(p, *dst, defaultLogoPath(p.Type))
		if err != nil {
			return fmt.Errorf("logo: %w", err)
		}
	}
	for i := 0; i < len(p.Info.Screenshots); i++ {
		screenshot := &p.Info.Screenshots[i]
		screenshot.Path, err = l.assetPath.RelativeURL(p, screenshot.Path, "")
		if err != nil {
			return fmt.Errorf("screenshot %d relative url: %w", i, err)
		}
	}
	return nil
}

func setDefaultNavURL(p *plugins.Plugin) {
	// slugify pages
	for _, include := range p.Includes {
		if include.Slug == "" {
			include.Slug = slugify.Slugify(include.Name)
		}

		if !include.DefaultNav {
			continue
		}

		if include.Type == "page" {
			p.DefaultNavURL = path.Join("/plugins/", p.ID, "/page/", include.Slug)
		}
		if include.Type == "dashboard" {
			dboardURL := include.DashboardURLPath()
			if dboardURL == "" {
				p.Logger().Warn("Included dashboard is missing a UID field")
				continue
			}

			p.DefaultNavURL = dboardURL
		}
	}
}

func configureAppChildPlugin(parent *plugins.Plugin, child *plugins.Plugin) {
	if !parent.IsApp() {
		return
	}
	appSubPath := strings.ReplaceAll(strings.Replace(child.FS.Base(), parent.FS.Base(), "", 1), "\\", "/")
	child.IncludedInAppID = parent.ID
	child.BaseURL = parent.BaseURL

	if parent.IsCorePlugin() {
		child.Module = util.JoinURLFragments("app/plugins/app/"+parent.ID, appSubPath) + "/module"
	} else {
		child.Module = util.JoinURLFragments("plugins/"+parent.ID, appSubPath) + "/module"
	}
}

func defaultLogoPath(pluginType plugins.Type) string {
	return "public/img/icn-" + string(pluginType) + ".svg"
}

func (l *Loader) PluginErrors() []*plugins.Error {
	errs := make([]*plugins.Error, 0, len(l.errs))
	for _, err := range l.errs {
		errs = append(errs, &plugins.Error{
			PluginID:  err.PluginID,
			ErrorCode: err.AsErrorCode(),
		})
	}

	return errs
}
