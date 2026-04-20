const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

const siteKey =
    process.env.TURNSTILE_SITE_KEY ||
    process.env.CLOUDFLARE_TURNSTILE_SITE_KEY ||
    '';

const apiEndpoint =
    process.env.URL_SCRAPER_API_ENDPOINT ||
    process.env.API_ENDPOINT ||
    '';

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
    'robots.txt',
    'sitemap.xml',
    'site.webmanifest'
]);

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

function shouldSkipDirectory(dirName) {
    return dirName === 'dist' || dirName === 'node_modules' || dirName === 'functions';
}

const blockedRootFiles = new Set([
    'AGENTS.md',
    'CLAUDE.md',
    'README.md',
    'build.js',
    'package.json'
]);

function shouldCopyFile(relativePath, fileName, ext) {
    if (relativePath.startsWith('.well-known/')) {
        return ext === '.json' || ext === '.md';
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
            if (!siteKey) {
                console.warn(`TURNSTILE_SITE_KEY is not set; using placeholder in ${fileName}`);
            } else {
                output = output.replace(/YOUR_TURNSTILE_SITE_KEY/g, siteKey);
            }
        }
        fs.writeFileSync(destPath, output);
        return;
    }

    if (fileName === 'script.js') {
        const script = fs.readFileSync(sourcePath, 'utf8');
        const output = script.replace('__API_ENDPOINT__', apiEndpoint);
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
if (!siteKey) {
    console.warn('⚠️  TURNSTILE_SITE_KEY not set');
}
if (!apiEndpoint) {
    console.warn('⚠️  URL_SCRAPER_API_ENDPOINT not set');
}
