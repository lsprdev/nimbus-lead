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
	"time"

	"github.com/playwright-community/playwright-go"
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
	Headless   bool
	Timeout    float64
	MaxResults int
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

	return &Scraper{
		config: Config{
			Headless:   headless,
			Timeout:    timeout,
			MaxResults: maxResults,
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

	s.scrollResults(ctx, page, shouldContinue)
	return s.extractResults(ctx, page, shouldContinue, onLead)
}

func (s *Scraper) scrollResults(ctx context.Context, page playwright.Page, shouldContinue func() error) {
	feedSelector := `div[role="feed"]`
	if _, err := page.WaitForSelector(feedSelector, playwright.PageWaitForSelectorOptions{Timeout: playwright.Float(5000)}); err != nil {
		log.Printf("results feed not found: %v", err)
		return
	}

	scrolls := 15
	if s.config.MaxResults > 100 {
		scrolls = 30
	}
	if s.config.MaxResults > 250 {
		scrolls = 60
	}

	stagnantScrolls := 0
	for i := 0; i < scrolls; i++ {
		if err := checkControl(ctx, shouldContinue); err != nil {
			return
		}
		linkCountBefore, _ := page.Locator(`div[role="feed"] a[href*="/maps/place/"]`).Count()
		if linkCountBefore >= s.config.MaxResults {
			return
		}

		_, err := page.Evaluate(`(selector) => {
			const feed = document.querySelector(selector);
			if (feed) feed.scrollTop = feed.scrollHeight;
		}`, feedSelector)
		if err != nil {
			log.Printf("scroll results error: %v", err)
			return
		}
		if err := sleep(ctx, 1*time.Second); err != nil {
			return
		}
		linkCountAfter, _ := page.Locator(`div[role="feed"] a[href*="/maps/place/"]`).Count()
		if linkCountAfter >= s.config.MaxResults {
			return
		}
		if linkCountAfter == linkCountBefore {
			stagnantScrolls++
			if stagnantScrolls >= 2 {
				return
			}
			continue
		}
		stagnantScrolls = 0
	}
}

func (s *Scraper) extractResults(ctx context.Context, page playwright.Page, shouldContinue func() error, onLead func(Lead) error) error {
	if err := sleep(ctx, 1*time.Second); err != nil {
		return err
	}
	if err := checkControl(ctx, shouldContinue); err != nil {
		return err
	}

	linksLocator := page.Locator(`div[role="feed"] a[href*="/maps/place/"]`)
	count, err := linksLocator.Count()
	if err != nil {
		return fmt.Errorf("count result links: %w", err)
	}
	if count == 0 {
		return nil
	}

	total := count
	if s.config.MaxResults < count {
		total = s.config.MaxResults
	}

	for i := 0; i < total; i++ {
		if err := checkControl(ctx, shouldContinue); err != nil {
			return err
		}

		link := page.Locator(`div[role="feed"] a[href*="/maps/place/"]`).Nth(i)
		if err := link.Click(playwright.LocatorClickOptions{Force: playwright.Bool(true)}); err != nil {
			log.Printf("click result %d error: %v", i+1, err)
			continue
		}

		if _, err := page.WaitForSelector(`h1.DUwDvf`, playwright.PageWaitForSelectorOptions{Timeout: playwright.Float(3000)}); err != nil {
			log.Printf("wait result %d details error: %v", i+1, err)
		}
		if err := sleep(ctx, 500*time.Millisecond); err != nil {
			return err
		}
		if err := checkControl(ctx, shouldContinue); err != nil {
			return err
		}

		lead := extractLeadData(page)
		if lead.Name == "" {
			continue
		}
		if err := onLead(lead); err != nil {
			return err
		}
	}

	return nil
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
