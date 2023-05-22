package fts

import (
	"context"
)

// TODO: add context
// TODO: add limit to Search()
// TODO: make kind+org+uid a separate type and use that instead of Result?

type Search interface {
	Add(ctx context.Context, text, kind, uid string, orgID int64, weight int) error
	Search(ctx context.Context, query string) ([]Result, error)
	Delete(ctx context.Context, kind, uid string, orgID int64) error
	Close(ctx context.Context) error
}

type Result struct {
	Text   string
	Kind   string
	UID    string `xorm:"uid"`
	OrgID  int64  `xorm:"org_id"`
	Weight int
}

type op int

const (
	opMatch op = iota
	opOr
	opAnd
	opNot
)

type query struct {
	op       op
	term     string
	prefix   bool
	children []query
}

func parseQuery(q string) (*query, error) {
	/*
		q := bluge.NewBooleanQuery()
		for _, s := range splitFields(query) {
			fmt.Println("  TOKEN: " + s)
			if strings.HasPrefix(s, "+") {
				q.AddMust(bluge.NewMatchQuery(s[1:]).SetField("text"))
			} else if strings.HasPrefix(s, "-") {
				q.AddMustNot(bluge.NewMatchQuery(s[1:]).SetField("text"))
			} else if strings.HasPrefix(s, `"`) && strings.HasSuffix(s, `"`) {
				fmt.Println("LIT:", s[1:len(s)-1])
				q.AddShould(bluge.NewMatchPhraseQuery(s).SetField("text").SetSlop(1))
			} else if strings.HasSuffix(s, `*`) {
				q.AddShould(bluge.NewPrefixQuery(s[:len(s)-1]).SetField("text"))
			} else {
				q.AddShould(bluge.NewMatchQuery(s).SetField("text"))
			}
		}
	*/
	return nil, nil
}
