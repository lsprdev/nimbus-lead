package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		records, err := app.FindRecordsByFilter("lead_lists", "", "", 10000, 0)
		if err != nil {
			return err
		}

		for _, record := range records {
			totalFound := record.GetInt("total_found")
			maxResults := record.GetInt("max_results")
			if totalFound <= maxResults {
				continue
			}

			if totalFound > 500 {
				totalFound = 500
			}
			record.Set("max_results", totalFound)
			if err := app.Save(record); err != nil {
				return err
			}
		}

		return nil
	}, func(app core.App) error {
		return nil
	})
}
