const SITE_ORIGIN = 'https://urlsummary.echovalue.dev';
const CONTENT_SIGNAL = 'ai-train=yes, search=yes, ai-input=no';
const API_CATALOG = {
    linkset: [
        {
            anchor: `${SITE_ORIGIN}/app`,
            'service-desc': [
                {
                    href: `${SITE_ORIGIN}/.well-known/service-desc/url-summary-service.json`,
                    type: 'application/json'
                }
            ],
            'service-doc': [
                {
                    href: `${SITE_ORIGIN}/#api`,
                    type: 'text/html'
                }
            ],
            status: [
                {
                    href: `${SITE_ORIGIN}/.well-known/status/url-summary.json`,
                    type: 'application/json'
                }
            ]
        }
    ]
};

const DISCOVERY_LINKS = [
    `</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
    `</.well-known/service-desc/url-summary-service.json>; rel="service-desc"; type="application/json"`,
    `</#api>; rel="service-doc"; type="text/html"`
].join(', ');

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);

    if (url.pathname === '/.well-known/api-catalog') {
        return jsonResponse(API_CATALOG, {
            'Content-Type': 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
            'Content-Signal': CONTENT_SIGNAL,
            Link: DISCOVERY_LINKS
        });
    }

    const response = await context.next();
    const headers = new Headers(response.headers);
    const contentType = headers.get('content-type') || '';
    const wantsMarkdown = acceptsMarkdown(request);
    const isHtml = contentType.includes('text/html');

    if (isHtml) {
        headers.set('Content-Signal', CONTENT_SIGNAL);
        headers.set('Vary', appendHeaderValue(headers.get('Vary'), 'Accept'));
        headers.append('Link', DISCOVERY_LINKS);
    }

    if (!isHtml || !wantsMarkdown) {
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers
        });
    }

    const html = await response.text();
    const markdown = htmlToMarkdown(html, `${url.origin}${url.pathname}`);

    headers.set('Content-Type', 'text/markdown; charset=utf-8');
    headers.set('Vary', appendHeaderValue(headers.get('Vary'), 'Accept'));
    headers.set('x-markdown-tokens', String(estimateMarkdownTokens(markdown)));
    headers.set('Content-Length', String(new TextEncoder().encode(markdown).length));

    return new Response(markdown, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}

function jsonResponse(data, headers = {}) {
    return new Response(JSON.stringify(data, null, 2), {
        status: 200,
        headers
    });
}

function acceptsMarkdown(request) {
    const accept = (request.headers.get('Accept') || '').toLowerCase();
    return accept.includes('text/markdown') || accept.includes('text/*');
}

function appendHeaderValue(existingValue, valueToAdd) {
    if (!existingValue) {
        return valueToAdd;
    }

    const values = existingValue.split(',').map(value => value.trim().toLowerCase());
    if (values.includes(valueToAdd.toLowerCase())) {
        return existingValue;
    }

    return `${existingValue}, ${valueToAdd}`;
}

function estimateMarkdownTokens(markdown) {
    return Math.max(1, Math.ceil(markdown.length / 4));
}

function htmlToMarkdown(html, pageUrl) {
    const title = matchContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const description = matchContent(
        html,
        /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i
    );
    const body = matchContent(html, /<body[^>]*>([\s\S]*?)<\/body>/i) || html;

    let markdown = body
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<svg[\s\S]*?<\/svg>/gi, '')
        .replace(/<img[^>]*>/gi, '')
        .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, code) => {
            return `\n\`\`\`\n${decodeHtml(stripTags(code)).trim()}\n\`\`\`\n`;
        })
        .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => {
            return `\n\`\`\`\n${decodeHtml(stripTags(code)).trim()}\n\`\`\`\n`;
        })
        .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, code) => {
            return `\`${decodeHtml(stripTags(code)).trim()}\``;
        })
        .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
            const label = normalizeInlineText(text);
            const resolvedHref = resolveUrl(pageUrl, href);
            return label ? `[${label}](${resolvedHref})` : resolvedHref;
        })
        .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, text) => `\n# ${normalizeInlineText(text)}\n\n`)
        .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, text) => `\n## ${normalizeInlineText(text)}\n\n`)
        .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, text) => `\n### ${normalizeInlineText(text)}\n\n`)
        .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, text) => `\n#### ${normalizeInlineText(text)}\n\n`)
        .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, text) => `\n##### ${normalizeInlineText(text)}\n\n`)
        .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_, text) => `\n###### ${normalizeInlineText(text)}\n\n`)
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, text) => `- ${normalizeInlineText(text)}\n`)
        .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, text) => {
            return `\n> ${normalizeInlineText(text)}\n\n`;
        })
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|section|article|header|footer|main|nav|ul|ol|table|tr)>/gi, '\n\n')
        .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, text) => `**${normalizeInlineText(text)}**`)
        .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, text) => `*${normalizeInlineText(text)}*`);

    markdown = decodeHtml(stripTags(markdown))
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n +/g, '\n')
        .trim();

    const frontmatter = [
        '---',
        `title: ${yamlValue(title || 'URL Summary')}`,
        `source: ${pageUrl}`,
        description ? `description: ${yamlValue(description)}` : null,
        '---',
        ''
    ].filter(Boolean).join('\n');

    return `${frontmatter}\n${markdown}\n`;
}

function matchContent(input, pattern) {
    const match = input.match(pattern);
    return match ? decodeHtml(match[1]).trim() : '';
}

function normalizeInlineText(value) {
    return decodeHtml(stripTags(value))
        .replace(/\s+/g, ' ')
        .trim();
}

function stripTags(value) {
    return value.replace(/<[^>]+>/g, '');
}

function decodeHtml(value) {
    return value
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function resolveUrl(baseUrl, href) {
    try {
        return new URL(href, baseUrl).toString();
    } catch {
        return href;
    }
}

function yamlValue(value) {
    return JSON.stringify(value);
}
