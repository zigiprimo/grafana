package fts

import (
	"context"
)

// Ref is an object reference, it is used to idenfity external documents that contain searchable texts.
// It is identical to GRN and should probable be replaced with the latter at some point.
type Ref struct {
	OrgID int64
	Kind  string
	UID   string
}

// Field is an indexed textual content from an object/document.
type Field struct {
	Ref    Ref
	Text   string
	Weight int
}

type Search interface {
	Add(ctx context.Context, fields ...Field) error
	Delete(ctx context.Context, ref Ref) error
	Search(ctx context.Context, query string) ([]Ref, error)
}

const BatchSize = 1000

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
