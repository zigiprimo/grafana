package fts

import (
	"context"
	"os"
	"sort"
	"strings"
	"testing"

	"github.com/grafana/grafana/pkg/infra/db"
)

func testSearch(t *testing.T, search Search) {
	t.Helper()
	// Add documents to the index
	for _, doc := range []struct {
		Kind   string
		UID    string
		Text   string
		Weight int
	}{
		{"line", "1", "The old night keeper keeps the keep in the town", 10},
		{"line", "2", "In the big old house in the big old gown", 10},
		{"line", "3", "In the house in the town in the big old keep", 10},
		{"line", "4", "Where the old night keeper never did sleep", 10},
		{"line", "5", "The night keeper keeps the keep in the night", 10},
		{"line", "6", "And keeps in the dark and sleeps in the light", 10},
		{"song", "7", "Strangers in the night exchanging glances", 10},
		{"book", "8", `"Tender Is the Night" is the fourth and final novel completed by American writer F. Scott Fitzgerald`, 10},
		{"poet", "9", "John Keats son of Thomas Keats, a livery stable-keeper, was born at Moorfields", 10},
		{"wiki", "10", "Extrembügeln ist eine ausschließlich im Freien ausgetragene Extremsportart mit dem Ziel, selbst unter anspruchsvollsten klimatischen, geographischen und körperlichen Bedingungen mittels eines heißen Bügeleisens und eines Bügelbretts Wäsche zu bügeln.", 10},
	} {
		if err := search.Add(context.Background(), doc.Text, doc.Kind, doc.UID, 0, doc.Weight); err != nil {
			t.Fatal(err)
		}
	}
	// Remove a document
	if err := search.Delete(context.Background(), "song", "7", 0); err != nil {
		t.Fatal(err)
	}
	// Search queries
	for _, test := range []struct {
		Query   string
		UIDs    []string
		Ordered bool
	}{
		{"night", []string{"1", "4", "5", "8"}, false},                           // single word match
		{"keeper", []string{"1", "4", "5", "9"}, false},                          // single word match
		{"keep", []string{"1", "3", "5"}, false},                                 // single word match
		{"keep*", []string{"1", "3", "4", "5", "6", "9"}, false},                 // prefix match
		{"li*", []string{"6", "9"}, false},                                       // prefix match
		{"big old", []string{"1", "2", "3", "4"}, false},                         // muliple word "OR" match
		{`"big old"`, []string{"2", "3"}, false},                                 // exact match
		{"town keeper", []string{"1", "3", "4", "5", "9"}, false},                // multiple word "OR" match
		{`"town keeper"`, []string{}, false},                                     // exact match
		{"old night keeper", []string{"1", "2", "3", "4", "5", "8", "9"}, false}, // multiple word "OR" match
		{`"old night keeper"`, []string{"1", "4"}, false},                        // exact match
		{"+old +house", []string{"2", "3"}, false},                               // multiple word "AND" match
		{"+night +old", []string{"1", "4"}, false},                               // multiple word "AND" match
		{"+night -old", []string{"5", "8"}, false},                               // multiple word "AND"/"NOT" match
		{"-night +old", []string{"2", "3"}, false},                               // multiple word "AND"/"NOT" match
		{"keeper -night -old", []string{"9"}, false},                             // multiple word "AND"/"NOT" match
		{"Keats", []string{"9"}, false},                                          // case-insensitive
		{"keats", []string{"9"}, false},                                          // case-insensitive
		{"KEATS", []string{"9"}, false},                                          // case-insensitive
		{"bugel*", []string{"10"}, false},                                        // unicode
		{"freien", []string{"10"}, false},                                        // unicode
		{"heissen", []string{"10"}, false},                                       // unicode
		// TODO: per-kind search
		// {"poet:keeper", []string{"9"}, false},
		// {"poem:keeper", []string{"1", "4", "5"}, false},
		// TODO: weight ordering
	} {
		res, err := search.Search(context.Background(), test.Query)
		if err != nil {
			t.Fatal(test.Query, err)
		}
		// Make sure all results are found
		if len(test.UIDs) != len(res) {
			t.Error("mismatch:", test.Query, res, test.UIDs)
			continue
		}
		// If order deosn't matter: sort both slices alphabetically before comparison
		if !test.Ordered {
			sort.Strings(test.UIDs)
			sort.Slice(res, func(i, j int) bool { return strings.Compare(res[i].UID, res[j].UID) < 0 })
		}
		for i, m := range test.UIDs {
			if res[i].UID != m {
				t.Error("mismatch:", test.Query, res, test.UIDs)
			}
		}
	}
}

func TestMySQLSearch(t *testing.T) {
	os.Setenv("GRAFANA_TEST_DB", "mysql")
	os.Setenv("SKIP_MIGRATIONS", "true")
	db := db.InitTestDB(t)
	search, err := NewMySQLSearch(db)
	if err != nil {
		t.Fatal(err)
	}

	testSearch(t, search)
}

func TestBlugeSearch(t *testing.T) {
	search, err := NewBlugeInMemorySearch()
	if err != nil {
		t.Fatal(err)
	}
	testSearch(t, search)
}
