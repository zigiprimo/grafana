package fts

import (
	"context"
	"strings"
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

// Query is a search query
type Query struct {
	Mode     Mode
	Term     string
	Domain   string
	Children []*Query
}

type Mode int

// Mysql:     term prefix* "a phrase" +must -mustnot   or (group)
// Postgres:  term prefix* a<->phrase &must &!mustnot |or (group)
// SQLite:    term prefix* "a phrase" AND   NOT        OR (group)

const (
	ModeTerm Mode = iota
	ModePrefix
	ModePhrase
	ModeMust
	ModeNot
	ModeGroup
)

func NewQuery(query string) Query {
	// TODO: (group)
	// TODO: domain:value
	// TODO: #tag
	q := Query{Mode: ModeGroup}
	for _, s := range splitFields(query) {
		if strings.HasPrefix(s, "+") {
			q.Children = append(q.Children, &Query{Mode: ModeMust, Term: s[1:]})
		} else if strings.HasPrefix(s, "-") {
			q.Children = append(q.Children, &Query{Mode: ModeNot, Term: s[1:]})
		} else if strings.HasPrefix(s, `"`) && strings.HasSuffix(s, `"`) {
			q.Children = append(q.Children, &Query{Mode: ModePhrase, Term: s[1 : len(s)-1]})
		} else if strings.HasSuffix(s, `*`) {
			q.Children = append(q.Children, &Query{Mode: ModePrefix, Term: s[:len(s)-1]})
		} else {
			q.Children = append(q.Children, &Query{Mode: ModeTerm, Term: s})
		}
	}
	return q
}

func splitFields(s string) []string {
	quoted := false
	return strings.FieldsFunc(s, func(r rune) bool {
		if r == '"' {
			quoted = !quoted
		}
		return !quoted && r == ' '
	})
}

type Search interface {
	Add(ctx context.Context, fields ...Field) error
	Delete(ctx context.Context, ref Ref) error
	Search(ctx context.Context, query Query, limit int) ([]Ref, error)
}

const BatchSize = 1000
