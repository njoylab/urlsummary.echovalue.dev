const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { workspace, build } = require('./helpers.cjs');

const valid = { TURNSTILE_SITE_KEY: 'test-site-key', URL_SCRAPER_API_ENDPOINT: 'https://api.example.com/scrape' };

test('invalid build configuration fails without replacing a previous build', t => {
    const directory = workspace();
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.mkdirSync(path.join(directory, 'dist'));
    fs.writeFileSync(path.join(directory, 'dist', 'previous.txt'), 'previous build');
    for (const env of [{}, { TURNSTILE_SITE_KEY: valid.TURNSTILE_SITE_KEY },
        { ...valid, URL_SCRAPER_API_ENDPOINT: 'javascript:alert(1)' },
        { ...valid, URL_SCRAPER_API_ENDPOINT: 'https://user:password@example.com' },
        { ...valid, TURNSTILE_SITE_KEY: 'YOUR_TURNSTILE_SITE_KEY' }]) {
        const result = build(directory, env);
        assert.notEqual(result.status, 0);
        assert.equal(fs.readFileSync(path.join(directory, 'dist', 'previous.txt'), 'utf8'), 'previous build');
    }
});

test('.env config builds usable public assets; environment overrides it and JS injection stays literal', t => {
    const directory = workspace();
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.writeFileSync(path.join(directory, '.env'), `TURNSTILE_SITE_KEY=${valid.TURNSTILE_SITE_KEY}\nURL_SCRAPER_API_ENDPOINT=${valid.URL_SCRAPER_API_ENDPOINT}\n`);
    assert.equal(build(directory).status, 0);
    const output = path.join(directory, 'dist');
    for (const name of ['index.html', 'app.html']) {
        assert.match(fs.readFileSync(path.join(output, name), 'utf8'), /data-sitekey="test-site-key"/);
    }
    assert.match(fs.readFileSync(path.join(output, 'script.js'), 'utf8'), /https:\/\/api.example.com\/scrape/);
    assert.ok(fs.existsSync(path.join(output, '.well-known', 'api-catalog')));
    for (const privateFile of ['tests', '.github', '.env', 'package-lock.json', 'build.js', 'AGENTS.md']) {
        assert.equal(fs.existsSync(path.join(output, privateFile)), false, privateFile);
    }
    const endpoint = 'https://api.example.com/?q=";globalThis.injected=true;//$&';
    const result = build(directory, { URL_SCRAPER_API_ENDPOINT: endpoint });
    assert.equal(result.status, 0, result.stderr);
    const script = fs.readFileSync(path.join(output, 'script.js'), 'utf8');
    new vm.Script(script);
    const declaration = script.match(/^const API_ENDPOINT = .*;$/m)[0];
    const context = {};
    assert.equal(vm.runInNewContext(`${declaration}\nAPI_ENDPOINT`, context), endpoint);
    assert.equal(context.injected, undefined);
});
