const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

function workspace() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'urlsummary-test-'));
    fs.cpSync(path.resolve(__dirname, '..'), directory, {
        recursive: true,
        filter: source => !['.git', 'node_modules', 'dist', '.env', 'test-results'].includes(path.basename(source))
    });
    return directory;
}

function build(directory, variables = {}) {
    const env = { ...process.env };
    for (const key of ['TURNSTILE_SITE_KEY', 'CLOUDFLARE_TURNSTILE_SITE_KEY', 'URL_SCRAPER_API_ENDPOINT', 'API_ENDPOINT']) {
        delete env[key];
    }
    return spawnSync(process.execPath, ['build.js'], { cwd: directory, env: { ...env, ...variables }, encoding: 'utf8' });
}

module.exports = { workspace, build };
