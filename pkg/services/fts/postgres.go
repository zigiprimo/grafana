package fts

import (
	"context"
	"fmt"
	"os"

	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/services/sqlstore"
)

type basePostgresImpl struct {
	db db.DB
}

func (s basePostgresImpl) DB() db.DB {
	return s.db
}

func (s basePostgresImpl) Add(ctx context.Context, text, kind, uid string, orgID int64, weight int) error {
	return s.db.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		sql := "INSERT INTO result(text, kind, uid , org_id , weight) VALUES(?, ?, ?, ?, ?)"
		args := []interface{}{text, kind, uid, orgID, weight}
		_, err := sess.WithReturningID(s.db.GetDialect().DriverName(), sql, args)
		return err
	})
}

func (s basePostgresImpl) Search(query string) ([]Result, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s basePostgresImpl) Delete(ctx context.Context, kind, uid string, orgID int64) error {
	return s.db.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		_, err := sess.Exec("DELETE FROM folder WHERE uid=? AND org_id=?", uid, orgID)
		return err
	})
}

func (s basePostgresImpl) Close(ctx context.Context) error {
	return fmt.Errorf("not implemented")
}

type PostgresImplLike struct {
	basePostgresImpl
}

func (s PostgresImplLike) Search(ctx context.Context, query string) ([]Result, error) {
	var results []Result
	err := s.db.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		op := "LIKE"
		if os.Getenv("GRAFANA_TEST_FTS_CASE_INSENSITIVE") != "" {
			op = "ILIKE"
		}
		sql := fmt.Sprintf("SELECT * FROM result WHERE text %s ?", op)
		arg := fmt.Sprintf("%%%s%%", query)
		err := sess.SQL(sql, arg).Find(&results)
		return err
	})
	return results, err
}

type PostgresImplFTS struct {
	basePostgresImpl
}

func (s PostgresImplFTS) Search(ctx context.Context, query string) ([]Result, error) {
	var results []Result
	err := s.db.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		sql := fmt.Sprintf("SELECT * FROM result WHERE to_tsvector(text) @@ plainto_tsquery(?)")
		err := sess.SQL(sql, query).Find(&results)
		return err
	})
	return results, err
}

type PostgresImplBluge struct {
	basePostgresImpl
}
