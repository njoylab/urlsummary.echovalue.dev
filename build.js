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

const entries = fs.readdirSync(rootDir, { withFileTypes: true });

for (const entry of entries) {
    if (!entry.isFile()) {
        continue;
    }

    const fileName = entry.name;
    if (fileName.startsWith('.')) {
        continue;
    }

    const ext = path.extname(fileName);
    const shouldCopy = allowedExtensions.has(ext) || allowedNames.has(fileName);

    if (!shouldCopy) {
        continue;
    }

    const sourcePath = path.join(rootDir, fileName);
    const destPath = path.join(distDir, fileName);

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
        continue;
    }

    if (fileName === 'script.js') {
        const script = fs.readFileSync(sourcePath, 'utf8');
        const output = script.replace('__API_ENDPOINT__', apiEndpoint);
        fs.writeFileSync(destPath, output);
        continue;
    }

    fs.copyFileSync(sourcePath, destPath);
}

console.log('Build completed successfully!');
console.log(`Output directory: ${distDir}`);
if (!siteKey) {
    console.warn('⚠️  TURNSTILE_SITE_KEY not set');
}
if (!apiEndpoint) {
    console.warn('⚠️  URL_SCRAPER_API_ENDPOINT not set');
}
