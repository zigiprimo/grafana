package main

import (
	"os"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
)

var logger = backend.NewLoggerWith("logger", "tsdb.loki")

func main() {
	logger.Info("loki - main")
	// Created as described at https://grafana.com/developers/plugin-tools/introduction/backend-plugins
	if err := datasource.Manage("loki", NewDatasource, datasource.ManageOpts{}); err != nil {
		log.DefaultLogger.Error(err.Error())
		os.Exit(1)
	}
}
