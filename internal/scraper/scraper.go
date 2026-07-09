package scraper

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/mxschmitt/playwright-go"
)

type Lead struct {
	Name         string  `json:"name"`
	Rating       string  `json:"rating"`
	ReviewsCount string  `json:"reviews_count"`
	Category     string  `json:"category"`
	Address      string  `json:"address"`
	Phone        string  `json:"phone"`
	Website      string  `json:"website"`
	Hours        string  `json:"hours"`
	Instagram    string  `json:"instagram"`
	Facebook     string  `json:"facebook"`
	Linkedin     string  `json:"linkedin"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	PlaceURL     string  `json:"place_url"`
}

type Config struct {
	Headless          bool
	Timeout           float64
	MaxResults        int
	DetailConcurrency int
}

type Scraper struct {
	config Config
}

func NewFromEnv() *Scraper {
	headless := true
	if strings.ToLower(os.Getenv("HEADLESS")) == "false" {
		headless = false
	}

	timeout, _ := strconv.ParseFloat(os.Getenv("TIMEOUT"), 64)
	if timeout == 0 {
		timeout = 30000
	}

	maxResults, _ := strconv.Atoi(os.Getenv("MAX_RESULTS"))
	if maxResults == 0 {
		maxResults = 60
	}

	detailConcurrency, _ := strconv.Atoi(os.Getenv("SCRAPER_DETAIL_CONCURRENCY"))

	return &Scraper{
		config: Config{
			Headless:          headless,
			Timeout:           timeout,
			MaxResults:        maxResults,
			DetailConcurrency: normalizeDetailConcurrency(detailConcurrency),
		},
	}
}

func (s *Scraper) SetMaxResults(maxResults int) {
	if maxResults > 0 {
		s.config.MaxResults = maxResults
	}
}

func (s *Scraper) Search(ctx context.Context, searchTerm, location string, onLead func(Lead) error) error {
	return s.SearchWithControl(ctx, searchTerm, location, nil, onLead)
}

func (s *Scraper) SearchWithControl(ctx context.Context, searchTerm, location string, shouldContinue func() error, onLead func(Lead) error) error {
	query := strings.TrimSpace(searchTerm)
	if location != "" {
		query = fmt.Sprintf("%s %s", query, strings.TrimSpace(location))
	}
	if query == "" {
		return fmt.Errorf("search term is required")
	}
	if err := checkControl(ctx, shouldContinue); err != nil {
		return err
	}

	pw, err := playwright.Run()
	if err != nil {
		return fmt.Errorf("start playwright: %w", err)
	}
	defer pw.Stop()

	browser, err := pw.Chromium.Launch(playwright.BrowserTypeLaunchOptions{
		Headless: playwright.Bool(s.config.Headless),
		Args: []string{
			"--disable-blink-features=AutomationControlled",
			"--disable-dev-shm-usage",
			"--disable-extensions",
			"--disable-gpu",
			"--disable-sync",
			"--mute-audio",
			"--no-sandbox",
		},
	})
	if err != nil {
		return fmt.Errorf("start browser: %w", err)
	}
	defer browser.Close()

	browserContext, err := browser.NewContext(playwright.BrowserNewContextOptions{
		Viewport:  &playwright.Size{Width: 1280, Height: 900},
		UserAgent: playwright.String("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"),
		Locale:    playwright.String("pt-BR"),
	})
	if err != nil {
		return err
	}
	if err := blockHeavyResources(browserContext); err != nil {
		return err
	}

	page, err := browserContext.NewPage()
	if err != nil {
		return err
	}

	searchURL := fmt.Sprintf("https://www.google.com/maps/search/%s", url.QueryEscape(query))
	if _, err := page.Goto(searchURL, playwright.PageGotoOptions{
		Timeout:   playwright.Float(s.config.Timeout),
		WaitUntil: playwright.WaitUntilStateDomcontentloaded,
	}); err != nil {
		return fmt.Errorf("open maps search: %w", err)
	}

	if err := sleep(ctx, 2*time.Second); err != nil {
		return err
	}

	resultURLs := s.collectResultURLs(ctx, page, shouldContinue)
	if err := page.Close(); err != nil {
		log.Printf("close search page error: %v", err)
	}
	return s.extractResults(ctx, browserContext, resultURLs, shouldContinue, onLead)
}

func (s *Scraper) collectResultURLs(ctx context.Context, page playwright.Page, shouldContinue func() error) []string {
	feedSelector := `div[role="feed"]`
	if _, err := page.WaitForSelector(feedSelector, playwright.PageWaitForSelectorOptions{Timeout: playwright.Float(15000)}); err != nil {
		log.Printf("results feed not found: %v", err)
		return nil
	}

	candidateLimit := s.candidateLimit()
	resultURLs := make([]string, 0, candidateLimit)
	seen := make(map[string]struct{}, candidateLimit)

	maxScrolls := 25 + candidateLimit/2
	if maxScrolls > 160 {
		maxScrolls = 160
	}

	stagnantScrolls := 0
	for i := 0; i < maxScrolls; i++ {
		if err := checkControl(ctx, shouldContinue); err != nil {
			return resultURLs
		}

		before := len(resultURLs)
		resultURLs = appendResultURLs(page, resultURLs, seen, candidateLimit)
		if len(resultURLs) >= candidateLimit {
			return resultURLs
		}

		if mapsFeedReachedEnd(page) && len(resultURLs) == before {
			return resultURLs
		}

		_ = page.Locator(feedSelector).Hover()
		if err := page.Mouse().Wheel(0, 1200); err != nil {
			log.Printf("wheel results error: %v", err)
		}

		_, err := page.Evaluate(`(selector) => {
			const feed = document.querySelector(selector);
			if (feed) feed.scrollBy(0, Math.max(feed.clientHeight * 0.9, 700));
		}`, feedSelector)
		if err != nil {
			log.Printf("scroll results error: %v", err)
			return resultURLs
		}
		if err := sleep(ctx, 1500*time.Millisecond); err != nil {
			return resultURLs
		}

		resultURLs = appendResultURLs(page, resultURLs, seen, candidateLimit)
		if len(resultURLs) >= candidateLimit {
			return resultURLs
		}
		if len(resultURLs) == before {
			stagnantScrolls++
			if stagnantScrolls >= 8 {
				return resultURLs
			}
			continue
		}
		stagnantScrolls = 0
	}

	return resultURLs
}

func (s *Scraper) candidateLimit() int {
	buffer := s.config.MaxResults / 2
	if buffer < 10 {
		buffer = 10
	}
	if buffer > 50 {
		buffer = 50
	}
	return s.config.MaxResults + buffer
}

func appendResultURLs(page playwright.Page, resultURLs []string, seen map[string]struct{}, maxURLs int) []string {
	links, err := page.Locator(`div[role="feed"] a[href*="/maps/place/"]`).All()
	if err != nil {
		log.Printf("collect result links error: %v", err)
		return resultURLs
	}

	for _, link := range links {
		href, err := link.GetAttribute("href")
		if err != nil || href == "" {
			continue
		}
		href = normalizeResultURL(href)
		if href == "" {
			continue
		}
		if _, ok := seen[href]; ok {
			continue
		}
		seen[href] = struct{}{}
		resultURLs = append(resultURLs, href)
		if len(resultURLs) >= maxURLs {
			return resultURLs
		}
	}

	return resultURLs
}

func normalizeResultURL(rawURL string) string {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return ""
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}
	parsed.RawQuery = ""
	parsed.Fragment = ""
	return parsed.String()
}

func mapsFeedReachedEnd(page playwright.Page) bool {
	text, err := page.Locator(`div[role="feed"]`).TextContent()
	if err != nil {
		return false
	}
	text = strings.ToLower(text)

	endMessages := []string{
		"you've reached the end of the list",
		"you have reached the end of the list",
		"você chegou ao final da lista",
		"voce chegou ao final da lista",
	}
	for _, message := range endMessages {
		if strings.Contains(text, message) {
			return true
		}
	}

	return false
}

type detailJob struct {
	index int
	url   string
}

type detailResult struct {
	lead Lead
	err  error
}

func (s *Scraper) extractResults(ctx context.Context, browserContext playwright.BrowserContext, resultURLs []string, shouldContinue func() error, onLead func(Lead) error) error {
	if err := sleep(ctx, 1*time.Second); err != nil {
		return err
	}
	if err := checkControl(ctx, shouldContinue); err != nil {
		return err
	}

	if len(resultURLs) == 0 {
		return nil
	}

	extractCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	workerCount := s.detailConcurrency(len(resultURLs))
	jobs := make(chan detailJob, workerCount)
	results := make(chan detailResult, workerCount)

	var wg sync.WaitGroup
	for workerID := 1; workerID <= workerCount; workerID++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			page, err := browserContext.NewPage()
			if err != nil {
				sendDetailResult(extractCtx, results, detailResult{err: fmt.Errorf("create detail page: %w", err)})
				return
			}
			defer func() {
				if err := page.Close(); err != nil {
					log.Printf("close detail page %d error: %v", workerID, err)
				}
			}()

			for job := range jobs {
				lead, err := s.extractLeadFromURL(extractCtx, page, job.url, job.index, shouldContinue)
				if err != nil {
					sendDetailResult(extractCtx, results, detailResult{err: err})
					return
				}
				if lead.Name == "" {
					continue
				}
				if !sendDetailResult(extractCtx, results, detailResult{lead: lead}) {
					return
				}
			}
		}(workerID)
	}

	wg.Add(1)
	go func() {
		defer wg.Done()
		defer close(jobs)
		for i, resultURL := range resultURLs {
			if err := checkControl(extractCtx, shouldContinue); err != nil {
				sendDetailResult(extractCtx, results, detailResult{err: err})
				cancel()
				return
			}
			select {
			case jobs <- detailJob{index: i, url: resultURL}:
			case <-extractCtx.Done():
				return
			}
		}
	}()

	go func() {
		wg.Wait()
		close(results)
	}()

	emittedLeads := 0
	var resultErr error
	for result := range results {
		if resultErr != nil {
			continue
		}
		if result.err != nil {
			resultErr = result.err
			cancel()
			continue
		}

		if err := onLead(result.lead); err != nil {
			resultErr = err
			cancel()
			continue
		}
		emittedLeads++
		if emittedLeads >= s.config.MaxResults {
			cancel()
			continue
		}
	}

	return resultErr
}

func (s *Scraper) detailConcurrency(resultCount int) int {
	concurrency := normalizeDetailConcurrency(s.config.DetailConcurrency)
	if resultCount < concurrency {
		return resultCount
	}
	return concurrency
}

func normalizeDetailConcurrency(value int) int {
	if value <= 0 {
		return 3
	}
	if value > 6 {
		return 6
	}
	return value
}

func sendDetailResult(ctx context.Context, results chan<- detailResult, result detailResult) bool {
	select {
	case results <- result:
		return true
	case <-ctx.Done():
		return false
	}
}

func (s *Scraper) extractLeadFromURL(ctx context.Context, page playwright.Page, resultURL string, index int, shouldContinue func() error) (Lead, error) {
	if err := checkControl(ctx, shouldContinue); err != nil {
		return Lead{}, err
	}

	if _, err := page.Goto(resultURL, playwright.PageGotoOptions{
		Timeout:   playwright.Float(s.config.Timeout),
		WaitUntil: playwright.WaitUntilStateDomcontentloaded,
	}); err != nil {
		log.Printf("open result %d error: %v", index+1, err)
		return Lead{}, nil
	}

	if _, err := page.WaitForSelector(`h1.DUwDvf`, playwright.PageWaitForSelectorOptions{Timeout: playwright.Float(5000)}); err != nil {
		log.Printf("wait result %d details error: %v", index+1, err)
	}
	if err := sleep(ctx, 500*time.Millisecond); err != nil {
		return Lead{}, err
	}
	if err := checkControl(ctx, shouldContinue); err != nil {
		return Lead{}, err
	}

	return extractLeadData(page), nil
}

func blockHeavyResources(context playwright.BrowserContext) error {
	return context.Route("**/*", func(route playwright.Route) {
		resourceType := route.Request().ResourceType()
		switch resourceType {
		case "font", "image", "media":
			if err := route.Abort(); err != nil {
				log.Printf("abort %s resource error: %v", resourceType, err)
			}
		default:
			if err := route.Continue(); err != nil {
				log.Printf("continue %s resource error: %v", resourceType, err)
			}
		}
	})
}

func extractLeadData(page playwright.Page) Lead {
	lead := Lead{
		Name:     safeText(page, `h1.DUwDvf`),
		Category: safeText(page, `button[jsaction*="category"]`),
		Website:  safeAttribute(page, `a[data-item-id="authority"]`, "href"),
		PlaceURL: page.URL(),
	}

	ratingAria := safeAttribute(page, `div.F7nice span[aria-label*="estrelas"]`, "aria-label")
	if ratingAria != "" {
		parts := strings.Split(ratingAria, " ")
		if len(parts) > 0 {
			lead.Rating = strings.ReplaceAll(parts[0], ",", ".")
		}
		for i, part := range parts {
			if strings.Contains(strings.ToLower(part), "avalia") && i > 0 {
				lead.ReviewsCount = strings.ReplaceAll(strings.ReplaceAll(parts[i-1], ".", ""), ",", "")
			}
		}
	}

	addressAria := safeAttribute(page, `button[data-item-id="address"]`, "aria-label")
	lead.Address = strings.TrimSpace(strings.ReplaceAll(addressAria, "Endereço: ", ""))

	phoneAria := safeAttribute(page, `button[data-item-id*="phone"]`, "aria-label")
	lead.Phone = strings.TrimSpace(strings.ReplaceAll(strings.ReplaceAll(phoneAria, "Telefone: ", ""), "Ligar: ", ""))

	hoursAria := safeAttribute(page, `xpath=//button[contains(@data-item-id, "oh")]`, "aria-label")
	lead.Hours = strings.TrimSpace(hoursAria)

	lead.Latitude, lead.Longitude = extractCoordinates(lead.PlaceURL)

	links, _ := page.Locator(`a[href]`).All()
	for _, l := range links {
		href, _ := l.GetAttribute("href")
		if href == "" {
			continue
		}
		if strings.Contains(href, "instagram.com") && lead.Instagram == "" {
			lead.Instagram = href
		} else if strings.Contains(href, "facebook.com") && lead.Facebook == "" {
			lead.Facebook = href
		} else if strings.Contains(href, "linkedin.com") && lead.Linkedin == "" {
			lead.Linkedin = href
		}
	}

	return lead
}

