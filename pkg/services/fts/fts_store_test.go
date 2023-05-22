package fts

import (
	_ "embed"
	"strconv"
	"strings"
)

var (
	//go:embed testdata/movies.txt
	movieTitles string
	//go:embed testdata/dashboards.txt
	dashboardTitles string
	//go:embed testdata/movies.csv
	moviesCSV []byte
	//go:embed testdata/books.csv
	booksCSV []byte
)

func DashboardTitles() []Field {
	fields := []Field{}
	for i, title := range strings.Split(dashboardTitles, "\n") {
		fields = append(fields, Field{Ref: Ref{OrgID: 1, Kind: "dashboard", UID: strconv.Itoa(i)}, Text: title, Weight: 1})
	}
	return fields
}

func MovieTitles() []Field {
	fields := []Field{}
	for i, movie := range strings.Split(movieTitles, "\n") {
		fields = append(fields, Field{Ref: Ref{OrgID: 1, Kind: "movie", UID: strconv.Itoa(i)}, Text: movie, Weight: 1})
	}
	return fields
}
