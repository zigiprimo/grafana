package fts

import (
	"context"
	"testing"

	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/stretchr/testify/require"
)

func BenchmarkSearch(b *testing.B) {
	benchmarkSearch(b)
}

func benchmarkSearch(b *testing.B) {
	sql := db.InitTestDB(b)

	err := sql.WithDbSession(context.Background(), func(sess *sqlstore.DBSession) error {
		if err := sess.CreateTable(Result{}); err != nil {
			return err
		}
		return nil
	})
	require.NoError(b, err)
}
