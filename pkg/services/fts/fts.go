package fts

import (
	"context"

	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/services/sqlstore/searchstore"
)

type Service interface {
	TitleFilter(title string) searchstore.FilterWhere
}

type fts struct {
	db db.DB
}

func ProvideService(db db.DB, features featuremgmt.FeatureToggles) (Service, error) {
	fts := &fts{db: db}
	if err := fts.migrate(); err != nil {
		return nil, err
	}
	return fts, nil
}

func (fts *fts) migrate() error {
	_, err := fts.db.GetSqlxSession().Exec(context.Background(), `
	-- Create FTS table
	CREATE VIRTUAL TABLE IF NOT EXISTS fts USING fts4(
		kind    VARCHAR(40) NOT NULL,
		org_id  INT NOT NULL,
		uid     VARCHAR(40) NOT NULL,
		field   VARCHAR(40) NOT NULL,
		content TEXT
	);

	-- Migrate existing dashboards and folders from dashboard table
	INSERT INTO fts(kind, org_id, uid, field, content)
	SELECT CASE WHEN is_folder THEN 'folder' ELSE 'dashboard' END, org_id, uid, 'title', title
	FROM dashboard WHERE NOT EXISTS (SELECT * FROM fts);

	-- TODO: setup triggers
	`)
	return err
}

func (fts *fts) TitleFilter(title string) searchstore.FilterWhere {
	return &Filter{title: title}
}

type Filter struct {
	title string
}

func (f *Filter) Where() (string, []interface{}) {
	// return `dashboard.title LIKE ?`, []interface{}{"%" + f.title + "%"}
	return `EXISTS (
		SELECT 1 FROM fts
		WHERE content MATCH ?
		AND uid = dashboard.uid
		AND kind = 'dashboard'
		AND org_id = dashboard.org_id
	)`, []interface{}{f.title + "*"}
}
