package fts

import (
	"context"
	"fmt"

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
	fmt.Println("MUYSQL CREATE TABLE", err)
	return err
}

func (m *mysqlSearch) Add(ctx context.Context, fields ...Field) error {
	sess := m.db.GetSqlxSession()
	insert := "INSERT INTO fts(org_id, kind, uid, text, weight) VALUES "
	vals := ""
	args := []any{}
	for i, f := range fields {
		vals += "(?, ?, ?, ?, ?),"
		args = append(args, f.Ref.OrgID, f.Ref.Kind, f.Ref.UID, f.Text, f.Weight)
		if i%BatchSize == 0 || i == len(fields)-1 {
			_, err := sess.Exec(ctx, insert+vals[0:len(vals)-1], args...)
			if err != nil {
				return err
			}
			args, vals = []any{}, ""
		}
	}
	return nil
}

func (m *mysqlSearch) Delete(ctx context.Context, ref Ref) error {
	_, err := m.db.GetSqlxSession().Exec(ctx, `DELETE FROM fts WHERE kind=? AND uid=? AND org_id=?`, ref.Kind, ref.UID, ref.OrgID)
	return err
}

func (m *mysqlSearch) Search(ctx context.Context, query string) ([]Ref, error) {
	// SELECT kind, org_id, uid, MATCH(text) AGAINST (? IN BOOLEAN MODE) as rel FROM fts WHERE MATCH(text) AGAINST(? IN BOOLEAN MODE)
	rows, err := m.db.GetSqlxSession().Query(ctx, `
		SELECT kind, org_id, uid FROM fts WHERE MATCH(text) AGAINST(? IN BOOLEAN MODE)
	`, query)
	if err != nil {
		return nil, err
	}
	results := []Ref{}
	for rows.Next() {
		r := Ref{}
		// f := 0.0
		if err := rows.Scan(&r.Kind, &r.OrgID, &r.UID /*, &f*/); err != nil {
			return nil, err
		}
		// r.Weight = int(f * 100)
		results = append(results, r)
	}
	return results, nil
}
