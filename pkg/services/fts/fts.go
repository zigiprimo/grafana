package fts

import (
	"context"
)

type Search interface {
	Add(ctx context.Context, text, kind, uid string, orgID int64, weight int) error
	Search(ctx context.Context, query string) ([]Result, error)
	Delete(ctx context.Context, kind, uid string, orgID int64) error
	Close(ctx context.Context) error
}

type Result struct {
	ID     int64 `xorm:"pk autoincr 'id'"`
	Text   string
	Kind   string
	UID    string `xorm:"uid"`
	OrgID  int64  `xorm:"org_id"`
	Weight int
}
