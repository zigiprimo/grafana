package fts

import (
	"context"
	"os"
	"sort"
	"strconv"
	"strings"
	"testing"
	"time"

	_ "embed"

	"github.com/grafana/grafana/pkg/infra/db"
)

func BenchmarkDashboardTitles(b *testing.B) {
	init := func(b *testing.B, search Search) {
		if err := search.Add(context.Background(), DashboardTitles()...); err != nil {
			b.Fatal(err)
		}
	}
	run := func(b *testing.B, search Search, query string) {
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			if _, err := search.Search(context.Background(), NewQuery(query), 50); err != nil {
				b.Fatal(err)
			}
		}
	}

	b.Run("bluge", func(b *testing.B) {
		search, err := NewBlugeInMemorySearch()
		if err != nil {
			b.Fatal(err)
		}
		init(b, search)
		run(b, search, "prometheus")
	})
	// b.Run("sqlite", func(b *testing.B) {
	// 	db := db.InitTestDB(b)
	// 	search, err := NewSQLiteSearch(db)
	// 	if err != nil {
	// 		b.Fatal(err)
	// 	}
	// 	init(b, search)
	// 	run(b, search, "prometheus")
	// })
	// b.Run("psql", func(b *testing.B) {
	// 	os.Setenv("GRAFANA_TEST_DB", "postgres")
	// 	os.Setenv("SKIP_MIGRATIONS", "true")
	// 	db := db.InitTestDB(b)
	// 	search, err := NewPostgresSearch(db)
	// 	if err != nil {
	// 		b.Fatal(err)
	// 	}
	// 	init(b, search)
	// 	b.Run("postgres", func(b *testing.B) {
	// 		run(b, search, "prometheus")
	// 		// sess := db.GetSqlxSession()
	// 		// b.ResetTimer()
	// 		// for i := 0; i < b.N; i++ {
	// 		// 	rows, err := sess.Query(context.Background(), "SELECT 1")
	// 		// 	if err != nil {
	// 		// 		b.Fatal(err)
	// 		// 	}
	// 		// 	rows.Close()
	// 		// }
	// 	})
	// })
	b.Run("mysql", func(b *testing.B) {
		os.Setenv("GRAFANA_TEST_DB", "mysql")
		os.Setenv("SKIP_MIGRATIONS", "true")
		db := db.InitTestDB(b)
		search, err := NewMySQLSearch(db)
		if err != nil {
			b.Fatal(err)
		}
		now := time.Now()
		init(b, search)
		b.Log("INIT:", time.Now().Sub(now))
		run(b, search, "prometheus")
	})
}

func BenchmarkMovieTitlesBluge(b *testing.B) {
	search, err := NewBlugeInMemorySearch()
	if err != nil {
		b.Fatal(err)
	}
	if err := search.Add(context.Background(), MovieTitles()...); err != nil {
		b.Fatal(err)
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		search.Search(context.Background(), NewQuery("world strong*"), 50)
	}
}

func BenchmarkMovieTitlesSQLite(b *testing.B) {
	db := db.InitTestDB(b)
	search, err := NewSQLiteSearch(db)
	if err != nil {
		b.Fatal(err)
	}
	if err := search.Add(context.Background(), MovieTitles()...); err != nil {
		b.Fatal(err)
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		search.Search(context.Background(), NewQuery("world strong*"), 50)
	}
}

func BenchmarkMovieTitlesMySQL(b *testing.B) {
	os.Setenv("GRAFANA_TEST_DB", "mysql")
	os.Setenv("SKIP_MIGRATIONS", "true")
	db := db.InitTestDB(b)
	search, err := NewMySQLSearch(db)
	// search, err := NewBlugeInMemorySearch()
	if err != nil {
		b.Fatal(err)
	}
	sqlStr := "INSERT INTO fts(uid, kind, org_id, text, weight) VALUES "
	vals := []interface{}{}
	for i, movie := range strings.Split(movieTitles, "\n") {
		uid := strconv.Itoa(i)
		sqlStr += "(?, ?, ?, ?, ?),"
		vals = append(vals, uid, "movie", 1, movie, 1)
		if i%10000 == 0 {
			sqlStr = sqlStr[0 : len(sqlStr)-1]
			sess := db.GetSqlxSession()
			if _, err := sess.Exec(context.Background(), sqlStr, vals...); err != nil {
				b.Fatal(err)
			}
			sqlStr = "INSERT INTO fts(uid, kind, org_id, text, weight) VALUES "
			vals = []interface{}{}
		}
	}
	sqlStr = sqlStr[0 : len(sqlStr)-1]
	sess := db.GetSqlxSession()
	if _, err := sess.Exec(context.Background(), sqlStr, vals...); err != nil {
		b.Fatal(err)
	}
	b.Run("mysql", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			search.Search(context.Background(), NewQuery("world strong*"), 50)
		}
	})
}

func BenchmarkMovieTitles(b *testing.B) {
	run := func(b *testing.B, search Search) {
		b.Helper()
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			if res, err := search.Search(context.Background(), NewQuery("world"), 50); err != nil || len(res) == 0 {
				b.Fatal(res, err)
			}
		}
	}
	b.Run("bluge", func(b *testing.B) {
		search, err := NewBlugeInMemorySearch()
		if err != nil {
			b.Fatal(err)
		}
		run(b, search)
	})
	// b.Run("sqlite", func(b *testing.B) {
	// 	db := db.InitTestDB(b)
	// 	search, err := NewSQLiteSearch(db)
	// 	if err != nil {
	// 		b.Fatal(err)
	// 	}
	// 	run(b, search)
	// })
	b.Run("mysql", func(b *testing.B) {
		os.Setenv("GRAFANA_TEST_DB", "mysql")
		os.Setenv("SKIP_MIGRATIONS", "true")
		db := db.InitTestDB(b)
		search, err := NewMySQLSearch(db)
		if err != nil {
			b.Fatal(err)
		}
		run(b, search)
	})
}

func testSearch(t *testing.T, search Search) {
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
		if err := search.Add(context.Background(), Field{Ref{0, doc.Kind, doc.UID}, doc.Text, doc.Weight}); err != nil {
			t.Fatal(doc, err)
		}
	}
	// Remove a document
	if err := search.Delete(context.Background(), Ref{0, "song", "7"}); err != nil {
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
		{"+old -night", []string{"2", "3"}, false},                               // multiple word "AND"/"NOT" match
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
		res, err := search.Search(context.Background(), NewQuery(test.Query), 50)
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

func TestPostgresSearch(t *testing.T) {
	os.Setenv("GRAFANA_TEST_DB", "postgres")
	os.Setenv("SKIP_MIGRATIONS", "true")
	db := db.InitTestDB(t)
	search, err := NewPostgresSearch(db)
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

func TestSQLiteSearch(t *testing.T) {
	db := db.InitTestDB(t)
	search, err := NewSQLiteSearch(db)
	if err != nil {
		t.Fatal(err)
	}
	testSearch(t, search)
}
