# URL Summary Scraper - Frontend

**Live Demo**: [urlsummary.echovalue.dev](https://urlsummary.echovalue.dev)

A web application for extracting comprehensive metadata from any URL. This frontend interfaces with the URL Summary Scraper API to provide SEO analysis, social media detection, contact information extraction, and optional AI-powered content summaries.

## Features

- **SEO Metadata Extraction**: Title, description, keywords, canonical URLs, robots directives
- **Open Graph & Twitter Cards**: Social sharing metadata analysis
- **Social Media Detection**: Automatic discovery of 20+ social platform links
- **Contact Information**: Email, phone, address extraction
- **Media Assets**: Favicon, logos, images with preview thumbnails
- **Links Analysis**: Internal vs external links with domain breakdown
- **Structured Data**: JSON-LD extraction and visualization
- **AI Summaries**: Optional AI-powered content summaries and key facts extraction
- **History Management**: LocalStorage-based search history
- **Responsive Design**: Mobile-first interface with dark and light themes
- **Exports**: Copy JSON/Markdown, download JSON, and view JSON locally

## Quick Start

### Local Development

Requires Node.js 22.16 or newer. Configure `.env` as shown below, then:

```bash
npm ci
npm run build
python3 -m http.server 8000 --directory dist
# Open http://localhost:8000/app.html (or the homepage)
```

The repository can also be served directly to preview the layout, but analysis requires a configured build and a Turnstile key authorized for the serving hostname. The simple Python server requires `.html` extensions; production hosting must support extensionless routes such as `/app` and `/faq`.

### Production Build

```bash
TURNSTILE_SITE_KEY="your_key" URL_SCRAPER_API_ENDPOINT="https://your-api.example.com/scrape" npm run build
```

Output is written to `dist/`. Missing or invalid required configuration stops the build without replacing a previous output directory. No deployment is performed by this command.

## Environment Variables

Create a `.env` file in the repository root or set environment variables. The build loads `.env` automatically; existing environment variables take precedence. Both values are public browser configuration, not secrets:

```bash
# Cloudflare Turnstile site key
TURNSTILE_SITE_KEY=0x4AAAA...

# AWS Lambda API Gateway endpoint
URL_SCRAPER_API_ENDPOINT=https://your-api.example.com/scrape
```

## API Integration

### Request Format

```json
{
  "url": "https://example.com",
  "language": "en-US",
  "ignoreRobots": false,
  "ignoreExternalLinks": false,
  "ignoreInteralLinks": false,
  "generateSummary": false,
  "summaryLength": "medium",
  "extractKeyFacts": false
}
```

The request retains the backend wire spelling `ignoreInteralLinks`. The browser control and saved options use `ignoreInternalLinks`; the client maps between them. AI summaries and key facts are enabled by default with a short summary, and disabled together by selecting **None**.

### Response Format

The API returns comprehensive metadata organized in categories:

```json
{
  "success": true,
  "data": {
    "seo": { "title": "...", "description": "...", ... },
    "openGraph": { "title": "...", "image": "...", ... },
    "twitterCard": { "card": "...", "site": "...", ... },
    "social": { "facebook": "...", "x": "...", ... },
    "contact": { "email": "...", "phone": "...", ... },
    "technical": { "statusCode": 200, "loadTime": 1234, ... },
    "media": { "favicon": "...", "logo": "...", ... },
    "links": { "internal": {...}, "external": {...} },
    "structuredData": [...],
    "ai": { "summary": {...}, "keyFacts": {...} }
  }
}
```

## Build System

The `build.js` script validates configuration, creates `dist/`, copies public static files and injects the Turnstile key into both entry pages and the API endpoint into JavaScript. Tests, dependencies, local environment files and repository documentation are excluded from the output.

## Verification

```bash
npm ci
npx playwright install chromium
npm run check
npm test
```

Tests use Node's built-in test runner and Playwright as a development dependency. Build and browser regressions run against temporary copies with intercepted network traffic, synthetic API responses and a simulated Turnstile token; they do not call the real scraper. The GitHub workflow runs these checks without deploying.

To use an existing Chrome installation, set `PLAYWRIGHT_EXECUTABLE_PATH` to its executable. Optional `TEST_SCREENSHOTS=/absolute/output/path` saves desktop/mobile screenshots during the browser checks.

## Privacy

Search history (URL, options and preview metadata) and the theme preference are saved locally when browser storage is available. Full results stay in memory; copying, downloading or viewing JSON is handled locally. **View JSON** opens a browser blob document without sending the response to an external viewer.

Analysis sends the target URL, options and Turnstile token to the configured API. Result images and favicons are loaded from their source websites. The page also loads external fonts, icons and Cloudflare Turnstile. This repository contains no analytics integration; backend logging and retention must be assessed separately.

Shared links include the analyzed URL and selected options in the query string, not the complete result. Avoid sharing URLs containing private parameters.

## Features Detail

### Advanced Options
- **Language**: 8 supported languages
- **Scraper Options**: Ignore robots.txt, external/internal links
- **AI Options**: Summary generation, key facts extraction

### History Management
- Stores last 20 searches in LocalStorage
- Preview data (title, status, favicon)
- Click to restore the URL and options, then run a fresh analysis
- Privacy-focused (browser only, never synced)

## License

MIT License

## Author

Built by [nJoyLab.com](https://njoylab.com)

More tools at [echovalue.dev](https://echovalue.dev)

## API Access

This scraper is available as a REST API through the echoValue documentation:

- **API docs**: [URL to Metadata](https://docs.echovalue.dev/url-to-metadata/)
- **OpenAPI schema**: [openapi.yaml](https://docs.echovalue.dev/openapi.yaml)

The API offers simple REST access with AI-powered features for production use and bulk analysis.
