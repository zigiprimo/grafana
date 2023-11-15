package features

import (
	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
)

func ProvideFeatureManager(features *featuremgmt.FeatureManager) plugins.FeatureManager {
	return features
}

func ProvideFeatureToggles(features featuremgmt.FeatureToggles) plugins.FeatureToggles {
	return features
}
