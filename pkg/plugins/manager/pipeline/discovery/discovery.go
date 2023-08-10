package discovery

import (
	"context"

	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/config"
	"github.com/grafana/grafana/pkg/plugins/log"
)

// Discoverer is responsible for the Discovery stage of the plugin loader pipeline.
type Discoverer interface {
	Discover(ctx context.Context, src plugins.PluginSource) ([]*plugins.FoundBundle, error)
}

// FindFunc is the function used for the Find step of the Discovery stage.
type FindFunc func(ctx context.Context, src plugins.PluginSource) ([]*plugins.FoundBundle, error)

// FindFilterFunc is the function used for the Filter step of the Discovery stage.
type FindFilterFunc func(ctx context.Context, class plugins.Class, bundles []*plugins.FoundBundle) ([]*plugins.FoundBundle, error)

type OnSuccessFunc func(ctx context.Context, class plugins.Class, bundles []*plugins.FoundBundle)

type OnErrorFunc func(ctx context.Context, class plugins.Class, bundles []*plugins.FoundBundle, err error)

// Discovery implements the Discoverer interface.
//
// The Discovery stage is made up of the following steps (in order):
// - Find: Find plugins (from disk, remote, etc.)
// - Filter: Filter the results based on some criteria.
//
// The Find step is implemented by the FindFunc type.
//
// The Filter step is implemented by the FindFilterFunc type.
type Discovery struct {
	findStep        FindFunc
	findFilterSteps []FindFilterFunc

	onSuccessFunc OnSuccessFunc
	onErrorFunc   OnErrorFunc

	log log.Logger
}

type Opts struct {
	FindFunc        FindFunc
	FindFilterFuncs []FindFilterFunc

	OnSuccessFunc OnSuccessFunc
	OnErrorFunc   OnErrorFunc
}

// New returns a new Discovery stage.
func New(cfg *config.Cfg, opts Opts) *Discovery {
	if opts.FindFunc == nil {
		opts.FindFunc = DefaultFindFunc(cfg)
	}

	if opts.FindFilterFuncs == nil {
		opts.FindFilterFuncs = []FindFilterFunc{} // no filters by default
	}

	if opts.OnSuccessFunc == nil {
		opts.OnSuccessFunc = func(ctx context.Context, class plugins.Class, bundles []*plugins.FoundBundle) {}
	}

	if opts.OnErrorFunc == nil {
		opts.OnErrorFunc = func(ctx context.Context, class plugins.Class, bundles []*plugins.FoundBundle, err error) {}
	}

	return &Discovery{
		findStep:        opts.FindFunc,
		findFilterSteps: opts.FindFilterFuncs,
		onSuccessFunc:   opts.OnSuccessFunc,
		onErrorFunc:     opts.OnErrorFunc,
		log:             log.New("plugins.discovery"),
	}
}

// Discover will execute the Find and Filter steps of the Discovery stage.
func (d *Discovery) Discover(ctx context.Context, src plugins.PluginSource) ([]*plugins.FoundBundle, error) {
	discoveredPlugins, err := d.findStep(ctx, src)
	if err != nil {
		d.onErrorFunc(ctx, src.PluginClass(ctx), discoveredPlugins, err)
		return nil, err
	}

	for _, filter := range d.findFilterSteps {
		discoveredPlugins, err = filter(ctx, src.PluginClass(ctx), discoveredPlugins)
		if err != nil {
			d.onErrorFunc(ctx, src.PluginClass(ctx), discoveredPlugins, err)
			return nil, err
		}
	}

	d.onSuccessFunc(ctx, src.PluginClass(ctx), discoveredPlugins)
	return discoveredPlugins, nil
}
