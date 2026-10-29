# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

This is a frontend web application for the **URL Summary Scraper** AWS Lambda API. It extracts comprehensive metadata from websites including SEO data, Open Graph tags, Twitter Card information, social media links, contact details, media assets, link analysis, and optional AI-powered summaries.

## Design System Reference

Use `/Users/emln/dev/njoylab.com/echovalue.dev/design-system` as the reference design system for echoValue visual tokens, navigation patterns, spacing, typography, and utility-page layout alignment.

## Architecture

### Core Components

- **index.html**: Landing page with analyzer form and informational content
- **app.html**: Dedicated analyzer page sharing the same JavaScript and CSS
- **script.js**: Vanilla JavaScript handling validation, API calls, history management, and comprehensive results rendering
- **styles.css**: Complete styling with CSS variables, dark/light themes, responsive design, and results visualization components
- **build.js**: Build script for environment variable injection (API endpoint and Turnstile site key)

### Tech Stack

- **Pure Vanilla Stack**: HTML5, CSS3, Vanilla JavaScript ES6+ (no frameworks, no build tools required)
- **Libraries**:
  - Cloudflare Turnstile (bot protection)
  - Google Fonts (Inter + JetBrains Mono)

### Data Flow

1. User enters URL and optional configuration
2. Form validation with debounced URL checking
3. Cloudflare Turnstile verification
4. POST request to AWS Lambda API with options payload
5. Comprehensive results rendering with collapsible sections
6. LocalStorage persistence for search history
7. URL parameters support for shareable results

## Common Commands

```bash
# Local development (Node.js 22.16+, configured .env)
npm ci
npm run build
python3 -m http.server 8000 --directory dist
# Open /app.html with the simple Python server

# Production build (injects environment variables)
npm run build

# Build with environment variables
TURNSTILE_SITE_KEY="..." URL_SCRAPER_API_ENDPOINT="..." npm run build

# Verification (API and Turnstile simulated locally)
npm run check
npx playwright install chromium
npm test
```

## API Integration

### API Endpoint
The Lambda function endpoint is configured via environment variable and injected at build time:
- Development: `__API_ENDPOINT__` placeholder in script.js
- Production: Replaced by `process.env.URL_SCRAPER_API_ENDPOINT` during build

### Request Format (API_Payload)
```json
{
  "url": "https://example.com",
  "language": "en-US",
  "ignoreRobots": false,
  "ignoreExternalLinks": false,
  "ignoreInteralLinks": false,
  "generateSummary": false,
  "summaryLength": "medium",
  "extractKeyFacts": false,
  "summaryLanguage": "en-US"
}
```

### Response Format (ScraperData)
Structured metadata organized into categories:
- **seo**: title, description, keywords, canonical, robots, language, viewport
- **openGraph**: OG tags for social sharing
- **twitterCard**: Twitter-specific metadata
- **social**: Links to 20+ social platforms (X, LinkedIn, Instagram, YouTube, TikTok, etc.)
- **contact**: email, phone, address
- **technical**: HTTP status, load time, security info, final URL, robots.txt compliance
- **media**: favicon, touch icons, featured images, logos
- **links**: Categorized internal/external links with domain analysis
- **structuredData**: JSON-LD data (optional)
- **ai**: AI-generated summaries and key facts (optional, requires AI endpoint)

## Key Features

### 1. URL Validation
- Real-time validation with debouncing (300ms)
- Auto-prepend `https://` if protocol missing
- Visual feedback (green checkmark for valid, red X for invalid)
- Comprehensive error messages

### 2. Advanced Options
- **Language Selector**: 8 languages supported (en-US, it-IT, es-ES, fr-FR, de-DE, pt-PT, ja-JP, zh-CN)
- **Scraper Options**: ignoreRobots, ignoreExternalLinks, ignoreInternalLinks
- **AI Options**: summaryLength (none/short/medium/long); summary and key facts are enabled together unless none is selected
- Collapsible panel with smooth animations

### 3. History Management
- LocalStorage persistence (key: `url-scraper-history`)
- Maximum 20 items with automatic pruning
- Preview data: title, status code, favicon
- Click to restore the URL and options for a fresh analysis
- Individual delete and clear all functionality

### 4. Results Visualization
Comprehensive rendering with collapsible sections:
- **Summary Header**: URL, status, load time, security badge
- **SEO Metadata**: All SEO-related meta tags
- **Open Graph**: Social sharing metadata
- **Twitter Card**: Twitter-specific tags
- **Social Media Links**: 20+ platforms with icons
- **Contact Information**: Email, phone, address
- **Technical Info**: Status code, redirects, robots.txt, security
- **Media Assets**: Favicon, logos, images with thumbnails
- **Links Analysis**: Statistics, internal/external lists, domains breakdown
- **Structured Data**: JSON-LD viewer
- **AI Analysis**: Summaries and key facts (if available)

