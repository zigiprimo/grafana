package validation

import (
	"context"

	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/config"
	"github.com/grafana/grafana/pkg/plugins/log"
)

// Validator is responsible for the Validation stage of the plugin loader pipeline.
type Validator interface {
	Validate(ctx context.Context, ps []*plugins.Plugin) ([]*plugins.Plugin, error)
}

// ValidateFunc is the function used for the Validate step of the Validation stage.
type ValidateFunc func(ctx context.Context, p *plugins.Plugin) error

type OnSuccessFunc func(ctx context.Context, ps []*plugins.Plugin)

type OnErrorFunc func(ctx context.Context, p *plugins.Plugin, err error)

type Validate struct {
	cfg           *config.Cfg
	validateSteps []ValidateFunc

	onSuccessFunc OnSuccessFunc
	onErrorFunc   OnErrorFunc

	log log.Logger
}

type Opts struct {
	ValidateFuncs []ValidateFunc

	OnSuccessFunc OnSuccessFunc
	OnErrorFunc   OnErrorFunc
}

// New returns a new Validation stage.
func New(cfg *config.Cfg, opts Opts) *Validate {
	if opts.ValidateFuncs == nil {
		opts.ValidateFuncs = DefaultValidateFuncs(cfg)
	}

	if opts.OnSuccessFunc == nil {
		opts.OnSuccessFunc = func(ctx context.Context, p []*plugins.Plugin) {}
	}

	if opts.OnErrorFunc == nil {
		opts.OnErrorFunc = func(ctx context.Context, p *plugins.Plugin, err error) {}
	}

	return &Validate{
		cfg:           cfg,
		validateSteps: opts.ValidateFuncs,
		onSuccessFunc: opts.OnSuccessFunc,
		onErrorFunc:   opts.OnErrorFunc,
		log:           log.New("plugins.validation"),
	}
}

// Validate will execute the Validate steps of the Validation stage.
func (v *Validate) Validate(ctx context.Context, ps []*plugins.Plugin) ([]*plugins.Plugin, error) {
	if len(v.validateSteps) == 0 {
		return ps, nil
	}

	validatedPlugins := make([]*plugins.Plugin, 0, len(ps))
	for _, p := range ps {
		stepFailed := false
		for _, validate := range v.validateSteps {
			err := validate(ctx, p)
			if err != nil {
				stepFailed = true
				v.log.Error("Plugin validation failed", "pluginId", p.ID, "error", err)
				v.onErrorFunc(ctx, p, err)
				break
			}
		}
		if !stepFailed {
			validatedPlugins = append(validatedPlugins, p)
		}
	}

	v.onSuccessFunc(ctx, validatedPlugins)
	return validatedPlugins, nil
}
