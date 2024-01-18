package export

import (
	"golang.org/x/net/context"

	export "github.com/grafana/grafana/pkg/apis/export/v0alpha1"
)

type ComponentExporter interface {
	// Describe the item we can import/exporter
	GetExportableComponent() export.ExportableComponent

	// Start an export job and save the output in outdir
	// TODO: directories could/should be based on "gocloud.dev/blob"
	StartExport(ctx context.Context, outdir string) (ExportJob, error)

	// Start an import job, reading the input from the input directory
	// TODO: directories could/should be based on "gocloud.dev/blob"
	StartImport(ctx context.Context, input string) (ImportJob, error)
}

type ExportJob interface {
	GetJobStatus() export.JobStatus
}

type ImportJob interface {
	GetJobStatus() export.JobStatus
}
