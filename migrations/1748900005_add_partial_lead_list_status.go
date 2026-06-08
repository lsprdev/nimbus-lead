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

		field := collection.Fields.GetByName("status")
		selectField, ok := field.(*core.SelectField)
		if !ok || selectField == nil {
			return nil
		}

		if !hasSelectValue(selectField.Values, "partial") {
			selectField.Values = append(selectField.Values, "partial")
			return app.Save(collection)
		}

		return nil
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("lead_lists")
		if err != nil {
			return err
		}

		records, err := app.FindRecordsByFilter("lead_lists", "status = 'partial'", "", 10000, 0)
		if err != nil {
			return err
		}
		for _, record := range records {
			record.Set("status", "completed")
			if err := app.Save(record); err != nil {
				return err
			}
		}

		field := collection.Fields.GetByName("status")
		selectField, ok := field.(*core.SelectField)
		if !ok || selectField == nil {
			return nil
		}

		values := make([]string, 0, len(selectField.Values))
		for _, value := range selectField.Values {
			if value != "partial" {
				values = append(values, value)
			}
		}
		selectField.Values = values

		return app.Save(collection)
	})
}
