package fts

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"

	"github.com/blugelabs/bluge"
)

// Composition: AND / OR
type blugeSearcher struct {
	w *bluge.Writer
}

func NewBlugeInMemorySearch() (Search, error) {
	config := bluge.InMemoryOnlyConfig()
	w, err := bluge.OpenWriter(config)
	if err != nil {
		return nil, err
	}
	return &blugeSearcher{w: w}, nil
}

type id struct {
	Kind  string
	OrgID int64
	UID   string
}

func (id id) String() string {
	return fmt.Sprintf("%s:%d:%s", id.Kind, id.OrgID, id.UID)
}

func parseID(s string) (id, error) {
	parts := strings.SplitN(s, ":", 3)
	if len(parts) != 3 {
		return id{}, errors.New("bad format")
	}
	orgID, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return id{}, err
	}
	return id{Kind: parts[0], OrgID: orgID, UID: parts[2]}, nil
}

func (bs *blugeSearcher) Add(_ context.Context, text, kind, uid string, orgID int64, weight int) error {
	doc := bluge.NewDocument(id{kind, orgID, uid}.String()).AddField(bluge.NewTextField("text", text))
	return bs.w.Update(doc.ID(), doc)
}

func (bs *blugeSearcher) Delete(_ context.Context, kind, uid string, orgID int64) error {
	return bs.w.Delete(bluge.NewDocument(id{kind, orgID, uid}.String()).ID())
}

func (bs *blugeSearcher) Search(_ context.Context, query string) ([]Result, error) {
	r, err := bs.w.Reader()
	if err != nil {
		return nil, err
	}
	defer r.Close()
	q := bluge.NewPrefixQuery(query).SetField("text")
	request := bluge.NewTopNSearch(50, q)
	documentMatchIterator, err := r.Search(context.Background(), request)
	if err != nil {
		return nil, err
	}
	match, err := documentMatchIterator.Next()
	results := []Result{}
	for err == nil && match != nil {
		err = match.VisitStoredFields(func(field string, value []byte) bool {
			if field == "_id" {
				id, err := parseID(string(value))
				if err == nil {
					results = append(results, Result{
						Kind:  id.Kind,
						OrgID: id.OrgID,
						UID:   id.UID,
					})
				} else {
					log.Fatal(err)
				}
			}
			return true
		})
		if err != nil {
			return nil, err
		}
		match, err = documentMatchIterator.Next()
	}
	if err != nil {
		return nil, err
	}

	return results, nil
}

func (bs *blugeSearcher) Close(_ context.Context) error {
	return bs.w.Close()
}
