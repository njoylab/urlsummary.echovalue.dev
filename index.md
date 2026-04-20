---
title: "Free Meta Tag & Open Graph Checker | URL Summary Analyzer"
source: "https://urlsummary.echovalue.dev/"
description: "Check any URL for meta tags, Open Graph, Twitter Card, JSON-LD structured data, canonical tags, and more. Free, instant, no login needed."
---

# URL Summary Analyzer

URL Summary Analyzer is a static web app for analyzing a public URL and extracting page metadata, social preview tags, structured data, contact details, and link insights.

## Primary Use

Submit a URL in the web app to inspect:

- Title, description, and core meta tags
- Open Graph metadata
- Twitter card metadata
- Canonical tags
- Robots directives
- Structured data (JSON-LD)
- Social profile links
- Contact information
- Internal and external links

## How It Works

1. Enter a URL.
2. Run the analysis.
3. Review the extracted metadata and export the results.

## Audience

This tool is intended for marketers, developers, SEO practitioners, and QA teams that need fast metadata checks for a single page.

## Web Surfaces

- Home: https://urlsummary.echovalue.dev/
- App: https://urlsummary.echovalue.dev/app
- FAQ: https://urlsummary.echovalue.dev/faq
- API section: https://urlsummary.echovalue.dev/#api
- MCP section: https://urlsummary.echovalue.dev/#mcp

## API And Integration Signals

- Service descriptor: https://urlsummary.echovalue.dev/.well-known/service-desc/url-summary-service.json
- Status document: https://urlsummary.echovalue.dev/.well-known/status/url-summary.json
- API catalog: https://urlsummary.echovalue.dev/.well-known/api-catalog.json

## Operational Notes

- The frontend is a static site.
- Analysis is performed by a deployment-specific scraper API endpoint configured at build time.
- Search history is stored in the browser only.
- The app supports optional AI-generated summaries and key facts when enabled by the backend.
