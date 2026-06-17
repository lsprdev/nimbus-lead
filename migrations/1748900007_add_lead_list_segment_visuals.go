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

		changed := false
		if collection.Fields.GetByName("segment_icon") == nil {
			collection.Fields.Add(&core.TextField{Name: "segment_icon", Max: 40})
			changed = true
		}
		if collection.Fields.GetByName("segment_color") == nil {
			collection.Fields.Add(&core.TextField{Name: "segment_color", Max: 40})
			changed = true
		}
		if collection.Fields.GetByName("segment_pinned") == nil {
			collection.Fields.Add(&core.BoolField{Name: "segment_pinned"})
			changed = true
		}
		if changed {
			if err := app.Save(collection); err != nil {
				return err
			}
		}

		records, err := app.FindRecordsByFilter("lead_lists", "", "", 10000, 0)
		if err != nil {
			return err
		}
		for _, record := range records {
			needsSave := false
			if record.GetString("segment_icon") == "" {
				record.Set("segment_icon", "smartphone")
				needsSave = true
			}
			if record.GetString("segment_color") == "" {
				record.Set("segment_color", "blue")
				needsSave = true
			}
			if needsSave {
				if err := app.Save(record); err != nil {
					return err
				}
			}
		}

		return nil
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("lead_lists")
		if err != nil {
			return err
		}

		collection.Fields.RemoveByName("segment_icon")
		collection.Fields.RemoveByName("segment_color")
		collection.Fields.RemoveByName("segment_pinned")
		return app.Save(collection)
	})
}
