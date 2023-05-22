package fts

import (
	"context"
	"testing"

	"github.com/grafana/grafana/pkg/infra/db"
)

func TestSQLiteSimpleSearch(t *testing.T) {
	db := db.InitTestDB(t)
	search, err := NewSQLiteSearch(db)
	if err != nil {
		t.Fatal(err)
	}

	for _, b := range books {
		if err := search.Add(context.Background(), Field{Ref{0, "book", b}, b, 1}); err != nil {
			t.Fatal(err)
		}
	}
	if err := search.Delete(context.Background(), Ref{0, "book", "Atlas Shrugged by Ayn Rand (1957)"}); err != nil {
		t.Fatal(err)
	}

	for _, test := range []struct {
		Query   string
		Matches []string
	}{
		{"day", []string{"One Day in the Life of Ivan Denisovich by Alexander Solzhenitsyn (1962)"}},
		{"sea", []string{"Wide Sargasso Sea by Jean Rhys (1966)", "The Sea, The Sea by Iris Murdoch (1978)"}},
		{"count*", []string{"Another Country by James Baldwin (1962)", "The Count of Monte Cristo by Alexandre Dumas (1844)"}},
		{"1938", []string{"The Death of the Heart by Elizabeth Bowen (1938)", "The Code of the Woosters by P. G. Wodehouse (1938)", "Scoop by Evelyn Waugh (1938)"}},
		{"atlas", nil},
	} {
		res, err := search.Search(context.Background(), test.Query)
		if err != nil {
			t.Fatal(err)
		}
		if len(test.Matches) != len(res) {
			t.Fatal(res, test.Matches)
		}
		for i, m := range test.Matches {
			t.Log(res[i])
			if res[i].UID != m {
				t.Fatal(res, test.Matches)
			}
		}
	}
}
