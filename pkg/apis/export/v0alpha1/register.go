package v0alpha1

import (
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"

	common "github.com/grafana/grafana/pkg/apis/common/v0alpha1"
)

const (
	GROUP      = "export.grafana.app"
	VERSION    = "v0alpha1"
	APIVERSION = GROUP + "/" + VERSION
)

var GrafanaExportInfoResource = common.NewResourceInfo(GROUP, VERSION,
	"exports", "export", "GrafanaExportInfo",
	func() runtime.Object { return &GrafanaExportInfo{} },
	func() runtime.Object { return &GrafanaExportInfo{} },
)

var ExportableComponentResourceInfo = common.NewResourceInfo(GROUP, VERSION,
	"components", "component", "ExportableComponent",
	func() runtime.Object { return &ExportableComponent{} },
	func() runtime.Object { return &ExportableComponentList{} },
)

var (
	// SchemeGroupVersion is group version used to register these objects
	SchemeGroupVersion = schema.GroupVersion{Group: GROUP, Version: VERSION}
)
