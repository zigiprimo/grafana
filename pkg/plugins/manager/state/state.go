package state

import "github.com/grafana/grafana/pkg/plugins/log"

// Manager is responsible for managing the state of plugins.
type Manager interface {
	GetPluginState(PluginInfo) (PluginStatus, bool)
	SetPluginState(PluginInfo, Status)
}

type Status string

const (
	// StatusNone is the initial status of a plugin.
	StatusNone Status = "none"
	// StatusRequested is the status of a plugin when it has been requested to be installed.
	StatusRequested Status = "requested"
	// StatusInstalled is the status of a plugin when it has been installed.
	StatusInstalled Status = "installed"
	// StatusDiscovered is the status of a plugin when it has been discovered.
	StatusDiscovered Status = "discovered"
	// StatusBootstrapped is the status of a plugin when it has been bootstrapped.
	StatusBootstrapped Status = "bootstrapped"
	// StatusValidated is the status of a plugin when it has been validated.
	StatusValidated Status = "validated"
	// StatusInitialized is the status of a plugin when it has been initialized.
	StatusInitialized Status = "initialized"
	// StatusUninstalled is the status of a plugin when it has been uninstalled.
	StatusUninstalled Status = "uninstalled"
	// StatusError is the status of a plugin when it has encountered an error.
	StatusError Status = "StatusError"
)

// statusMap is a map of valid transitions between statuses.
var statusMap = map[Status][]Status{
	StatusNone:         {StatusRequested},
	StatusRequested:    {StatusInstalled, StatusError},
	StatusInstalled:    {StatusDiscovered, StatusError},
	StatusDiscovered:   {StatusBootstrapped, StatusError},
	StatusBootstrapped: {StatusValidated, StatusError},
	StatusValidated:    {StatusInitialized, StatusError},
	StatusInitialized:  {StatusUninstalled, StatusError},
	StatusUninstalled:  {StatusRequested},
}

type PluginStatus struct {
	curStatus  Status
	prevStatus Status
	info       PluginInfo
}

type PluginInfo struct {
	PluginID string
	Version  string
}

// Service is the implementation of the Manager interface.
type Service struct {
	states map[PluginInfo]PluginStatus
	log    log.Logger
}

func ProvideService() *Service {
	return &Service{
		states: make(map[PluginInfo]PluginStatus),
		log:    log.New("plugins.status"),
	}
}

func (s *Service) GetPluginState(info PluginInfo) (PluginStatus, bool) {
	st, exists := s.states[info]
	return st, exists
}

func (s *Service) SetPluginState(info PluginInfo, status Status) {
	st, exists := s.states[info]
	if !exists {
		st = PluginStatus{
			curStatus:  StatusNone,
			prevStatus: StatusNone,
			info:       info,
		}
	}

	if !s.canTransition(st.curStatus, status) {
		s.log.Warn("Plugin cannot transition to status", "pluginID", info.PluginID, "version", info.Version, "from", st.curStatus, "to", status)
		return
	}

	st.prevStatus = st.curStatus
	st.curStatus = status
	s.states[info] = st
}

func (s *Service) canTransition(from, to Status) bool {
	ss, exists := statusMap[from]
	if !exists {
		return false
	}

	for _, status := range ss {
		if status == to {
			return true
		}
	}

	return false
}
