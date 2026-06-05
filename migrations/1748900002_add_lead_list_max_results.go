package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("lead_lists")
		if err != nil {
			return err
		}

		if collection.Fields.GetByName("max_results") == nil {
			collection.Fields.Add(&core.NumberField{
				Name:     "max_results",
				OnlyInt:  true,
				Required: true,
				Min:      types.Pointer[float64](1),
				Max:      types.Pointer[float64](500),
			})
			if err := app.Save(collection); err != nil {
				return err
			}
		}

		records, err := app.FindRecordsByFilter("lead_lists", "max_results = 0", "", 10000, 0)
		if err != nil {
			return err
		}
		for _, record := range records {
			maxResults := 30
			if totalFound := record.GetInt("total_found"); totalFound > maxResults {
				maxResults = totalFound
			}
			if maxResults > 500 {
				maxResults = 500
			}

			record.Set("max_results", maxResults)
			if err := app.Save(record); err != nil {
				return err
			}
		}

		return nil
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("lead_lists")
		if err != nil {
			return err
		}

		collection.Fields.RemoveByName("max_results")
		return app.Save(collection)
	})
}
