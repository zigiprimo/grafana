package fts

type Search interface {
	Add(text, kind, uid string, orgID int64, weight int) error
	Search(query string) ([]Result, error)
	Delete(kind, uid string, orgID int64) error
}

type Result struct {
	Text   string
	Kind   string
	UID    string
	OrgID  int64
	Weight int
}
