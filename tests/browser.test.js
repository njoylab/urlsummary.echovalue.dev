const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { workspace, build } = require('./helpers.cjs');

const origin = 'http://localhost:8237';
let directory;
let browser;

before(async () => {
    directory = workspace();
    const result = build(directory, { TURNSTILE_SITE_KEY: 'test-site-key', URL_SCRAPER_API_ENDPOINT: `${origin}/api` });
    assert.equal(result.status, 0, result.stderr);
    browser = await chromium.launch({
        headless: true,
        ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {})
    });
});

after(async () => {
    await browser?.close();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
});

function response() {
    return { success: true, data: {
        technical: { originalUrl: 'https://example.com/', finalUrl: 'https://example.com/', statusCode: 200, loadTime: 42, isSecure: true, robotsAllowed: true },
        seo: { title: 'Example & metadata', description: 'A useful description', canonical: 'https://example.com/' },
        openGraph: { title: 'Example OG', image: 'https://example.com/og.png' },
        twitterCard: { card: 'summary', title: 'Example Twitter' },
        social: { github: 'https://github.com/example' },
        contact: { email: 'hello@example.com', phone: '+3901234567' },
        media: { favicon: 'https://example.com/favicon.ico' },
        links: { internal: { total: 1, urls: ['https://example.com/about'] }, external: { total: 1, urls: ['https://other.example.com/'], domains: ['other.example.com'] }, mailto: ['mailto:hello@example.com'], tel: ['tel:+3901234567'] },
        structuredData: [{ '@type': 'WebSite', name: 'Example' }],
        ai: { summary: { short: 'A short summary' }, keyFacts: { topic: 'Example' } }
    } };
}

async function session(t, entry = '/app', setup) {
    const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
    t.after(() => context.close());
    const state = { fixture: response(), requests: [], errors: [], api: null, external: [] };
    await context.addInitScript(() => {
        window.__xss = 0;
        window.__resets = 0;
        window.turnstile = { getResponse: () => 'test-token', reset: () => window.__resets++ };
    });
    if (setup) await context.addInitScript(setup);
    await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) {
            state.external.push(url.href);
            return route.fulfill({ status: 404, body: '' });
        }
        if (url.pathname === '/api') {
            state.requests.push(route.request().postDataJSON());
            if (state.api) return state.api(route);
            return route.fulfill({ json: state.fixture });
        }
        let relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        if (!path.extname(relative)) relative += '.html';
        const file = path.join(directory, 'dist', relative);
        if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
        const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
        return route.fulfill({ body: fs.readFileSync(file), contentType: mime[path.extname(file)] || 'application/octet-stream' });
    });
    state.page = await context.newPage();
    state.context = context;
    state.page.on('pageerror', error => state.errors.push(error.message));
    t.after(() => assert.deepEqual(state.errors, [], 'unexpected browser errors'));
    await state.page.goto(origin + entry);
    return state;
}

async function analyze(state, url = 'https://example.com/') {
    await state.page.locator('#url').fill(url);
    const request = state.page.waitForResponse(`${origin}/api`);
    // Enter exercises submission before the debounced normalizer runs.
    await state.page.locator('#url').press('Enter');
    await request;
    await state.page.waitForFunction(() => !document.querySelector('#analyzeBtn').classList.contains('loading'));
}

