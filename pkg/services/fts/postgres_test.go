package fts

import (
	"context"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/grafana/grafana/pkg/services/sqlstore/migrator"
	"github.com/stretchr/testify/require"
)

func TestSearch(t *testing.T) {
	sql := db.InitTestDB(t)
	if sql.GetDialect().DriverName() != migrator.Postgres {
		t.Skip("test database is not postgres")
	}

	setup := func() error {
		return sql.WithDbSession(context.Background(), func(sess *sqlstore.DBSession) error {
			// TODO create indexes
			if err := sess.CreateTable(Result{}); err != nil {
				return err
			}

			toAdd := add(t, "fixtures.csv", "dashboard")

			rowsAffected, err := sess.InsertMulti(toAdd)
			require.NoError(t, err)
			require.NotZero(t, rowsAffected)
			return nil
		})
	}

	err := setup()
	require.NoError(t, err)

	implFTS := PostgresImplFTS{}
	implFTS.db = sql

	implLike := PostgresImplLike{}
	implLike.db = sql

	testCases := []struct {
		desc  string
		query string
	}{
		{
			desc:  "word",
			query: "Lazy",
		},
		{
			desc:  "phrase",
			query: "Lazy Loading",
		},
		//{
		//	desc:  "case insensitive",
		//	query: "lazy",
		//},
	}

	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			resultLike, err := implLike.Search(context.Background(), tc.query)
			require.NoError(t, err)
			require.NotZero(t, len(resultLike))

			resultFTS, err := implFTS.Search(context.Background(), tc.query)
			require.NoError(t, err)

			if diff := cmp.Diff(resultFTS, resultLike); diff != "" {
				t.Errorf("Result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}
