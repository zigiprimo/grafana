function show_logs() {
  docker-compose logs --no-log-prefix grafana \
    | grep -E 'another instance has the lock|Start execution' \
    | grep 'ext-svc-save-' \
    | jq '[.actionName,.msg]'
}

function insert_lock() {
  actionName=$1
  docker-compose exec db mysql -uroot -prootpass grafana -e "INSERT INTO server_lock (operation_uid, version, last_execution) VALUES ('${actionName}', 1, $(date +%s));"
}

function delete_lock() {
  actionName=$1
  docker-compose exec db mysql -uroot -prootpass grafana -e "DELETE FROM server_lock WHERE operation_uid='${actionName}';"
}