for (const entry of ['/', '/app']) {
    test(`${entry}: shared options, native keyboard controls, request contract and history`, async t => {
        const target = 'https://example.com/path?q=a%26b&encoded=%25';
        const state = await session(t, entry + '?' + new URLSearchParams({ url: target, lang: 'it-IT', summary: 'none', ignoreInternalLinks: 'true' }));
        const { page } = state;
        assert.equal(await page.locator('#url').inputValue(), target);
        assert.equal(await page.locator('[name=language]').inputValue(), 'it-IT');
        assert.equal(await page.locator('[name=summaryLength]').inputValue(), 'none');
        await page.getByRole('button', { name: 'Advanced Options' }).click();
        const language = page.getByLabel('Preferred Language');
        await page.getByRole('button', { name: /History/ }).focus();
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.name), 'language');
        await language.selectOption('en-US');
        assert.equal(await language.inputValue(), 'en-US');
        await analyze(state, 'example.com');
        assert.deepEqual(state.requests[0], { url: 'https://example.com', language: 'en-US', summaryLanguage: 'en-US', ignoreRobots: false, ignoreExternalLinks: false, ignoreInteralLinks: true, generateSummary: false, extractKeyFacts: false });
        assert.equal(await page.locator('#resultsContainer').isVisible(), true);
        assert.equal(new URL(page.url()).searchParams.get('lang'), 'en-US');
        assert.equal(await page.evaluate(() => window.__resets), 1);
        await page.reload();
        assert.equal(await page.locator('[name=language]').inputValue(), 'en-US');
        assert.equal(await page.locator('[name=summaryLength]').inputValue(), 'none');
        assert.equal(await page.locator('[name=ignoreInternalLinks]').isChecked(), true);
        await page.getByRole('button', { name: /History/ }).click();
        await page.locator('.history-item-main').click();
        assert.equal(await page.locator('#url').inputValue(), 'https://example.com');
        await page.getByRole('button', { name: /History/ }).click();
        await page.locator('.history-item-delete').click();
        assert.equal(await page.locator('.history-item').count(), 0);
        assert.equal(state.requests.length, 1, 'deleting history must not submit the form');
    });
}

test('untrusted response and persisted history remain inert, with only HTTP(S) resource URLs', async t => {
    const state = await session(t);
    const attack = '<img src=x onerror="window.__xss=1">';
    const attribute = 'https://example.com/missing" onerror="window.__xss=1';
    Object.assign(state.fixture.data, {
        seo: { title: attack, canonical: 'javascript:window.__xss=1' },
        media: { favicon: attribute, logo: 'data:image/svg+xml,<svg onload="window.__xss=1"/>' },
        social: { x: 'javascript:window.__xss=1', github: attribute },
        technical: { originalUrl: 'https://example.com/', statusCode: attack, loadTime: attack },
        links: { internal: { total: attack, urls: [attribute, 'javascript:window.__xss=1'] }, external: { total: attack } },
        ai: { summary: { short: attack }, keyFacts: { detail: attack } },
        structuredData: [{ name: attack }]
    });
    await analyze(state);
    assert.equal(await state.page.locator('.summary-title').textContent(), attack);
    for (const scope of ['#resultsContainer', '#historyList']) {
        assert.equal(await state.page.locator(`${scope} [onerror], ${scope} [onmouseover], ${scope} script`).count(), 0);
        const urls = await state.page.locator(`${scope} a, ${scope} img`).evaluateAll(elements => elements.map(e => e.href || e.src));
        assert.ok(urls.every(url => /^https?:/.test(url)), urls.join('\n'));
    }
    assert.equal(await state.page.evaluate(() => window.__xss), 0);
    await state.page.reload();
    assert.equal(await state.page.locator('#historyList [onerror]').count(), 0);
    assert.equal(await state.page.evaluate(() => window.__xss), 0);
});

test('quota failures keep successful analysis visible and clear/delete failures stay recoverable', async t => {
    const state = await session(t, '/app', () => {
        localStorage.setItem('url-scraper-history', JSON.stringify([{ url: 'https://old.example.com', timestamp: new Date().toISOString() }]));
        Storage.prototype.setItem = Storage.prototype.removeItem = function () { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };
    });
    await analyze(state);
    assert.equal(await state.page.locator('#resultsContainer').isVisible(), true);
    assert.match(await state.page.locator('.toast-warning').innerText(), /history could not be updated/i);
    assert.equal(await state.page.locator('.toast-error').count(), 0);
    await state.page.getByRole('button', { name: /History/ }).click();
    await state.page.locator('.history-item-delete').click();
    assert.equal(await state.page.locator('.history-item').count(), 1);
    await state.page.getByRole('button', { name: 'Clear All' }).click();
    await state.page.getByRole('button', { name: 'Confirm', exact: true }).click();
    assert.equal(await state.page.locator('#resultsContainer').isVisible(), true);
    assert.equal(await state.page.locator('.history-item').count(), 1);
    assert.equal(state.requests.length, 1);
});

