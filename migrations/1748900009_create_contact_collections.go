package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		contacts, err := app.FindCollectionByNameOrId("contacts")
		if err != nil {
			return err
		}

		ownerRule := types.Pointer("@request.auth.id != '' && user = @request.auth.id")

		collections := core.NewBaseCollection("contact_collections")
		collections.ListRule = ownerRule
		collections.ViewRule = ownerRule
		collections.CreateRule = types.Pointer("@request.auth.id != ''")
		collections.UpdateRule = ownerRule
		collections.DeleteRule = ownerRule
		collections.Fields.Add(&core.RelationField{Name: "user", CollectionId: users.Id, Required: true, CascadeDelete: true})
		collections.Fields.Add(&core.TextField{Name: "name", Required: true, Max: 180, Presentable: true})
		collections.Fields.Add(&core.TextField{Name: "color", Max: 20})
		collections.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		collections.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
		collections.AddIndex("idx_contact_collections_user_created", false, "user, created", "")
		collections.AddIndex("idx_contact_collections_user_name", true, "user, name", "")

		if err := app.Save(collections); err != nil {
			return err
		}

		items := core.NewBaseCollection("contact_collection_items")
		items.ListRule = ownerRule
		items.ViewRule = ownerRule
		items.CreateRule = types.Pointer("@request.auth.id != ''")
		items.UpdateRule = ownerRule
		items.DeleteRule = ownerRule
		items.Fields.Add(&core.RelationField{Name: "user", CollectionId: users.Id, Required: true, CascadeDelete: true})
		items.Fields.Add(&core.RelationField{Name: "collection", CollectionId: collections.Id, Required: true, CascadeDelete: true})
		items.Fields.Add(&core.RelationField{Name: "contact", CollectionId: contacts.Id, Required: true, CascadeDelete: true})
		items.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		items.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
		items.AddIndex("idx_contact_collection_items_user_collection", false, "user, collection", "")
		items.AddIndex("idx_contact_collection_items_unique_contact", true, "collection, contact", "")

		return app.Save(items)
	}, func(app core.App) error {
		if items, err := app.FindCollectionByNameOrId("contact_collection_items"); err == nil {
			if err := app.Delete(items); err != nil {
				return err
			}
		}
		if collections, err := app.FindCollectionByNameOrId("contact_collections"); err == nil {
			if err := app.Delete(collections); err != nil {
				return err
			}
		}
		return nil
	})
}
