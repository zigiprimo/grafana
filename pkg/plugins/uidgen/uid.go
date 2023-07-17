package uidgen

import (
	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/pluginuid"
)

type Generator interface {
	UID(jsonData plugins.JSONData) pluginuid.UID
}

type SimpleUIDGenerator struct{}

func ProvideService() *SimpleUIDGenerator {
	return &SimpleUIDGenerator{}
}

func (g *SimpleUIDGenerator) UID(jsonData plugins.JSONData) pluginuid.UID {
	return pluginuid.UID(jsonData.ID)
}
