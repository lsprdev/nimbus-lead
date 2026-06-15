package backend

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"leads-finder/internal/scraper"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

const (
	collectionLeadLists = "lead_lists"
	collectionContacts  = "contacts"
	statusPending       = "pending"
	statusRunning       = "running"
	statusPaused        = "paused"
	statusCompleted     = "completed"
	statusPartial       = "partial"
	statusFailed        = "failed"
	defaultMaxResults   = 30
	minMaxResults       = 1
	maxMaxResults       = 500
)

var (
	errSearchPaused      = errors.New("search paused")
	errMaxResultsReached = errors.New("max results reached")
)

type searchJob struct {
	ListId     string
	UserId     string
	SearchTerm string
	Location   string
	MaxResults int
}

type searchJobManager struct {
	app     core.App
	jobs    chan searchJob
	queued  sync.Map
	running sync.Map
	paused  sync.Map
	once    sync.Once
}

type createListRequest struct {
	Name       string `json:"name"`
	SearchTerm string `json:"searchTerm"`
	Location   string `json:"location"`
	MaxResults int    `json:"maxResults"`
}

func Register(app core.App) {
	manager := newSearchJobManager(app)

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		e.Router.POST("/api/lead-lists", createLeadList(app, manager)).Bind(apis.RequireAuth("users"))
		e.Router.GET("/api/lead-lists", listLeadLists(app)).Bind(apis.RequireAuth("users"))
		e.Router.GET("/api/lead-segments/contacts", listSegmentContacts(app)).Bind(apis.RequireAuth("users"))
		e.Router.GET("/api/lead-lists/{id}", getLeadList(app)).Bind(apis.RequireAuth("users"))
		e.Router.GET("/api/lead-lists/{id}/contacts", listContacts(app)).Bind(apis.RequireAuth("users"))
		e.Router.POST("/api/lead-lists/{id}/pause", pauseLeadList(app, manager)).Bind(apis.RequireAuth("users"))
		e.Router.POST("/api/lead-lists/{id}/resume", resumeLeadList(app, manager)).Bind(apis.RequireAuth("users"))
		e.Router.DELETE("/api/lead-lists/{id}", deleteLeadList(app, manager)).Bind(apis.RequireAuth("users"))

		manager.start()
		manager.enqueueRecoverableJobs()

		return e.Next()
	})
}

func newSearchJobManager(app core.App) *searchJobManager {
	return &searchJobManager{
		app:  app,
		jobs: make(chan searchJob, 100),
	}
}

func (m *searchJobManager) start() {
	m.once.Do(func() {
		workerCount := scraperConcurrency()
		for i := 0; i < workerCount; i++ {
			go m.worker(i + 1)
		}
		log.Printf("scraper worker pool started with %d worker(s)", workerCount)
	})
}

func (m *searchJobManager) worker(workerId int) {
	for job := range m.jobs {
		m.queued.Delete(job.ListId)

		record, err := m.app.FindRecordById(collectionLeadLists, job.ListId)
		if err != nil {
			log.Printf("worker %d skipped missing lead list %s: %v", workerId, job.ListId, err)
			continue
		}
		if record.GetString("status") == statusPaused || m.isPaused(job.ListId) {
			continue
		}

		m.running.Store(job.ListId, struct{}{})
		runSearchJob(m.app, job.ListId, job.UserId, job.SearchTerm, job.Location, job.MaxResults, func() bool {
			return m.isPaused(job.ListId)
		})
		m.running.Delete(job.ListId)
	}
}

func (m *searchJobManager) enqueue(job searchJob) {
	if job.ListId == "" {
		return
	}
	if _, ok := m.running.Load(job.ListId); ok {
		return
	}
	if _, loaded := m.queued.LoadOrStore(job.ListId, struct{}{}); loaded {
		return
	}

	select {
	case m.jobs <- job:
	default:
		m.queued.Delete(job.ListId)
		log.Printf("scraper job queue is full; list %s was not enqueued", job.ListId)
	}
}

func (m *searchJobManager) markPaused(listId string) {
	m.paused.Store(listId, struct{}{})
}

func (m *searchJobManager) markResumed(listId string) {
	m.paused.Delete(listId)
}

func (m *searchJobManager) isPaused(listId string) bool {
	_, ok := m.paused.Load(listId)
	return ok
}

func (m *searchJobManager) enqueueRecoverableJobs() {
	records, err := m.app.FindRecordsByFilter(
		collectionLeadLists,
		"status = 'pending' || status = 'running'",
		"created",
		500,
		0,
	)
	if err != nil {
		log.Printf("recover scraper jobs failed: %v", err)
		return
	}

	for _, record := range records {
		m.enqueue(searchJobFromRecord(record))
	}
}

func searchJobFromRecord(record *core.Record) searchJob {
	return searchJob{
		ListId:     record.Id,
		UserId:     record.GetString("user"),
		SearchTerm: record.GetString("search_term"),
		Location:   record.GetString("location"),
		MaxResults: normalizeMaxResults(record.GetInt("max_results")),
	}
}

