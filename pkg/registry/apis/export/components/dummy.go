package components

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/grafana/grafana/pkg/apis/export/v0alpha1"
	"github.com/grafana/grafana/pkg/registry/apis/export"
)

var (
	_ export.ComponentExporter = (*dummyExporter)(nil)
	_ export.ExportJob         = (*dummyExportJob)(nil)
	_ export.ImportJob         = (*dummyImportJob)(nil)
)

type dummyExporter struct {
	name        string
	startup     v1.Time
	description string
}

type dummyExportJob struct {
	ctx    context.Context
	status v0alpha1.JobStatus
	outdir string
}

type dummyImportJob struct {
	ctx    context.Context
	status v0alpha1.JobStatus
	input  string
}

func NewDummyExporter(name string, description string) *dummyExporter {
	return &dummyExporter{
		name:        name,
		startup:     v1.Now(),
		description: description,
	}
}

// GetExportableComponent implements export.ComponentExporter.
func (ex *dummyExporter) GetExportableComponent() v0alpha1.ExportableComponent {
	return v0alpha1.ExportableComponent{
		TypeMeta: v0alpha1.ExportableComponentResourceInfo.TypeMeta(),
		ObjectMeta: v1.ObjectMeta{
			Name:              ex.name,
			CreationTimestamp: ex.startup,
		},
		Spec: v0alpha1.ExportableComponentSpec{
			Description: ex.description,
		},
	}
}

// StartExport implements export.ComponentExporter.
func (*dummyExporter) StartExport(ctx context.Context, outdir string) (export.ExportJob, error) {
	job := &dummyExportJob{
		ctx:    ctx,
		outdir: outdir,
		status: v0alpha1.JobStatus{
			State:   "pending",
			Started: time.Now().UnixMilli(),
		},
	}
	go job.doExport()
	return job, nil
}

// StartImport implements export.ComponentExporter.
func (*dummyExporter) StartImport(ctx context.Context, input string) (export.ImportJob, error) {
	job := &dummyImportJob{
		ctx:   ctx,
		input: input,
		status: v0alpha1.JobStatus{
			State:   "pending",
			Started: time.Now().UnixMilli(),
		},
	}
	go job.doImport()
	return job, nil
}

// Do the export job
func (j *dummyExportJob) doExport() {
	j.status = v0alpha1.JobStatus{
		State:   "started",
		Started: time.Now().UnixMilli(),
		Total:   rand.Int63n(1000) + 100,
	}

	for i := int64(0); i < j.status.Total; i++ {
		j.status.Index = i
		j.status.Message = fmt.Sprintf("item: %d", i)

		if rand.Float64() > 0.97 {
			j.status.State = "error"
			j.status.Message = "random error"
			return
		}

		// Sleep for a bit
		time.Sleep(time.Millisecond * time.Duration(rand.Intn(2000)))
	}

	j.status.State = "done"
	j.status.Finished = time.Now().UnixMilli()
}

// GetJobStatus implements export.ExportJob.
func (j *dummyExportJob) GetJobStatus() v0alpha1.JobStatus {
	return j.status
}

// Do the export job
func (j *dummyImportJob) doImport() {
	j.status = v0alpha1.JobStatus{
		State:   "started",
		Started: time.Now().UnixMilli(),
		Total:   rand.Int63n(1000) + 100,
	}

	for i := int64(0); i < j.status.Total; i++ {
		j.status.Index = i
		j.status.Message = fmt.Sprintf("item: %d", i)

		if rand.Float64() > 0.97 {
			j.status.State = "error"
			j.status.Message = "random error"
			return
		}

		// Sleep for a bit
		time.Sleep(time.Millisecond * time.Duration(rand.Intn(2000)))
	}

	j.status.State = "done"
	j.status.Finished = time.Now().UnixMilli()
}

// GetJobStatus implements export.ExportJob.
func (j *dummyImportJob) GetJobStatus() v0alpha1.JobStatus {
	return j.status
}
