package fts

import (
	"context"

	"github.com/grafana/grafana/pkg/infra/db"
)

type sqliteSearch struct {
	db db.DB
}

func NewSQLiteSearch(db db.DB) (Search, error) {
	m := &sqliteSearch{db: db}
	return m, m.createTable()
}

func (m *sqliteSearch) createTable() error {
	_, err := m.db.GetSqlxSession().Exec(context.Background(), `
	CREATE VIRTUAL TABLE fts USING FTS4(text, kind, uid, org_id, weight);
	`)
	return err
}

func (m *sqliteSearch) Add(_ context.Context, text, kind, uid string, orgID int64, weight int) error {
	_, err := m.db.GetSqlxSession().Exec(context.Background(), `INSERT INTO fts(text, kind, uid, org_id, weight) VALUES(?, ?, ?, ?, ?)`, text, kind, uid, orgID, weight)
	return err
}

func (m *sqliteSearch) Delete(_ context.Context, kind, uid string, orgID int64) error {
	_, err := m.db.GetSqlxSession().Exec(context.Background(), `DELETE FROM fts WHERE kind=? AND uid=? AND org_id=?`, kind, uid, orgID)
	return err
}

func (m *sqliteSearch) Search(_ context.Context, query string) ([]Result, error) {
	rows, err := m.db.GetSqlxSession().Query(context.Background(), `
	SELECT text, kind, uid, org_id, weight FROM fts WHERE text MATCH ?
	`, query)
	if err != nil {
		return nil, err
	}
	results := []Result{}
	for rows.Next() {
		r := Result{}
		f := 0.0
		if err := rows.Scan(&r.Text, &r.Kind, &r.UID, &r.OrgID, &f); err != nil {
			return nil, err
		}
		r.Weight = int(f * 100)
		results = append(results, r)
	}
	return results, nil
}

func (m *sqliteSearch) Close(_ context.Context) error { return nil }
