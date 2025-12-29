# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a frontend web application for the **URL Summary Scraper** AWS Lambda API. It extracts comprehensive metadata from websites including SEO data, Open Graph tags, Twitter Card information, social media links, contact details, media assets, link analysis, and optional AI-powered summaries.

## Architecture

### Core Components

- **index.html**: Single-page application with form, advanced options, history panel, and results container
- **script.js**: Vanilla JavaScript handling validation, API calls, history management, and comprehensive results rendering
- **styles.css**: Complete styling with CSS variables, dark theme, responsive design, and results visualization components
- **build.js**: Build script for environment variable injection (API endpoint and Turnstile site key)

### Tech Stack

- **Pure Vanilla Stack**: HTML5, CSS3, Vanilla JavaScript ES6+ (no frameworks, no build tools required)
- **Libraries**:
  - Cloudflare Turnstile (bot protection)
  - LZ-String (JSON compression for results sharing)
  - Google Fonts (IBM Plex Sans + JetBrains Mono)

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
# Development (no build needed)
python -m http.server 8000
# or
npx serve

# Production build (injects environment variables)
npm run build

# Build with environment variables
TURNSTILE_SITE_KEY="..." URL_SCRAPER_API_ENDPOINT="..." npm run build
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
- **AI Options**: generateSummary, summaryLength (short/medium/long), extractKeyFacts
- Collapsible panel with smooth animations

### 3. History Management
- LocalStorage persistence (key: `url-scraper-history`)
- Maximum 20 items with automatic pruning
- Preview data: title, status code, favicon
- Click to reload previous searches
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
- Dark theme with grain overlay
- Smooth transitions and animations

## File Structure

```
urlsummary.echovalue.dev/
├── index.html              # Main SPA (400+ lines)
├── script.js               # All JavaScript logic (1100+ lines)
├── styles.css              # Complete styling (2500+ lines)
├── build.js                # Build script for env injection
├── package.json            # Minimal dependencies
├── robots.txt              # SEO configuration
├── sitemap.xml             # SEO sitemap
├── site.webmanifest        # PWA manifest
├── CLAUDE.md               # This file
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
1. Clears and recreates `dist/` directory
2. Copies all static files (HTML, CSS, JS, images, manifests)
3. Replaces `YOUR_TURNSTILE_SITE_KEY` in index.html
4. Replaces `__API_ENDPOINT__` in script.js
5. Outputs build warnings for missing environment variables

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
- **Dark Theme**: Single theme, no toggle
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
Format: `?url=https://example.com&lang=it-IT&share=1`
- `url`: URL to analyze (URL-encoded)
- `lang`: Language preference
- `share`: Indicates shared result link

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
- Export formats (PDF, CSV, JSON download)
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
