package fts

import (
	"os"
	"testing"

	"github.com/grafana/grafana/pkg/infra/db"
)

func TestPostgresSearch(t *testing.T) {
	os.Setenv("GRAFANA_TEST_DB", "postgres")
	os.Setenv("SKIP_MIGRATIONS", "true")
	db := db.InitTestDB(t)
	search, err := NewPostgresSearch(db)
	if err != nil {
		t.Fatal(err)
	}

	testSearch(t, search)
}
