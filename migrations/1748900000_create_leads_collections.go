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

		leadLists := core.NewBaseCollection("lead_lists")
		ownerRule := types.Pointer("@request.auth.id != '' && user = @request.auth.id")
		leadLists.ListRule = ownerRule
		leadLists.ViewRule = ownerRule
		leadLists.CreateRule = types.Pointer("@request.auth.id != ''")
		leadLists.UpdateRule = ownerRule
		leadLists.DeleteRule = ownerRule
		leadLists.Fields.Add(&core.RelationField{Name: "user", CollectionId: users.Id, Required: true, CascadeDelete: true})
		leadLists.Fields.Add(&core.TextField{Name: "name", Required: true, Max: 180, Presentable: true})
		leadLists.Fields.Add(&core.TextField{Name: "search_term", Required: true, Max: 240})
		leadLists.Fields.Add(&core.TextField{Name: "location", Max: 240})
		leadLists.Fields.Add(&core.SelectField{Name: "status", Required: true, Values: []string{"pending", "running", "completed", "failed"}})
		leadLists.Fields.Add(&core.NumberField{Name: "total_found", OnlyInt: true})
		leadLists.Fields.Add(&core.TextField{Name: "error", Max: 2000})
		leadLists.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		leadLists.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
		leadLists.AddIndex("idx_lead_lists_user_created", false, "user, created", "")

		if err := app.Save(leadLists); err != nil {
			return err
		}

		contacts := core.NewBaseCollection("contacts")
		contacts.ListRule = ownerRule
		contacts.ViewRule = ownerRule
		contacts.CreateRule = ownerRule
		contacts.UpdateRule = ownerRule
		contacts.DeleteRule = ownerRule
		contacts.Fields.Add(&core.RelationField{Name: "user", CollectionId: users.Id, Required: true, CascadeDelete: true})
		contacts.Fields.Add(&core.RelationField{Name: "list", CollectionId: leadLists.Id, Required: true, CascadeDelete: true})
		contacts.Fields.Add(&core.TextField{Name: "name", Required: true, Max: 260, Presentable: true})
		contacts.Fields.Add(&core.TextField{Name: "rating", Max: 40})
		contacts.Fields.Add(&core.TextField{Name: "reviews_count", Max: 40})
		contacts.Fields.Add(&core.TextField{Name: "category", Max: 180})
		contacts.Fields.Add(&core.TextField{Name: "address", Max: 600})
		contacts.Fields.Add(&core.TextField{Name: "phone", Max: 80})
		contacts.Fields.Add(&core.URLField{Name: "website"})
		contacts.Fields.Add(&core.TextField{Name: "hours", Max: 1200})
		contacts.Fields.Add(&core.URLField{Name: "instagram"})
		contacts.Fields.Add(&core.URLField{Name: "facebook"})
		contacts.Fields.Add(&core.URLField{Name: "linkedin"})
		contacts.Fields.Add(&core.NumberField{Name: "latitude"})
		contacts.Fields.Add(&core.NumberField{Name: "longitude"})
		contacts.Fields.Add(&core.URLField{Name: "place_url"})
		contacts.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		contacts.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
		contacts.AddIndex("idx_contacts_list_created", false, "list, created", "")
		contacts.AddIndex("idx_contacts_user_list", false, "user, list", "")

		return app.Save(contacts)
	}, func(app core.App) error {
		if contacts, err := app.FindCollectionByNameOrId("contacts"); err == nil {
			if err := app.Delete(contacts); err != nil {
				return err
			}
		}
		if leadLists, err := app.FindCollectionByNameOrId("lead_lists"); err == nil {
			if err := app.Delete(leadLists); err != nil {
				return err
			}
		}
		return nil
	})
}
