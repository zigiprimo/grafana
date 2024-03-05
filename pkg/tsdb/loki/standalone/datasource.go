package main

import (
	"context"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/tsdb/loki"
	"github.com/grafana/grafana/pkg/tsdb/loki/tracing"
)

type Datasource struct {
	Service *loki.Service
}

var (
	_ backend.QueryDataHandler = (*Datasource)(nil)
)

func NewDatasource(c context.Context, b backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	// TODO
	features := featuremgmt.WithFeatures()
	tracer := tracing.InitializeTracerForTest()
	return &Datasource{
		Service: loki.ProvideService(httpclient.NewProvider(), features, tracer),
	}, nil
}

func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	logger.Info("loki - QueryData")
	return d.Service.QueryData(ctx, req)
}

func (d *Datasource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	logger.Info("loki - CheckHealth")
	return d.Service.CheckHealth(ctx, req)
}


func (d *Datasource) SubscribeStream(ctx context.Context, req *backend.SubscribeStreamRequest) (*backend.SubscribeStreamResponse, error) {
	logger.Info("loki - SubscribeStream")
	return d.Service.SubscribeStream(ctx, req)
}

func (d *Datasource) PublishStream(ctx context.Context, req *backend.PublishStreamRequest) (*backend.PublishStreamResponse, error) {
	logger.Info("loki - PublishStream")
	return d.Service.PublishStream(ctx, req)
}

func (d *Datasource) RunStream(ctx context.Context, req *backend.RunStreamRequest, sender *backend.StreamSender) error {
	logger.Info("loki - RunStream")
	return d.Service.RunStream(ctx, req, sender)
}

func (d *Datasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	logger.Info("loki - CallResource")
	return d.Service.CallResource(ctx, req, sender)
}
