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
	CREATE VIRTUAL TABLE IF NOT EXISTS fts USING FTS4(text, kind, uid, org_id, weight);
	`)
	return err
}

func (m *sqliteSearch) Add(_ context.Context, ref Ref, text string, weight int) error {
	_, err := m.db.GetSqlxSession().Exec(context.Background(), `INSERT INTO fts(kind, uid, org_id, text, weight) VALUES(?, ?, ?, ?, ?)`, ref.Kind, ref.UID, ref.OrgID, text, weight)
	return err
}

func (m *sqliteSearch) Delete(_ context.Context, ref Ref) error {
	_, err := m.db.GetSqlxSession().Exec(context.Background(), `DELETE FROM fts WHERE kind=? AND uid=? AND org_id=?`, ref.Kind, ref.UID, ref.OrgID)
	return err
}

func (m *sqliteSearch) Search(_ context.Context, query string) ([]Ref, error) {
	rows, err := m.db.GetSqlxSession().Query(context.Background(), `
	SELECT kind, uid, org_id FROM fts WHERE text MATCH ? LIMIT 50
	`, query)
	if err != nil {
		return nil, err
	}
	results := []Ref{}
	for rows.Next() {
		r := Ref{}
		if err := rows.Scan(&r.Kind, &r.UID, &r.OrgID); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (m *sqliteSearch) Close(_ context.Context) error { return nil }
