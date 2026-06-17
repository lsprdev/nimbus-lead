package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("contact_collections")
		if err != nil {
			return err
		}

		if collection.Fields.GetByName("color") == nil {
			collection.Fields.Add(&core.TextField{Name: "color", Max: 20})
			if err := app.Save(collection); err != nil {
				return err
			}
		}

		records, err := app.FindRecordsByFilter("contact_collections", "", "", 10000, 0)
		if err != nil {
			return err
		}
		for _, record := range records {
			if record.GetString("color") != "" {
				continue
			}

			record.Set("color", "#2563eb")
			if err := app.Save(record); err != nil {
				return err
			}
		}

		return nil
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("contact_collections")
		if err != nil {
			return err
		}

		collection.Fields.RemoveByName("color")
		return app.Save(collection)
	})
}
