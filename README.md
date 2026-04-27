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
- **Responsive Design**: Mobile-first, dark theme interface

## Quick Start

### Development (No Build Required)

```bash
# Serve the directory
python -m http.server 8000
# or
npx serve

# Open in browser
open http://localhost:8000
```

The application will work with placeholder API endpoint. To connect to a real API, use the build process.

### Production Build

```bash
# Install dependencies
npm install

# Build with environment variables
TURNSTILE_SITE_KEY="your_key" URL_SCRAPER_API_ENDPOINT="your_endpoint" npm run build

# Output will be in dist/ directory
```

## Environment Variables

Create a `.env` file or set environment variables:

```bash
# Cloudflare Turnstile site key
TURNSTILE_SITE_KEY=0x4AAAA...

# AWS Lambda API Gateway endpoint
URL_SCRAPER_API_ENDPOINT=https://<URL>
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

The `build.js` script:
1. Creates `dist/` directory
2. Copies all static files
3. Injects Turnstile site key into `index.html`
4. Injects API endpoint into `script.js`

## Privacy

- ✅ No server-side data collection
- ✅ Search history stored locally only (LocalStorage)
- ✅ No tracking or analytics
- ✅ No cookies

Your privacy is our priority. The only data sent to our servers is the URL you choose to analyze. All search history, preferences, and results are stored exclusively in your browser's LocalStorage and never synced to any server.

## Features Detail

### Advanced Options
- **Language**: 8 supported languages
- **Scraper Options**: Ignore robots.txt, external/internal links
- **AI Options**: Summary generation, key facts extraction

### History Management
- Stores last 20 searches in LocalStorage
- Preview data (title, status, favicon)
- Click to reload previous analysis
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
