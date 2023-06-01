package sources

import (
	"context"
	"path"
	"path/filepath"

	"github.com/grafana/grafana/pkg/plugins"
)

type LocalSource struct {
	paths []string
	class plugins.Class
}

func NewLocalSource(class plugins.Class, paths []string) *LocalSource {
	return &LocalSource{
		class: class,
		paths: paths,
	}
}

func (s *LocalSource) PluginClass(_ context.Context) plugins.Class {
	return s.class
}

func (s *LocalSource) PluginURIs(_ context.Context) []string {
	return s.paths
}

func (s *LocalSource) DefaultSignature(_ context.Context) (plugins.Signature, bool) {
	switch s.class {
	case plugins.Core:
		return plugins.Signature{
			Status: plugins.SignatureInternal,
		}, true
	default:
		return plugins.Signature{}, false
	}
}

func (s *LocalSource) Base(_ context.Context, jsonData plugins.JSONData, fs plugins.FS) (string, error) {
	if s.class == plugins.Core {
		return path.Join("public/app/plugins", string(jsonData.Type), filepath.Base(fs.Base())), nil
	}
	return path.Join("public/plugins", jsonData.ID), nil
}

func (s *LocalSource) Module(_ context.Context, jsonData plugins.JSONData, fs plugins.FS) (string, error) {
	if s.class == plugins.Core {
		return path.Join("app/plugins", string(jsonData.Type), filepath.Base(fs.Base()), "module"), nil
	}
	return path.Join("plugins", jsonData.ID, "module"), nil
}
