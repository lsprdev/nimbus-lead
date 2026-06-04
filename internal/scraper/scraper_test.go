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
