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

func (s basePostgresImpl) createTable() error {
	sess := s.db.GetSqlxSession()
	_, err := sess.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS result (
			text TEXT,
			kind TEXT,
			uid TEXT,
			org_id INTEGER,
			weight INTEGER
		)
	`)
	if err != nil {
		return err
	}
	_, err = sess.Exec(context.Background(), "CREATE INDEX IF NOT EXISTS fts_text_idx ON result USING GIN(to_tsvector('english', text))")
	return err
}

func (s basePostgresImpl) Add(ctx context.Context, fields ...Field) error {
	sess := s.db.GetSqlxSession()
	for _, f := range fields {
		sql := "INSERT INTO result(kind, uid , org_id, text, weight) VALUES(?, ?, ?, ?, ?)"
		args := []interface{}{f.Ref.Kind, f.Ref.UID, f.Ref.OrgID, f.Text, f.Weight}
		_, err := sess.Exec(ctx, sql, args...)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s basePostgresImpl) Search(ctx context.Context, query string) ([]Ref, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s basePostgresImpl) Delete(ctx context.Context, ref Ref) error {
	return s.db.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		_, err := sess.Exec("DELETE FROM result WHERE kind=? AND uid=? AND org_id=?", ref.Kind, ref.UID, ref.OrgID)
		return err
	})
}

type PostgresImplLike struct {
	basePostgresImpl
}

func (s PostgresImplLike) Search(ctx context.Context, query string) ([]Ref, error) {
	var results []Ref
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
	// m := &PostgresImplLike{}
	m.db = db
	return m, m.createTable()
}

func (s PostgresImplFTS) Search(ctx context.Context, query string) ([]Ref, error) {
	results := []Ref{}
	sess := s.db.GetSqlxSession()
	rows, err := sess.Query(ctx, "SELECT kind, org_id, uid FROM result WHERE tsv @@ plainto_tsquery(?) LIMIT 50", query)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		r := Ref{}
		if err := rows.Scan(&r.Kind, &r.OrgID, &r.UID); err != nil {
			return nil, err
		}
		// fmt.Println(r.UID)
		results = append(results, r)
	}
	return results, nil
}

type PostgresImplBluge struct {
	basePostgresImpl
}
