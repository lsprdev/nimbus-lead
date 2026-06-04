package backend

import (
	"context"
	"errors"
	"log"
	"strings"
	"time"

	"leads-finder/internal/scraper"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

const (
	collectionLeadLists = "lead_lists"
	collectionContacts  = "contacts"
)

type createListRequest struct {
	Name       string `json:"name"`
	SearchTerm string `json:"searchTerm"`
	Location   string `json:"location"`
}

func Register(app core.App) {
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		e.Router.POST("/api/lead-lists", createLeadList(app)).Bind(apis.RequireAuth("users"))
		e.Router.GET("/api/lead-lists", listLeadLists(app)).Bind(apis.RequireAuth("users"))
		e.Router.GET("/api/lead-lists/{id}", getLeadList(app)).Bind(apis.RequireAuth("users"))
		e.Router.GET("/api/lead-lists/{id}/contacts", listContacts(app)).Bind(apis.RequireAuth("users"))

		return e.Next()
	})
}

func createLeadList(app core.App) func(*core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		var payload createListRequest
		if err := e.BindBody(&payload); err != nil {
			return e.BadRequestError("Invalid request body.", err)
		}

		payload.Name = strings.TrimSpace(payload.Name)
		payload.SearchTerm = strings.TrimSpace(payload.SearchTerm)
		payload.Location = strings.TrimSpace(payload.Location)

		if payload.Name == "" || payload.SearchTerm == "" {
			return e.BadRequestError("Name and searchTerm are required.", nil)
		}

		collection, err := app.FindCollectionByNameOrId(collectionLeadLists)
		if err != nil {
			return e.InternalServerError("lead_lists collection not found.", err)
		}

		record := core.NewRecord(collection)
		record.Set("user", e.Auth.Id)
		record.Set("name", payload.Name)
		record.Set("search_term", payload.SearchTerm)
		record.Set("location", payload.Location)
		record.Set("status", "running")
		record.Set("total_found", 0)

		if err := app.Save(record); err != nil {
			return e.InternalServerError("Could not create lead list.", err)
		}

		go runSearchJob(app, record.Id, e.Auth.Id, payload.SearchTerm, payload.Location)

		return e.JSON(201, record)
	}
}

func listLeadLists(app core.App) func(*core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		records, err := app.FindRecordsByFilter(
			collectionLeadLists,
			"user={:user}",
			"-created",
			100,
			0,
			dbx.Params{"user": e.Auth.Id},
		)
		if err != nil {
			return e.InternalServerError("Could not list lead lists.", err)
		}

		return e.JSON(200, records)
	}
}

func getLeadList(app core.App) func(*core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		record, err := findOwnedRecord(app, collectionLeadLists, e.Request.PathValue("id"), e.Auth.Id)
		if err != nil {
			return e.NotFoundError("Lead list not found.", err)
		}

		return e.JSON(200, record)
	}
}

func listContacts(app core.App) func(*core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		listId := e.Request.PathValue("id")
		if _, err := findOwnedRecord(app, collectionLeadLists, listId, e.Auth.Id); err != nil {
			return e.NotFoundError("Lead list not found.", err)
		}

		records, err := app.FindRecordsByFilter(
			collectionContacts,
			"user={:user} && list={:list}",
			"created",
			500,
			0,
			dbx.Params{"user": e.Auth.Id, "list": listId},
		)
		if err != nil {
			return e.InternalServerError("Could not list contacts.", err)
		}

		return e.JSON(200, records)
	}
}

func runSearchJob(app core.App, listId, userId, searchTerm, location string) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Minute)
	defer cancel()

	s := scraper.NewFromEnv()
	err := s.Search(ctx, searchTerm, location, func(lead scraper.Lead) error {
		if err := saveContact(app, listId, userId, lead); err != nil {
			return err
		}
		return incrementListTotal(app, listId)
	})

	if err != nil {
		log.Printf("lead list %s failed: %v", listId, err)
		if updateErr := updateListStatus(app, listId, "failed", err.Error()); updateErr != nil {
			log.Printf("update failed status for %s: %v", listId, updateErr)
		}
		return
	}

	if err := updateListStatus(app, listId, "completed", ""); err != nil {
		log.Printf("update completed status for %s: %v", listId, err)
	}
}

func saveContact(app core.App, listId, userId string, lead scraper.Lead) error {
	collection, err := app.FindCollectionByNameOrId(collectionContacts)
	if err != nil {
		return err
	}

	record := core.NewRecord(collection)
	record.Set("user", userId)
	record.Set("list", listId)
	record.Set("name", lead.Name)
	record.Set("rating", lead.Rating)
	record.Set("reviews_count", lead.ReviewsCount)
	record.Set("category", lead.Category)
	record.Set("address", lead.Address)
	record.Set("phone", lead.Phone)
	record.Set("website", lead.Website)
	record.Set("hours", lead.Hours)
	record.Set("instagram", lead.Instagram)
	record.Set("facebook", lead.Facebook)
	record.Set("linkedin", lead.Linkedin)
	record.Set("latitude", lead.Latitude)
	record.Set("longitude", lead.Longitude)
	record.Set("place_url", lead.PlaceURL)

	return app.Save(record)
}

func incrementListTotal(app core.App, listId string) error {
	record, err := app.FindRecordById(collectionLeadLists, listId)
	if err != nil {
		return err
	}
	record.Set("total_found+", 1)
	return app.Save(record)
}

func updateListStatus(app core.App, listId, status, message string) error {
	record, err := app.FindRecordById(collectionLeadLists, listId)
	if err != nil {
		return err
	}
	record.Set("status", status)
	record.Set("error", message)
	return app.Save(record)
}

func findOwnedRecord(app core.App, collectionName, id, userId string) (*core.Record, error) {
	if id == "" {
		return nil, errors.New("missing id")
	}

	return app.FindFirstRecordByFilter(
		collectionName,
		"id={:id} && user={:user}",
		dbx.Params{"id": id, "user": userId},
	)
}