func scraperConcurrency() int {
	value, _ := strconv.Atoi(os.Getenv("SCRAPER_CONCURRENCY"))
	if value <= 0 {
		return 1
	}
	if value > 10 {
		return 10
	}
	return value
}

func createLeadList(app core.App, manager *searchJobManager) func(*core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		var payload createListRequest
		if err := e.BindBody(&payload); err != nil {
			return e.BadRequestError("Invalid request body.", err)
		}

		payload.Name = strings.TrimSpace(payload.Name)
		payload.SearchTerm = strings.TrimSpace(payload.SearchTerm)
		payload.Location = strings.TrimSpace(payload.Location)
		payload.MaxResults = normalizeMaxResults(payload.MaxResults)

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
		record.Set("max_results", payload.MaxResults)
		record.Set("status", statusPending)
		record.Set("total_found", 0)

		if err := app.Save(record); err != nil {
			return e.InternalServerError("Could not create lead list.", err)
		}

		manager.enqueue(searchJob{
			ListId:     record.Id,
			UserId:     e.Auth.Id,
			SearchTerm: payload.SearchTerm,
			Location:   payload.Location,
			MaxResults: payload.MaxResults,
		})

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

func listSegmentContacts(app core.App) func(*core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		listIds := parseListIds(e.Request.URL.Query().Get("lists"))
		if len(listIds) == 0 {
			return e.BadRequestError("At least one list id is required.", nil)
		}
		if len(listIds) > 100 {
			return e.BadRequestError("Too many lists requested.", nil)
		}

		lists := make([]*core.Record, 0, len(listIds))
		contacts := make([]*core.Record, 0)
		for _, listId := range listIds {
			list, err := findOwnedRecord(app, collectionLeadLists, listId, e.Auth.Id)
			if err != nil {
				continue
			}

			records, err := app.FindRecordsByFilter(
				collectionContacts,
				"user={:user} && list={:list}",
				"created",
				maxMaxResults,
				0,
				dbx.Params{"user": e.Auth.Id, "list": listId},
			)
			if err != nil {
				return e.InternalServerError("Could not list segment contacts.", err)
			}

			lists = append(lists, list)
			contacts = append(contacts, records...)
		}

		if len(lists) == 0 {
			return e.NotFoundError("Segment not found.", nil)
		}

		return e.JSON(200, map[string]any{
			"lists":    lists,
			"contacts": contacts,
		})
	}
}

func parseListIds(value string) []string {
	seen := make(map[string]struct{})
	ids := make([]string, 0)
	for _, part := range strings.Split(value, ",") {
		id := strings.TrimSpace(part)
		if id == "" {
			continue
		}
		if _, exists := seen[id]; exists {
			continue
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}
	return ids
}

func pauseLeadList(app core.App, manager *searchJobManager) func(*core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		record, err := findOwnedRecord(app, collectionLeadLists, e.Request.PathValue("id"), e.Auth.Id)
		if err != nil {
			return e.NotFoundError("Lead list not found.", err)
		}

		status := record.GetString("status")
		if status != statusPending && status != statusRunning {
			return e.BadRequestError("Only pending or running lists can be paused.", nil)
		}

		manager.markPaused(record.Id)
		record.Set("status", statusPaused)
		record.Set("error", "")
		if err := app.Save(record); err != nil {
			manager.markResumed(record.Id)
			return e.InternalServerError("Could not pause lead list.", err)
		}

		return e.JSON(200, record)
	}
}

func resumeLeadList(app core.App, manager *searchJobManager) func(*core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		record, err := findOwnedRecord(app, collectionLeadLists, e.Request.PathValue("id"), e.Auth.Id)
		if err != nil {
			return e.NotFoundError("Lead list not found.", err)
		}

		if record.GetString("status") != statusPaused {
			return e.BadRequestError("Only paused lists can be resumed.", nil)
		}

		record.Set("status", statusPending)
		record.Set("error", "")
		if err := app.Save(record); err != nil {
			return e.InternalServerError("Could not resume lead list.", err)
		}

		manager.markResumed(record.Id)
		manager.enqueue(searchJobFromRecord(record))

		return e.JSON(200, record)
	}
}

func deleteLeadList(app core.App, manager *searchJobManager) func(*core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		record, err := findOwnedRecord(app, collectionLeadLists, e.Request.PathValue("id"), e.Auth.Id)
		if err != nil {
			return e.NotFoundError("Lead list not found.", err)
		}

		manager.markPaused(record.Id)
		manager.queued.Delete(record.Id)
		if err := app.Delete(record); err != nil {
			manager.markResumed(record.Id)
			return e.InternalServerError("Could not delete lead list.", err)
		}

		return e.NoContent(http.StatusNoContent)
	}
}

