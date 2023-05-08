package fts

import (
	"os"
	"testing"

	"github.com/grafana/grafana/pkg/infra/db"
)

func TestMySQLSimpleSearch(t *testing.T) {
	os.Setenv("GRAFANA_TEST_DB", "mysql")
	os.Setenv("SKIP_MIGRATIONS", "true")
	db := db.InitTestDB(t)
	search, err := NewMySQLSearch(db)
	if err != nil {
		t.Fatal(err)
	}

	for _, b := range books {
		if err := search.Add(b, "book", b, 0, 1); err != nil {
			t.Fatal(err)
		}
	}
	if err := search.Delete("book", "Atlas Shrugged by Ayn Rand (1957)", 0); err != nil {
		t.Fatal(err)
	}

	for _, test := range []struct {
		Query   string
		Matches []string
	}{
		{"day", []string{"One Day in the Life of Ivan Denisovich by Alexander Solzhenitsyn (1962)"}},
		{"sea", []string{"The Sea, The Sea by Iris Murdoch (1978)", "Wide Sargasso Sea by Jean Rhys (1966)"}},
		// {"count*", []string{"The Count of Monte Cristo by Alexandre Dumas (1844)", "Another Country by James Baldwin (1962)"}},
		{"1938", []string{"The Death of the Heart by Elizabeth Bowen (1938)", "The Code of the Woosters by P. G. Wodehouse (1938)", "Scoop by Evelyn Waugh (1938)"}},
		{"atlas", nil}, // Atlas ¯\_(ツ)_/¯

		// TODO: make "bronte" find all of the Bront[eë]s
	} {
		res, err := search.Search(test.Query)
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
