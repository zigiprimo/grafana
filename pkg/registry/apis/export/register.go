package export

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/runtime/serializer"
	"k8s.io/apiserver/pkg/authorization/authorizer"
	"k8s.io/apiserver/pkg/registry/generic"
	"k8s.io/apiserver/pkg/registry/rest"
	genericapiserver "k8s.io/apiserver/pkg/server"
	common "k8s.io/kube-openapi/pkg/common"

	"github.com/grafana/grafana/pkg/apis/export/v0alpha1"
	export "github.com/grafana/grafana/pkg/apis/export/v0alpha1"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	grafanaapiserver "github.com/grafana/grafana/pkg/services/grafana-apiserver"
)

var _ grafanaapiserver.APIGroupBuilder = (*ExportAPIBuilder)(nil)

type ExportAPIBuilder struct {
}

func NewExportAPIBuilder() *ExportAPIBuilder {
	return &ExportAPIBuilder{}
}

func RegisterAPIService(features featuremgmt.FeatureToggles, apiregistration grafanaapiserver.APIRegistrar) *ExportAPIBuilder {
	if !features.IsEnabledGlobally(featuremgmt.FlagGrafanaAPIServerWithExperimentalAPIs) {
		return nil // skip registration unless opting into experimental apis
	}
	builder := NewExportAPIBuilder()
	apiregistration.RegisterAPI(builder)
	return builder
}

func (b *ExportAPIBuilder) GetGroupVersion() schema.GroupVersion {
	return v0alpha1.SchemeGroupVersion
}

func addKnownTypes(scheme *runtime.Scheme, gv schema.GroupVersion) {
	scheme.AddKnownTypes(gv,
		&export.GrafanaExportInfo{},
		&export.GrafanaExportInfoList{},
		&export.ExportableComponent{},
		&export.ExportableComponentList{},
	)
}

func (b *ExportAPIBuilder) InstallSchema(scheme *runtime.Scheme) error {
	addKnownTypes(scheme, v0alpha1.SchemeGroupVersion)
	metav1.AddToGroupVersion(scheme, v0alpha1.SchemeGroupVersion)
	return scheme.SetVersionPriority(v0alpha1.SchemeGroupVersion)
}

func (b *ExportAPIBuilder) GetAPIGroupInfo(
	scheme *runtime.Scheme,
	codecs serializer.CodecFactory, // pointer?
	optsGetter generic.RESTOptionsGetter,
) (*genericapiserver.APIGroupInfo, error) {
	gv := v0alpha1.SchemeGroupVersion
	apiGroupInfo := genericapiserver.NewDefaultAPIGroupInfo(gv.Group, scheme, metav1.ParameterCodec, codecs)

	cmp := newComponentStorage()

	storage := map[string]rest.Storage{}
	storage[cmp.resourceInfo.StoragePath()] = cmp

	apiGroupInfo.VersionedResourcesStorageMap[gv.Version] = storage
	return &apiGroupInfo, nil
}

func (b *ExportAPIBuilder) GetOpenAPIDefinitions() common.GetOpenAPIDefinitions {
	return v0alpha1.GetOpenAPIDefinitions
}

// Register additional routes with the server
func (b *ExportAPIBuilder) GetAPIRoutes() *grafanaapiserver.APIRoutes {
	return nil
}

func (b *ExportAPIBuilder) GetAuthorizer() authorizer.Authorizer {
	return nil // default is OK
}
