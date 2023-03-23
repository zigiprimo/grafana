package pluginmanager

import (
	"context"
	"errors"

	"github.com/grafana/dskit/services"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/modules"
	"github.com/grafana/grafana/pkg/plugins/manager/process"
)

type Manager struct {
	*services.BasicService

	processManager process.Service
	log            log.Logger
}

func ProvideManager(processManager process.Service) *Manager {
	m := &Manager{
		processManager: processManager,
		log:            log.New("plugin.manager"),
	}
	m.BasicService = services.NewBasicService(nil, m.run, m.stop).WithName(modules.Plugins)

	return m
}

func (m *Manager) run(ctx context.Context) error {
	<-ctx.Done()
	return ctx.Err()
}

func (m *Manager) stop(failure error) error {
	err := m.processManager.Shutdown(context.Background())
	if err != nil {
		m.log.Error("Plugin process manager shutdown error", "err", err)
	}
	if !errors.Is(failure, context.Canceled) {
		return failure
	}
	return nil
}
