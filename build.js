const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

const envFile = path.join(rootDir, '.env');
if (fs.existsSync(envFile)) {
    process.loadEnvFile(envFile);
}

const siteKey =
    process.env.TURNSTILE_SITE_KEY ||
    process.env.CLOUDFLARE_TURNSTILE_SITE_KEY ||
    '';

const apiEndpoint =
    process.env.URL_SCRAPER_API_ENDPOINT ||
    process.env.API_ENDPOINT ||
    '';

if (!siteKey || siteKey === 'YOUR_TURNSTILE_SITE_KEY' || !/^[a-zA-Z0-9_-]+$/.test(siteKey)) {
    throw new Error('Set a valid TURNSTILE_SITE_KEY in the environment or .env before building.');
}

let parsedEndpoint;
try {
    parsedEndpoint = new URL(apiEndpoint);
} catch (error) {
    throw new Error('Set URL_SCRAPER_API_ENDPOINT to an absolute HTTP(S) URL before building.');
}
if (!['http:', 'https:'].includes(parsedEndpoint.protocol) || parsedEndpoint.username || parsedEndpoint.password) {
    throw new Error('URL_SCRAPER_API_ENDPOINT must be an HTTP(S) URL without credentials.');
}

const allowedExtensions = new Set([
    '.html',
    '.css',
    '.js',
    '.json',
    '.md',
    '.png',
    '.ico',
    '.svg',
    '.webmanifest',
    '.txt',
    '.xml'
]);

const allowedNames = new Set([
    '_headers',
    'robots.txt',
    'sitemap.xml',
    'site.webmanifest'
]);

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

function shouldSkipDirectory(dirName) {
    return ['dist', 'node_modules', 'functions', 'tests', 'test-results', 'coverage'].includes(dirName);
}

const blockedRootFiles = new Set([
    'AGENTS.md',
    'CLAUDE.md',
    'README.md',
    'build.js',
    'package.json',
    'package-lock.json'
]);

function shouldCopyFile(relativePath, fileName, ext) {
    if (relativePath.startsWith('.well-known/')) {
        return ext === '.json' || ext === '.md' || fileName === 'api-catalog';
    }

    if (blockedRootFiles.has(fileName)) {
        return false;
    }

    return allowedExtensions.has(ext) || allowedNames.has(fileName);
}

function copyEntry(sourcePath, relativePath = '') {
    const stats = fs.statSync(sourcePath);
    const fileName = path.basename(sourcePath);

    if (stats.isDirectory()) {
        if (fileName.startsWith('.') && fileName !== '.well-known') {
            return;
        }
        if (shouldSkipDirectory(fileName)) {
            return;
        }

        const entries = fs.readdirSync(sourcePath, { withFileTypes: true });
        for (const entry of entries) {
            copyEntry(path.join(sourcePath, entry.name), path.join(relativePath, entry.name));
        }
        return;
    }

    if (fileName.startsWith('.') && !relativePath.startsWith('.well-known')) {
        return;
    }

    const ext = path.extname(fileName);
    if (!shouldCopyFile(relativePath, fileName, ext)) {
        return;
    }

    const destPath = path.join(distDir, relativePath);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    if (ext === '.html') {
        const html = fs.readFileSync(sourcePath, 'utf8');
        let output = html;
        if (html.includes('YOUR_TURNSTILE_SITE_KEY')) {
            output = output.replace(/YOUR_TURNSTILE_SITE_KEY/g, siteKey);
        }
        fs.writeFileSync(destPath, output);
        return;
    }

    if (fileName === 'script.js') {
        const script = fs.readFileSync(sourcePath, 'utf8');
        const output = script.replace("'__API_ENDPOINT__'", () => JSON.stringify(apiEndpoint));
        fs.writeFileSync(destPath, output);
        return;
    }

    fs.copyFileSync(sourcePath, destPath);
}

const rootEntries = fs.readdirSync(rootDir, { withFileTypes: true });
for (const entry of rootEntries) {
    copyEntry(path.join(rootDir, entry.name), entry.name);
}

console.log('Build completed successfully!');
console.log(`Output directory: ${distDir}`);