test('blocked storage and malformed saved history do not prevent startup or theme switching', async t => {
    for (const stored of ['{}', '[null, {"url":123}]', 'not JSON']) {
        const state = await session(t);
        await state.page.evaluate(value => localStorage.setItem('url-scraper-history', value), stored);
        await state.page.reload();
        await analyze(state);
        assert.equal(await state.page.locator('#resultsContainer').isVisible(), true);
    }
    const state = await session(t, '/app', () => {
        Storage.prototype.getItem = Storage.prototype.setItem = function () { throw new DOMException('Blocked', 'SecurityError'); };
    });
    await state.page.getByRole('button', { name: 'Toggle theme' }).click();
    assert.equal(await state.page.locator('html').getAttribute('data-theme'), 'light');
    await analyze(state);
    assert.equal(await state.page.locator('#resultsContainer').isVisible(), true);
});

test('JSON view, download and clipboard exports preserve the response without external viewers', async t => {
    const state = await session(t);
    await analyze(state);
    await state.page.locator('#copyDropdownBtn').click();
    await state.page.locator('[data-action=copy-json]').click();
    assert.deepEqual(JSON.parse(await state.page.evaluate(() => navigator.clipboard.readText())), state.fixture);
    await state.page.locator('#copyDropdownBtn').click();
    await state.page.getByRole('button', { name: 'Copy as Markdown for AI' }).click();
    assert.match(await state.page.evaluate(() => navigator.clipboard.readText()), /# Website Analysis Report/);
    const downloadEvent = state.page.waitForEvent('download');
    await state.page.getByRole('button', { name: 'Download JSON' }).click();
    const download = await downloadEvent;
    assert.deepEqual(JSON.parse(fs.readFileSync(await download.path(), 'utf8')), state.fixture);
    const popupEvent = state.context.waitForEvent('page');
    await state.page.getByRole('button', { name: 'View JSON' }).click();
    const popup = await popupEvent;
    await popup.waitForLoadState();
    assert.ok(popup.url().startsWith('blob:'), popup.url());
    assert.match(await popup.locator('body').innerText(), /Example & metadata/);
    assert.equal(state.external.some(url => url.includes('jsonlint') || url.includes('lz-string')), false);
});

test('API failures reset loading, show a useful error and allow a subsequent successful request', async t => {
    const state = await session(t);
    const cases = [
        { status: 502, json: { error: 'Upstream unavailable' }, message: 'Upstream unavailable' },
        { status: 200, body: '<html>bad response</html>', message: 'Invalid JSON response' },
        { status: 200, json: null, message: 'Analysis failed' },
        { status: 200, json: { success: false, error: 'Blocked by robots.txt' }, message: 'Blocked by robots.txt' }
    ];
    for (const item of cases) {
        state.api = route => route.fulfill({ status: item.status, ...(Object.hasOwn(item, 'json') ? { body: JSON.stringify(item.json), contentType: 'application/json' } : { body: item.body }) });
        await analyze(state);
        assert.match(await state.page.locator('.toast-error').last().innerText(), new RegExp(item.message.replace('.', '\\.')));
        assert.equal(await state.page.locator('#analyzeBtn').isEnabled(), true);
        assert.equal(await state.page.locator('#resultsContainer').isVisible(), false);
    }
    state.api = null;
    state.fixture = { success: true, data: { seo: { title: 'Partial metadata' }, ai: { error: 'Summary unavailable' } } };
    await analyze(state);
    assert.match(await state.page.locator('.ai-error').innerText(), /Summary unavailable/);
    assert.equal(await state.page.locator('#resultsContainer').isVisible(), true);
});

test('empty URLs and missing bot tokens do not call the API; an active request cannot be submitted twice', async t => {
    const state = await session(t);
    await state.page.locator('#url').press('Enter');
    assert.match(await state.page.locator('.toast-message').last().innerText(), /Enter a URL/);
    await state.page.evaluate(() => window.turnstile.getResponse = () => '');
    await state.page.locator('#url').fill('https://example.com');
    await state.page.locator('#url').press('Enter');
    assert.match(await state.page.locator('.toast-message').last().innerText(), /Turnstile/);
    assert.equal(state.requests.length, 0);
    let release;
    state.api = async route => { await new Promise(resolve => { release = resolve; }); return route.fulfill({ json: state.fixture }); };
    await state.page.evaluate(() => window.turnstile.getResponse = () => 'test-token');
    const pending = state.page.waitForRequest(`${origin}/api`);
    await state.page.locator('#url').press('Enter');
    await pending;
    await state.page.locator('#url').fill('https://changed.example.com');
    await state.page.waitForTimeout(350);
    assert.equal(await state.page.locator('#analyzeBtn').isDisabled(), true);
    await state.page.locator('#url').press('Enter');
    assert.equal(state.requests.length, 1);
    release();
    await state.page.waitForFunction(() => !document.querySelector('#analyzeBtn').disabled);
    assert.equal(new URL(state.page.url()).searchParams.get('url'), 'https://example.com');
});

test('confirmation is keyboard operable, traps focus and restores it on cancel', async t => {
    const state = await session(t);
    await state.page.getByRole('button', { name: 'Advanced Options' }).click();
    const toggle = state.page.locator('[name=ignoreRobots]');
    await toggle.focus();
    await toggle.press('Space');
    assert.equal(await state.page.getByRole('dialog').isVisible(), true);
    assert.equal(await state.page.evaluate(() => document.activeElement.id), 'confirmationCancel');
    await state.page.keyboard.press('Shift+Tab');
    assert.equal(await state.page.evaluate(() => document.activeElement.id), 'confirmationConfirm');
    await state.page.keyboard.press('Tab');
    assert.equal(await state.page.evaluate(() => document.activeElement.id), 'confirmationCancel');
    await state.page.keyboard.press('Escape');
    assert.equal(await toggle.isChecked(), false);
    assert.equal(await state.page.evaluate(() => document.activeElement.name), 'ignoreRobots');
});

test('mobile and desktop layouts retain usable controls in both themes', async t => {
    const state = await session(t);
    for (const width of [390, 1440]) {
        await state.page.setViewportSize({ width, height: 900 });
        if (width === 390) {
            await state.page.getByRole('button', { name: 'Toggle navigation' }).click();
            assert.equal(await state.page.getByRole('link', { name: 'Guides', exact: true }).first().isVisible(), true);
            await state.page.getByRole('button', { name: 'Toggle navigation' }).click();
        }
        await state.page.getByRole('button', { name: 'Advanced Options' }).click();
        for (const theme of ['light', 'dark']) {
            await state.page.getByRole('button', { name: 'Toggle theme' }).click();
            await state.page.waitForFunction(() => getComputedStyle(document.querySelector('#advancedOptions')).opacity === '1');
            const controls = await state.page.locator('.option-select').evaluateAll(elements => elements.map(el => {
                const box = el.getBoundingClientRect();
                return { left: box.left, right: box.right, width: box.width, height: box.height };
            }));
            assert.ok(controls.every(box => box.left >= 0 && box.right <= width && box.width > 100 && box.height >= 44));
            assert.equal(await state.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
            if (process.env.TEST_SCREENSHOTS) {
                fs.mkdirSync(process.env.TEST_SCREENSHOTS, { recursive: true });
                await state.page.screenshot({ path: path.join(process.env.TEST_SCREENSHOTS, `${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
            }
        }
        await state.page.getByRole('button', { name: 'Advanced Options' }).click();
    }
});
