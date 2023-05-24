package fts

import (
	"context"
	"testing"
)

var books = []string{
	"Pride and Prejudice by Jane Austen (1813)",
	"To Kill a Mockingbird by Harper Lee (1960)",
	"The Great Gatsby by F. Scott Fitzgerald (1925)",
	"One Hundred Years of Solitude by Gabriel García Márquez (1967)",
	"In Cold Blood by Truman Capote (1965)",
	"Wide Sargasso Sea by Jean Rhys (1966)",
	"Brave New World by Aldous Huxley (1932)",
	"I Capture The Castle by Dodie Smith (1948)",
	"Jane Eyre by Charlotte Bronte (1847)",
	"Crime and Punishment by Fyodor Dostoevsky (1866)",
	"The Secret History by Donna Tartt (1992)",
	"The Call of the Wild by Jack London (1903)",
	"The Chrysalids by John Wyndham (1955)",
	"Persuasion by Jane Austen (1818)",
	"Moby-Dick by Herman Melville (1851)",
	"The Lion, the Witch and the Wardrobe by C.S. Lewis (1950)",
	"To the Lighthouse by Virginia Woolf (1927)",
	"The Death of the Heart by Elizabeth Bowen (1938)",
	"Tess of the d'Urbervilles by Thomas Hardy (1891)",
	"Frankenstein by Mary Shelley (1823)",
	"The Master and Margarita by Mikhail Bulgakov (1966)",
	"The Go-Between by L. P. Hartley (1953)",
	"One Flew Over the Cuckoo's Nest by Ken Kesey (1962)",
	"Nineteen Eighty-Four by George Orwell (1949)",
	"Buddenbrooks by Thomas Mann (1901)",
	"The Grapes of Wrath by John Steinbeck (1939)",
	"Beloved by Toni Morrison (1987)",
	"The Code of the Woosters by P. G. Wodehouse (1938)",
	"Dracula by Bram Stoker (1897)",
	"The Lord of the Rings by J. R. R. Tolkien (1954)",
	"The Adventures of Huckleberry Finn by Mark Twain (1884)",
	"Great Expectations by Charles Dickens (1860)",
	"Catch-22 by Joseph Heller (1961)",
	"The Age of Innocence by Edith Wharton (1920)",
	"Things Fall Apart by Chinua Achebe (1958)",
	"Middlemarch by George Eliot (1871)",
	"Midnight's Children by Salman Rushdie (1981)",
	"The Iliad by Homer (8th century BC)",
	"Vanity Fair by William Makepeace Thackeray (1847)",
	"Brideshead Revisited by Evelyn Waugh (1945)",
	"The Catcher in the Rye by J.D. Salinger (1951)",
	"Alice's Adventures in Wonderland by Lewis Carroll (1865)",
	"The Mill on the Floss by George Eliot (1860)",
	"Barchester Towers by Anthony Trollope (1857)",
	"Another Country by James Baldwin (1962)",
	"Les Miserables by Victor Hugo (1862)",
	"Charlie and the Chocolate Factory by Roald Dahl (1964)",
	"The Outsiders by S. E. Hinton (1967)",
	"The Count of Monte Cristo by Alexandre Dumas (1844)",
	"Ulysses by James Joyce (1922)",
	"East of Eden by John Steinbeck (1952)",
	"The Brothers Karamazov by Fyodor Dostoyevsky (1880)",
	"Lolita by Vladimir Nabokov (1955)",
	"The Secret Garden by Frances Hodgson Burnett (1911)",
	"Scoop by Evelyn Waugh (1938)",
	"A Tale of Two Cities by Charles Dickens (1859)",
	"Diary of a Nobody by George Grossmith and Weedon Grossmith (1892)",
	"Anna Karenina by Leo Tolstoy (1878)",
	"The Betrothed by Alessandro Manzoni (1827)",
	"Orlando by Virginia Woolf (1928)",
	"Atlas Shrugged by Ayn Rand (1957)",
	"The Time Machine by H. G. Wells (1895)",
	"The Art of War by Sun-Tzu",
	"The Forsyte Saga by John Galsworthy (1922)",
	"Travels with Charley by John Steinbeck (1962)",
	"Tropic of Cancer by Henry Miller (1934)",
	"Women in Love by D. H. Lawrence (1920)",
	"Staying On by Paul Scott (1977)",
	"The Wind in the Willows by Kenneth Grahame (1908)",
	"My Ántonia by Willa Cather (1918)",
	"Wuthering Heights by Emily Brontë (1847)",
	"Perfume by Patrick Süskind (1985)",
	"War and Peace by Leo Tolstoy (1867)",
	"Of Human Bondage by Somerset Maugham (1915)",
	"Bleak House by Charles Dickens (1853)",
	"Lost Illusions by Honoré de Balzac (1837)",
	"Breakfast of Champions by Kurt Vonnegut (1973)",
	"A Christmas Carol by Charles Dickens (1843)",
	"Silas Marner by George Eliot (1861)",
	"Mrs Dalloway by Virginia Woolf (1925)",
	"Little Women by Louisa May Alcott (1868)",
	"The Sea, The Sea by Iris Murdoch (1978)",
	"The Godfather by Mario Puzo (1969)",
	"The Castle by Franz Kafka (1926)",
	"I, Claudius by Robert Graves (1934)",
	"Peter Pan by J.M. Barrie (1904)",
	"A Confederacy of Dunces by John Kennedy Toole (1980)",
	"The Razor's Edge by W. Somerset Maugham (1944)",
	"Lark Rise to Candleford by Flora Thompson (1939)",
	"The Return of the Native by Thomas Hardy (1878)",
	"A Portrait of the Artist as a Young Man by James Joyce (1916)",
	"Heart of Darkness by Joseph Conrad (1902)",
	"North and South by Elizabeth Gaskell (1854)",
	"The Handmaid's Tale by Margaret Atwood (1985)",
	"Suite Francaise by Irene Nemirovsky (2004)",
	"One Day in the Life of Ivan Denisovich by Alexander Solzhenitsyn (1962)",
	"What A Carve Up! by Jonathan Coe (1994)",
	"Zen and the Art of Motorcycle Maintenance by Robert Pirsig (1974)",
	"White Nights by Fyodor Dostoyevsky (1848)",
	"Hard Times by Charles Dickens (1854)",
}

