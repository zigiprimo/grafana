package v0alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	common "github.com/grafana/grafana/pkg/apis/common/v0alpha1"
)

// This defines valid properties in in a schema object
//
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type QueryTypeDefinition struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec QueryTypeSpec `json:"spec,omitempty"`
}

// The ObjectMeta.Name field defines the
type QueryTypeSpec struct {
	Description string `json:"description,omitempty"`

	// The OpenAPI definition for non-common field fields
	// Only defines the non-core fields!
	// https://github.com/kubernetes/apiextensions-apiserver/blob/v0.29.1/pkg/apis/apiextensions/types_jsonschema.go#L40
	Schema common.Unstructured `json:"schema"`

	// Examples (include a wrapper)
	Examples []ExampleInfo `json:"examples,omitempty"`

	// What changed from the previous version
	// for the full history see git!
	Changelog []string `json:"changelog,omitempty"`
}

// TODO -- use the template defined in peakq!!!
type ExampleInfo struct {
	Name string `json:"name,omitempty"`

	Description string `json:"description,omitempty"`

	Query GenericDataQuery `json:"query,omitempty"`
}

// List of datasource plugins
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type QueryTypeDefinitionList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []QueryTypeDefinition `json:"items,omitempty"`
}
