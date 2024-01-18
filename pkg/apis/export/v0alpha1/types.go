package v0alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// PENDING, RUNNING, STOPPED, PAUSED, ERROR
type JobState string

// A backup job
//
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type GrafanaExportInfo struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ExportSpec   `json:"spec"`
	Status ExportStatus `json:"status"`
}

type ExportSpec struct {
	// Optional note for this backup instance
	Note string `json:"note,omitempty"`

	// The components that should be backed up
	Include []string `json:"include,omitempty"`
}

// Updated periodically by the process
type ExportStatus struct {
	JobStatus `json:",inline"`

	// Each of the components that make the export
	Components []ComponentStatus `json:"components,omitempty"`
}

type JobStatus struct {
	State JobState `json:"state"`
	// Unix timestamp when the job started
	Started int64 `json:"started,omitempty"`
	// Unix timestamp when the process last updated
	Updated int64 `json:"updated,omitempty"`
	// Unix timestamp when the job finished
	Finished int64 `json:"finished,omitempty"`
	// The item index
	Index int64 `json:"index,omitempty"` // 1/200
	// The total value count
	Total int64 `json:"total,omitempty"`
	// Optional status message
	Message string `json:"message,omitempty"`
	// Optional warning message
	Warning string `json:"warning,omitempty"`
}

// Individual component status
type ComponentStatus struct {
	Name      string `json:"name"`
	JobStatus `json:",inline"`
}

// List of datasource and their status
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type GrafanaExportInfoList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []GrafanaExportInfo `json:"items,omitempty"`
}

// Virtual resource that represents something that can be exported
//
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type ExportableComponent struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec ExportableComponentSpec `json:"spec"`
}

type ExportableComponentSpec struct {
	Description string `json:"description"`
}

// List of datasource and their status
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type ExportableComponentList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []ExportableComponent `json:"items,omitempty"`
}
