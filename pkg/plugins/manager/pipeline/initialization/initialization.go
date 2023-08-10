package initialization

import (
	"context"

	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/config"
	"github.com/grafana/grafana/pkg/plugins/log"
)

// Initializer is responsible for the Initialization stage of the plugin loader pipeline.
type Initializer interface {
	Initialize(ctx context.Context, ps []*plugins.Plugin) ([]*plugins.Plugin, error)
}

// InitializeFunc is the function used for the Initialize step of the Initialization stage.
type InitializeFunc func(ctx context.Context, p *plugins.Plugin) (*plugins.Plugin, error)

type OnSuccessFunc func(ctx context.Context, ps []*plugins.Plugin)

type OnErrorFunc func(ctx context.Context, p *plugins.Plugin, err error)

type Initialize struct {
	cfg             *config.Cfg
	initializeSteps []InitializeFunc

	onSuccessFunc OnSuccessFunc
	onErrorFunc   OnErrorFunc

	log log.Logger
}

type Opts struct {
	InitializeFuncs []InitializeFunc

	OnSuccessFunc OnSuccessFunc
	OnErrorFunc   OnErrorFunc
}

// New returns a new Initialization stage.
func New(cfg *config.Cfg, opts Opts) *Initialize {
	if opts.InitializeFuncs == nil {
		opts.InitializeFuncs = []InitializeFunc{}
	}

	if opts.OnSuccessFunc == nil {
		opts.OnSuccessFunc = func(ctx context.Context, p []*plugins.Plugin) {}
	}

	if opts.OnErrorFunc == nil {
		opts.OnErrorFunc = func(ctx context.Context, p *plugins.Plugin, err error) {}
	}

	return &Initialize{
		cfg:             cfg,
		initializeSteps: opts.InitializeFuncs,
		onSuccessFunc:   opts.OnSuccessFunc,
		onErrorFunc:     opts.OnErrorFunc,
		log:             log.New("plugins.initialization"),
	}
}

// Initialize will execute the Initialize steps of the Initialization stage.
func (i *Initialize) Initialize(ctx context.Context, ps []*plugins.Plugin) ([]*plugins.Plugin, error) {
	if len(i.initializeSteps) == 0 {
		return ps, nil
	}

	var err error
	initializedPlugins := make([]*plugins.Plugin, 0, len(ps))
	for _, p := range ps {
		var ip *plugins.Plugin
		stepFailed := false
		for _, init := range i.initializeSteps {
			ip, err = init(ctx, p)
			if err != nil {
				stepFailed = true
				i.log.Error("Could not initialize plugin", "pluginId", p.ID, "error", err)
				break
			}
		}
		if !stepFailed {
			initializedPlugins = append(initializedPlugins, ip)
		}
	}

	i.onSuccessFunc(ctx, initializedPlugins)
	return initializedPlugins, nil
}