func runSearchJob(app core.App, listId, userId, searchTerm, location string, maxResults int, isPaused func() bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Minute)
	defer cancel()

	if isPaused != nil && isPaused() {
		return
	}
	if err := updateListStatus(app, listId, statusRunning, ""); err != nil {
		log.Printf("update running status for %s: %v", listId, err)
		return
	}
	if isPaused != nil && isPaused() {
		if err := updateListStatus(app, listId, statusPaused, ""); err != nil {
			log.Printf("restore paused status for %s: %v", listId, err)
		}
		return
	}

	s := scraper.NewFromEnv()
	requestedTotal := normalizeMaxResults(maxResults)
	s.SetMaxResults(requestedTotal)
	totalSaved, totalErr := listTotalFound(app, listId)
	if totalErr != nil {
		log.Printf("read initial total for %s: %v", listId, totalErr)
		totalSaved = 0
	}
	err := s.SearchWithControl(ctx, searchTerm, location, func() error {
		return ensureSearchIsActive(app, listId, isPaused)
	}, func(lead scraper.Lead) error {
		if totalSaved >= requestedTotal {
			return errMaxResultsReached
		}
		created, err := saveContact(app, listId, userId, lead)
		if err != nil {
			return err
		}
		if created {
			totalSaved++
			if err := incrementListTotal(app, listId); err != nil {
				return err
			}
			if totalSaved >= requestedTotal {
				return errMaxResultsReached
			}
		}
		return nil
	})

	if err != nil {
		if errors.Is(err, errSearchPaused) {
			return
		}
		if errors.Is(err, errMaxResultsReached) {
			err = nil
		}
	}
	if err != nil {
		log.Printf("lead list %s failed: %v", listId, err)
		if updateErr := updateListStatus(app, listId, statusFailed, err.Error()); updateErr != nil {
			log.Printf("update failed status for %s: %v", listId, updateErr)
		}
		return
	}

	totalFound, totalErr := listTotalFound(app, listId)
	if totalErr != nil {
		log.Printf("read final total for %s: %v", listId, totalErr)
		totalFound = totalSaved
	}
	status, message := completionStatus(totalFound, normalizeMaxResults(maxResults))
	if err := updateListStatus(app, listId, status, message); err != nil {
		log.Printf("update %s status for %s: %v", status, listId, err)
	}
}

func ensureSearchIsActive(app core.App, listId string, isPaused func() bool) error {
	if isPaused != nil && isPaused() {
		return errSearchPaused
	}
	record, err := app.FindRecordById(collectionLeadLists, listId)
	if err != nil {
		return err
	}
	if record.GetString("status") == statusPaused {
		return errSearchPaused
	}
	return nil
}

func completionStatus(totalFound, requestedTotal int) (string, string) {
	if totalFound >= requestedTotal {
		return statusCompleted, ""
	}

	return statusPartial, "Busca encerrada com " + strconv.Itoa(totalFound) + " de " + strconv.Itoa(requestedTotal) + " contatos solicitados."
}

func normalizeMaxResults(maxResults int) int {
	if maxResults == 0 {
		return defaultMaxResults
	}
	if maxResults < minMaxResults {
		return minMaxResults
	}
	if maxResults > maxMaxResults {
		return maxMaxResults
	}
	return maxResults
}

func saveContact(app core.App, listId, userId string, lead scraper.Lead) (bool, error) {
	collection, err := app.FindCollectionByNameOrId(collectionContacts)
	if err != nil {
		return false, err
	}

	exists, err := contactExists(app, listId, lead)
	if err != nil {
		return false, err
	}
	if exists {
		return false, nil
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

	return true, app.Save(record)
}

func contactExists(app core.App, listId string, lead scraper.Lead) (bool, error) {
	if strings.TrimSpace(lead.PlaceURL) != "" {
		records, err := app.FindRecordsByFilter(
			collectionContacts,
			"list={:list} && place_url={:placeURL}",
			"",
			1,
			0,
			dbx.Params{"list": listId, "placeURL": lead.PlaceURL},
		)
		if err != nil {
			return false, err
		}
		if len(records) > 0 {
			return true, nil
		}
	}

	name := strings.TrimSpace(lead.Name)
	address := strings.TrimSpace(lead.Address)
	if name == "" || address == "" {
		return false, nil
	}

	records, err := app.FindRecordsByFilter(
		collectionContacts,
		"list={:list} && name={:name} && address={:address}",
		"",
		1,
		0,
		dbx.Params{"list": listId, "name": name, "address": address},
	)
	if err != nil {
		return false, err
	}
	return len(records) > 0, nil
}

func incrementListTotal(app core.App, listId string) error {
	record, err := app.FindRecordById(collectionLeadLists, listId)
	if err != nil {
		return err
	}
	record.Set("total_found+", 1)
	return app.Save(record)
}

func listTotalFound(app core.App, listId string) (int, error) {
	record, err := app.FindRecordById(collectionLeadLists, listId)
	if err != nil {
		return 0, err
	}
	return record.GetInt("total_found"), nil
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
