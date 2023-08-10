package bootstrap

import (
	"context"

	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/config"
	"github.com/grafana/grafana/pkg/plugins/log"
	"github.com/grafana/grafana/pkg/plugins/manager/loader/assetpath"
	"github.com/grafana/grafana/pkg/plugins/manager/signature"
)

// Bootstrapper is responsible for the Bootstrap stage of the plugin loader pipeline.
type Bootstrapper interface {
	Bootstrap(ctx context.Context, src plugins.PluginSource, bundles []*plugins.FoundBundle) ([]*plugins.Plugin, error)
}

// ConstructFunc is the function used for the Construct step of the Bootstrap stage.
type ConstructFunc func(ctx context.Context, src plugins.PluginSource, bundles []*plugins.FoundBundle) ([]*plugins.Plugin, error)

// DecorateFunc is the function used for the Decorate step of the Bootstrap stage.
type DecorateFunc func(ctx context.Context, p *plugins.Plugin) (*plugins.Plugin, error)

type OnSuccessFunc func(ctx context.Context, ps []*plugins.Plugin)

type OnErrorFunc func(ctx context.Context, bundles []*plugins.FoundBundle, err error)

// Bootstrap implements the Bootstrapper interface.
//
// The Bootstrap stage is made up of the following steps (in order):
// - Construct: Create the initial plugin structs based on the plugin(s) found in the Discovery stage.
// - Decorate: Decorate the plugins with additional metadata.
//
// The Construct step is implemented by the ConstructFunc type.
//
// The Decorate step is implemented by the DecorateFunc type.
type Bootstrap struct {
	constructStep ConstructFunc
	decorateSteps []DecorateFunc

	onSuccessFunc OnSuccessFunc
	onErrorFunc   OnErrorFunc

	log log.Logger
}

type Opts struct {
	ConstructFunc ConstructFunc
	DecorateFuncs []DecorateFunc

	OnSuccessFunc OnSuccessFunc
	OnErrorFunc   OnErrorFunc
}

// New returns a new Bootstrap stage.
func New(cfg *config.Cfg, opts Opts) *Bootstrap {
	if opts.ConstructFunc == nil {
		opts.ConstructFunc = DefaultConstructFunc(signature.DefaultCalculator(cfg), assetpath.DefaultService(cfg))
	}

	if opts.DecorateFuncs == nil {
		opts.DecorateFuncs = DefaultDecorateFuncs
	}

	if opts.OnSuccessFunc == nil {
		opts.OnSuccessFunc = func(ctx context.Context, ps []*plugins.Plugin) {}
	}

	if opts.OnErrorFunc == nil {
		opts.OnErrorFunc = func(ctx context.Context, bundles []*plugins.FoundBundle, err error) {}
	}

	return &Bootstrap{
		constructStep: opts.ConstructFunc,
		decorateSteps: opts.DecorateFuncs,
		onSuccessFunc: opts.OnSuccessFunc,
		onErrorFunc:   opts.OnErrorFunc,
		log:           log.New("plugins.bootstrap"),
	}
}

// Bootstrap will execute the Construct and Decorate steps of the Bootstrap stage.
func (b *Bootstrap) Bootstrap(ctx context.Context, src plugins.PluginSource, found []*plugins.FoundBundle) ([]*plugins.Plugin, error) {
	ps, err := b.constructStep(ctx, src, found)
	if err != nil {
		b.onErrorFunc(ctx, found, err)
		return nil, err
	}

	if len(b.decorateSteps) == 0 {
		return ps, nil
	}

	var failedStep []*plugins.Plugin
	bootstrappedPlugins := make([]*plugins.Plugin, 0, len(ps))
	for _, p := range ps {
		var ip *plugins.Plugin
		stepFailed := false
		for _, decorate := range b.decorateSteps {
			ip, err = decorate(ctx, p)
			if err != nil {
				stepFailed = true
				b.log.Error("Could not decorate plugin", "pluginId", p.ID, "error", err)
				failedStep = append(failedStep, p)
				break
			}
		}
		if !stepFailed {
			bootstrappedPlugins = append(bootstrappedPlugins, ip)
		}
	}

	// Remove any plugins associated with a plugin that failed to decorate
	for i, bootstrapped := range bootstrappedPlugins {
		for _, failed := range failedStep {
			if bootstrapped.ID == failed.ID && bootstrapped.Info.Version == failed.Info.Version {
				b.onErrorFunc(ctx, []*plugins.FoundBundle{reconstructBundle(failed)}, err)
				bootstrappedPlugins = append(bootstrappedPlugins[:i], bootstrappedPlugins[i+1:]...)
				break
			}
		}
	}

	b.onSuccessFunc(ctx, bootstrappedPlugins)
	return bootstrappedPlugins, nil
}

func reconstructBundle(p *plugins.Plugin) *plugins.FoundBundle {
	var children []*plugins.FoundPlugin
	for _, child := range p.Children {
		children = append(children, &plugins.FoundPlugin{
			JSONData: child.JSONData,
			FS:       child.FS,
		})
	}

	return &plugins.FoundBundle{
		Primary: plugins.FoundPlugin{
			JSONData: p.JSONData,
			FS:       p.FS,
		},
		Children: children,
	}
}
