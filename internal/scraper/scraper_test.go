package scraper

import "testing"

func TestExtractCoordinatesPrefersExactPlaceData(t *testing.T) {
	rawURL := "https://www.google.com/maps/place/Foo/@-23.55,-46.63,14z/data=!3m1!4b1!4m6!3m5!1sabc!8m2!3d-23.56123!4d-46.65432"

	lat, lng := extractCoordinates(rawURL)

	if lat != -23.56123 || lng != -46.65432 {
		t.Fatalf("expected exact place coordinates, got %f,%f", lat, lng)
	}
}

func TestExtractCoordinatesSupportsLngLatDataOrder(t *testing.T) {
	rawURL := "https://www.google.com/maps/place/Foo/data=!4m2!2d-46.65432!3d-23.56123"

	lat, lng := extractCoordinates(rawURL)

	if lat != -23.56123 || lng != -46.65432 {
		t.Fatalf("expected converted coordinates, got %f,%f", lat, lng)
	}
}

func TestExtractCoordinatesFallsBackToViewportCenter(t *testing.T) {
	rawURL := "https://www.google.com/maps/place/Foo/@-23.55,-46.63,14z"

	lat, lng := extractCoordinates(rawURL)

	if lat != -23.55 || lng != -46.63 {
		t.Fatalf("expected fallback coordinates, got %f,%f", lat, lng)
	}
}

func TestNormalizeResultURLRemovesVolatileParts(t *testing.T) {
	rawURL := "https://www.google.com/maps/place/Foo/@-23.55,-46.63,14z/data=!3m1!4b1?entry=ttu&g_ep=abc#details"

	got := normalizeResultURL(rawURL)
	want := "https://www.google.com/maps/place/Foo/@-23.55,-46.63,14z/data=!3m1!4b1"

	if got != want {
		t.Fatalf("expected normalized URL %q, got %q", want, got)
	}
}

func TestNormalizeDetailConcurrency(t *testing.T) {
	tests := []struct {
		name  string
		value int
		want  int
	}{
		{name: "default", value: 0, want: 3},
		{name: "negative", value: -1, want: 3},
		{name: "explicit", value: 2, want: 2},
		{name: "capped", value: 20, want: 6},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := normalizeDetailConcurrency(tt.value); got != tt.want {
				t.Fatalf("expected %d, got %d", tt.want, got)
			}
		})
	}
}

func TestDetailConcurrencyDoesNotExceedResultCount(t *testing.T) {
	s := &Scraper{config: Config{DetailConcurrency: 4}}

	if got := s.detailConcurrency(2); got != 2 {
		t.Fatalf("expected concurrency to match result count, got %d", got)
	}
}
