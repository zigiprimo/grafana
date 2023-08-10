package termination

import (
	"context"
	"errors"

	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/config"
	"github.com/grafana/grafana/pkg/plugins/log"
)

// Terminator is responsible for the Termination stage of the plugin loader pipeline.
type Terminator interface {
	Terminate(ctx context.Context, pluginID, version string) error
}

// ResolveFunc is the function used for the Resolve step of the Termination stage.
type ResolveFunc func(ctx context.Context, pluginID, version string) (*plugins.Plugin, error)

// TerminateFunc is the function used for the Terminate step of the Termination stage.
type TerminateFunc func(ctx context.Context, p *plugins.Plugin) error

type OnSuccessFunc func(ctx context.Context, p *plugins.Plugin)

type OnErrorFunc func(ctx context.Context, pluginID, version string, err error)

type Terminate struct {
	cfg            *config.Cfg
	resolveStep    ResolveFunc
	terminateSteps []TerminateFunc

	onSuccessFunc OnSuccessFunc
	onErrorFunc   OnErrorFunc

	log log.Logger
}

type Opts struct {
	ResolveFunc    ResolveFunc
	TerminateFuncs []TerminateFunc

	OnSuccessFunc OnSuccessFunc
	OnErrorFunc   OnErrorFunc
}

// New returns a new Termination stage.
func New(cfg *config.Cfg, opts Opts) (*Terminate, error) {
	// without a resolve function, we can't do anything so return an error
	if opts.ResolveFunc == nil && opts.TerminateFuncs != nil {
		return nil, errors.New("resolve function is required")
	}

	if opts.TerminateFuncs == nil {
		opts.TerminateFuncs = []TerminateFunc{}
	}

	if opts.OnSuccessFunc == nil {
		opts.OnSuccessFunc = func(ctx context.Context, p *plugins.Plugin) {}
	}

	if opts.OnErrorFunc == nil {
		opts.OnErrorFunc = func(ctx context.Context, pluginID, version string, err error) {}
	}

	return &Terminate{
		cfg:            cfg,
		resolveStep:    opts.ResolveFunc,
		terminateSteps: opts.TerminateFuncs,
		onSuccessFunc:  opts.OnSuccessFunc,
		onErrorFunc:    opts.OnErrorFunc,
		log:            log.New("plugins.termination"),
	}, nil
}

// Terminate will execute the Terminate steps of the Termination stage.
func (t *Terminate) Terminate(ctx context.Context, pluginID, version string) error {
	p, err := t.resolveStep(ctx, pluginID, version)
	if err != nil {
		t.onErrorFunc(ctx, pluginID, version, err)
		return err
	}

	for _, terminate := range t.terminateSteps {
		if err = terminate(ctx, p); err != nil {
			t.onErrorFunc(ctx, pluginID, version, err)
			return err
		}
	}

	t.onSuccessFunc(ctx, p)
	return nil
}
