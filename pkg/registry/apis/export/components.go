package export

import (
	"context"

	"k8s.io/apimachinery/pkg/apis/meta/internalversion"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apiserver/pkg/registry/rest"

	common "github.com/grafana/grafana/pkg/apis/common/v0alpha1"
	export "github.com/grafana/grafana/pkg/apis/export/v0alpha1"
)

var (
	_ rest.Storage              = (*componentStorage)(nil)
	_ rest.Scoper               = (*componentStorage)(nil)
	_ rest.SingularNameProvider = (*componentStorage)(nil)
	_ rest.Lister               = (*componentStorage)(nil)
)

type componentStorage struct {
	resourceInfo   *common.ResourceInfo
	tableConverter rest.TableConvertor
}

func newComponentStorage() *componentStorage {
	var resourceInfo = export.ExportableComponentResourceInfo
	return &componentStorage{
		resourceInfo:   &resourceInfo,
		tableConverter: rest.NewDefaultTableConvertor(resourceInfo.GroupResource()),
	}
}

func (s *componentStorage) New() runtime.Object {
	return s.resourceInfo.NewFunc()
}

func (s *componentStorage) Destroy() {}

func (s *componentStorage) NamespaceScoped() bool {
	return false
}

func (s *componentStorage) GetSingularName() string {
	return s.resourceInfo.GetSingularName()
}

func (s *componentStorage) NewList() runtime.Object {
	return s.resourceInfo.NewListFunc()
}

func (s *componentStorage) ConvertToTable(ctx context.Context, object runtime.Object, tableOptions runtime.Object) (*metav1.Table, error) {
	return s.tableConverter.ConvertToTable(ctx, object, tableOptions)
}

func (s *componentStorage) List(ctx context.Context, options *internalversion.ListOptions) (runtime.Object, error) {
	return nil, nil
}
