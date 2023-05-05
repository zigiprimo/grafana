package fts

type Search interface {
	Add(text, kind, uid string, orgID int64, weight int) error
	Search(query string) ([]Result, error)
	Delete(kind, uid string, orgID int64) error
	Close() error
}

type Result struct {
	ID     int64 `xorm:"pk autoincr 'id'"`
	Text   string
	Kind   string
	UID    string `xorm:"uid"`
	OrgID  int64  `xorm:"org_id"`
	Weight int
}
