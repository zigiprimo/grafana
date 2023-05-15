package fts

import (
	"context"
	"fmt"
	"os"

	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/services/sqlstore"
)

type basePostgresImpl struct {
	baseSearch
	db db.DB
}

func (m basePostgresImpl) createTable() error {
	return m.db.WithDbSession(context.Background(), func(sess *sqlstore.DBSession) error {
		// TODO create indexes
		return sess.CreateTable(Result{})
	})
}

func (s basePostgresImpl) Add(ctx context.Context, text, kind, uid string, orgID int64, weight int) error {
	return s.db.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		sql := "INSERT INTO result(text, kind, uid , org_id , weight) VALUES(?, ?, ?, ?, ?)"
		args := []interface{}{text, kind, uid, orgID, weight}
		_, err := sess.WithReturningID(s.db.GetDialect().DriverName(), sql, args)
		return err
	})
}

func (s basePostgresImpl) Search(ctx context.Context, query string) ([]Result, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s basePostgresImpl) Delete(ctx context.Context, kind, uid string, orgID int64) error {
	return s.db.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		_, err := sess.Exec("DELETE FROM result WHERE uid=? AND org_id=?", uid, orgID)
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

func NewPostgresSearch(db db.DB) (Search, error) {
	m := &PostgresImplFTS{}
	m.db = db
	return m, m.createTable()
}

func (s PostgresImplFTS) Search(ctx context.Context, query string) ([]Result, error) {
	results := []Result{}
	err := s.db.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		sql := fmt.Sprintf("SELECT * FROM result WHERE to_tsvector(text) @@ plainto_tsquery(?) ORDER by text")
		err := sess.SQL(sql, query).Find(&results)
		return err
	})
	return results, err
}

type PostgresImplBluge struct {
	basePostgresImpl
}
