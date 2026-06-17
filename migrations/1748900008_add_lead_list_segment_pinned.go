package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("lead_lists")
		if err != nil {
			return err
		}

		if collection.Fields.GetByName("segment_pinned") != nil {
			return nil
		}

		collection.Fields.Add(&core.BoolField{Name: "segment_pinned"})
		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("lead_lists")
		if err != nil {
			return err
		}

		collection.Fields.RemoveByName("segment_pinned")
		return app.Save(collection)
	})
}