### 5. UI/UX Patterns
- Toast notifications (success, error, warning, info)
- Confirmation modals (promise-based)
- Loading states with rotating messages
- Collapsible sections with aria attributes
- Mobile-first responsive design
- Dark and light themes
- Smooth transitions and animations

## File Structure

```
urlsummary.echovalue.dev/
├── index.html              # Landing page with analyzer
├── app.html                # Dedicated analyzer page
├── script.js               # Shared analyzer logic
├── styles.css              # Shared styling
├── build.js                # Build script for env injection
├── package.json            # Build/check/test commands
├── tests/                  # Build and browser regressions
├── .github/workflows/      # Verification workflow
├── robots.txt              # SEO configuration
├── sitemap.xml             # SEO sitemap
├── site.webmanifest        # PWA manifest
├── AGENTS.md               # This file
├── README.md               # Project documentation
├── .gitignore              # Git ignore rules
└── [favicon files]         # Multiple favicon formats
```

## Development Notes

### Environment Variables
- `TURNSTILE_SITE_KEY`: Cloudflare Turnstile site key (shared with lookup.echovalue.dev)
- `URL_SCRAPER_API_ENDPOINT`: AWS Lambda API Gateway endpoint

### Build Process
The `build.js` script:
1. Loads `.env` without overriding environment variables and validates required configuration
2. Clears and recreates `dist/` only after configuration is valid
3. Copies public static files, excluding tests, dependencies and internal documentation
4. Replaces `YOUR_TURNSTILE_SITE_KEY` in index.html and app.html
5. Serializes the API endpoint safely into script.js; missing/invalid configuration fails the build

### Results Rendering Pattern
Each data category has a dedicated render function:
```javascript
function renderSEOSection(seo) { ... }
function renderOpenGraphSection(og) { ... }
function renderSocialMediaSection(social) { ... }
// etc.
```

All sections use the common `renderCollapsibleSection()` helper with:
- Section ID
- Icon emoji
- Title text
- Optional badge (counts, warnings)
- HTML content

### Styling Architecture
- **CSS Variables**: All colors, fonts, transitions defined in `:root`
- **Themes**: Dark by default, light theme selected with the shared toggle
- **Responsive**: Mobile-first with breakpoints at 768px, 1024px
- **Components**: Modular CSS for reusable components
- **Results**: ~570 lines of CSS dedicated to results visualization

### LocalStorage Schema
```javascript
{
  url: string,
  options: { language, ignoreRobots, ... },
  timestamp: ISO string,
  preview: {
    title: string,
    statusCode: number,
    favicon: string
  }
}
```

### URL Parameters
Format: `?url=https%3A%2F%2Fexample.com&lang=it-IT&summary=short&share=1`
- `url`: URL to analyze (URL-encoded)
- `lang`: Language preference
- `summary`: none, short, medium or long
- `ignoreRobots`, `ignoreExternalLinks`, `ignoreInternalLinks`: optional boolean flags
- `share`: Indicates shared analysis settings; results are not embedded in the URL

## Error Handling

### API Errors
- 400: Invalid URL → Red toast with validation message
- 408: Timeout → Warning toast about slow/unresponsive website
- 502: Network error → Error toast about connection issues
- robots.txt violation: success=false with error message

### Client-Side Errors
- Missing Turnstile token: Warning toast
- Invalid URL format: Inline validation error
- Network failures: Timeout with AbortController (180s)

## Deployment

### Static Hosting
Compatible with:
- Cloudflare Pages
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

### Build Command
```bash
npm run build
```

### Environment Configuration
Create `.env` file (not committed):
```
TURNSTILE_SITE_KEY=your_key_here
URL_SCRAPER_API_ENDPOINT=https://your-lambda-url.amazonaws.com/prod
```

## Future Enhancements

Potential features (not implemented):
- Results comparison (multiple URLs side-by-side)
- Additional export formats (PDF and CSV; JSON download and JSON/Markdown clipboard export already exist)
- Batch analysis (upload list of URLs)
- Scheduled monitoring (track changes over time)
- Screenshot preview integration
- Performance scores (Lighthouse-style metrics)
- SEO recommendations (automated suggestions)
- Custom scraping rules (user-defined patterns)

## Related Projects

- **lookup.echovalue.dev**: DNS Intelligence & Security Analyzer (architecture reference)
- **aws-lambda/url-summary-scraper**: Backend Lambda function that powers this frontend

## License

MIT License - Built by nJoyLab.com

## Verification and Data Safety

- `npm test` runs build and browser regressions on temporary copies with simulated network responses.
- The runtime has no npm dependencies; Playwright is used only for development checks.
- Treat all API and persisted history values as untrusted. Escape HTML attributes as well as text; allow only HTTP(S) links and media URLs.
- Storage failure must not hide successful analysis results.
- View JSON uses a local blob document; no external viewer or compression library is needed.
- The published browser service schema retains the backend wire key `ignoreInteralLinks`. Do not silently rename it in requests.
