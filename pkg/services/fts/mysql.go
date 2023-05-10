package fts

import (
	"context"

	"github.com/grafana/grafana/pkg/infra/db"
)

type mysqlSearch struct {
	db db.DB
}

func NewMySQLSearch(db db.DB) (Search, error) {
	m := &mysqlSearch{db: db}
	return m, m.createTable()
}

func (m *mysqlSearch) createTable() error {
	_, err := m.db.GetSqlxSession().Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS fts (
			text TEXT,
			kind TEXT,
			uid TEXT,
			org_id INTEGER,
			weight INTEGER,
			FULLTEXT(text)
		)
	`)
	return err
}

func (m *mysqlSearch) Add(text, kind, uid string, orgID int64, weight int) error {
	_, err := m.db.GetSqlxSession().Exec(context.Background(), `INSERT INTO fts(text, kind, uid, org_id, weight) VALUES(?, ?, ?, ?, ?)`, text, kind, uid, orgID, weight)
	return err
}

func (m *mysqlSearch) Delete(kind, uid string, orgID int64) error {
	_, err := m.db.GetSqlxSession().Exec(context.Background(), `DELETE FROM fts WHERE kind=? AND uid=? AND org_id=?`, kind, uid, orgID)
	return err
}

func (m *mysqlSearch) Search(query string) ([]Result, error) {
	rows, err := m.db.GetSqlxSession().Query(context.Background(), `
		SELECT kind, org_id, uid, MATCH(text) AGAINST (? IN BOOLEAN MODE) as rel FROM fts WHERE MATCH(text) AGAINST(? IN BOOLEAN MODE)
	`, query, query)
	if err != nil {
		return nil, err
	}
	results := []Result{}
	for rows.Next() {
		r := Result{}
		f := 0.0
		if err := rows.Scan(&r.Kind, &r.OrgID, &r.UID, &f); err != nil {
			return nil, err
		}
		r.Weight = int(f * 100)
		results = append(results, r)
	}
	return results, nil
}

func (m *mysqlSearch) Close() error { return nil }
