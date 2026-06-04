package migrations

import (
	"log"

	"leads-finder/internal/scraper"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		records, err := app.FindRecordsByFilter(
			"contacts",
			"place_url != ''",
			"",
			10000,
			0,
		)
		if err != nil {
			return err
		}

		updated := 0
		for _, record := range records {
			lat, lng := scraper.ExtractCoordinatesFromURL(record.GetString("place_url"))
			if lat == 0 && lng == 0 {
				continue
			}
			if record.GetFloat("latitude") == lat && record.GetFloat("longitude") == lng {
				continue
			}

			record.Set("latitude", lat)
			record.Set("longitude", lng)
			if err := app.Save(record); err != nil {
				return err
			}
			updated++
		}

		if updated > 0 {
			log.Printf("updated %d contact coordinates from Google Maps place URLs", updated)
		}

		return nil
	}, func(app core.App) error {
		return nil
	})
}
