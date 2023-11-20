#!/bin/bash

if [[ -z "${PLUGIN_EXAMPLES_REPO}" ]]; then
  echo "error: PLUGIN_EXAMPLES_REPO env var is not defined."
  echo "It should be the path to the grafana-plugin-examples repo checked out locally."
  echo "e.g. PLUGIN_EXAMPLES_REPO=${HOME}/workspace/grafana-plugin-examples"
  exit 1
fi

source ./test_helpers.sh

# Start  from scratch
docker-compose down db grafana
docker-compose up -d

# Tear down grafana. We need to wait so that tables are created during init
sleep 10
docker-compose down grafana

# Manually create lock
action="ext-svc-save-grafana-appwithonbehalfofauth-app"
insert_lock "${action}"

docker-compose up -d grafana
sleep 10 # Wait for it to try to create the external service while the lock is taken

delete_lock "${action}"
sleep 10 # Wait for it to retry and succeed now that the lock is released

show_logs