func TestSimpleSearch(t *testing.T) {
	search, err := NewBlugeInMemorySearch()
	if err != nil {
		t.Fatal(err)
	}
	for _, b := range books {
		if err := search.Add(context.Background(), Field{Ref{0, "book", b}, b, 1}); err != nil {
			t.Fatal(err)
		}
	}

	// "There are two novels that can change a bookish fourteen-year old’s life:
	// The Lord of the Rings and Atlas Shrugged. One is a childish fantasy that
	// often engenders a lifelong obsession with its unbelievable heroes,
	// leading to an emotionally stunted, socially crippled adulthood, unable to
	// deal with the real world. The other, of course, involves orcs."
	if err := search.Delete(context.Background(), Ref{0, "book", "Atlas Shrugged by Ayn Rand (1957)"}); err != nil {
		t.Fatal(err)
	}

	// Delete
	for _, test := range []struct {
		Query   string
		Matches []string
	}{
		{"day", []string{"One Day in the Life of Ivan Denisovich by Alexander Solzhenitsyn (1962)"}},
		{"sea", []string{"The Sea, The Sea by Iris Murdoch (1978)", "Wide Sargasso Sea by Jean Rhys (1966)"}},
		{"count*", []string{"Another Country by James Baldwin (1962)", "The Count of Monte Cristo by Alexandre Dumas (1844)"}},
		{"1938", []string{"Scoop by Evelyn Waugh (1938)", "The Death of the Heart by Elizabeth Bowen (1938)", "The Code of the Woosters by P. G. Wodehouse (1938)"}},
		{"atlas", nil}, // Atlas ¯\_(ツ)_/¯
		// TODO: make "bronte" find all of the Bront[eë]s
	} {
		res, err := search.Search(context.Background(), NewQuery(test.Query), 50)
		if err != nil {
			t.Fatal(err)
		}
		if len(test.Matches) != len(res) {
			t.Fatal(res, test.Matches)
		}
		for i, m := range test.Matches {
			if res[i].UID != m {
				t.Fatal(res, test.Matches)
			}
		}
	}
}
