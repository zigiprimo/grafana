package modules

import "github.com/grafana/grafana/pkg/services/featuremgmt"

type TargetInfo struct {
	// The target name specified in config
	Name string

	// The target description
	Description string

	// Targets that need to be started first
	Dependencies []*TargetInfo

	// The target requries a feature flag to run.
	// The target will not start if it is specified from the "all" target,
	// however if it is explicitly specified as a target, it will fail to start
	// if the required feature flag is not enabled
	RequiresFeatureFlag string
}

var All = &TargetInfo{
	Name:        "all",
	Description: "Will resolve all services",
	Dependencies: []*TargetInfo{
		BackgroundServices,
		GrafanaAPIServer, // requires a feature flag
	},
}

var BackgroundServices = &TargetInfo{
	Name:         "background-services",
	Description:  "all Grafana services that run in the background",
	Dependencies: []*TargetInfo{CertGenerator},
}

var GrafanaAPIServer = &TargetInfo{
	Name:                "grafana-apiserver",
	Description:         "Kubernetes style api-server",
	RequiresFeatureFlag: featuremgmt.FlagGrafanaAPIServer,
}

var CertGenerator = &TargetInfo{
	Name:                "cert-generator",
	Description:         "generates certificates for grafana-apiserver",
	RequiresFeatureFlag: featuremgmt.FlagGrafanaAPIServer,
}