func safeText(page playwright.Page, selector string) string {
	loc := page.Locator(selector).First()
	if count, _ := loc.Count(); count > 0 {
		text, _ := loc.TextContent()
		return strings.TrimSpace(text)
	}
	return ""
}

func safeAttribute(page playwright.Page, selector, attribute string) string {
	loc := page.Locator(selector).First()
	if count, _ := loc.Count(); count > 0 {
		val, _ := loc.GetAttribute(attribute)
		return strings.TrimSpace(val)
	}
	return ""
}

func ExtractCoordinatesFromURL(rawURL string) (float64, float64) {
	decodedURL, err := url.QueryUnescape(rawURL)
	if err == nil {
		rawURL = decodedURL
	}

	patterns := []struct {
		re         *regexp.Regexp
		latIndex   int
		lngIndex   int
		exactPlace bool
	}{
		// Place coordinates from Google Maps data payload. Prefer these over @,
		// because @ often represents the current map viewport center.
		{regexp.MustCompile(`!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)`), 1, 2, true},
		{regexp.MustCompile(`!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)`), 2, 1, true},
		{regexp.MustCompile(`ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)`), 1, 2, true},
		{regexp.MustCompile(`q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)`), 1, 2, true},
		{regexp.MustCompile(`@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)`), 1, 2, false},
	}

	var fallbackLat, fallbackLng float64
	for _, pattern := range patterns {
		matches := pattern.re.FindStringSubmatch(rawURL)
		if len(matches) != 3 {
			continue
		}
		lat, latErr := strconv.ParseFloat(matches[pattern.latIndex], 64)
		lng, lngErr := strconv.ParseFloat(matches[pattern.lngIndex], 64)
		if latErr == nil && lngErr == nil {
			if pattern.exactPlace {
				return lat, lng
			}
			fallbackLat = lat
			fallbackLng = lng
		}
	}

	if fallbackLat != 0 || fallbackLng != 0 {
		return fallbackLat, fallbackLng
	}

	return 0, 0
}

func extractCoordinates(rawURL string) (float64, float64) {
	return ExtractCoordinatesFromURL(rawURL)
}

func sleep(ctx context.Context, duration time.Duration) error {
	timer := time.NewTimer(duration)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func checkControl(ctx context.Context, shouldContinue func() error) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if shouldContinue == nil {
		return nil
	}
	return shouldContinue()
}
