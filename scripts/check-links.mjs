// Walk dist/ and verify that every internal link, image, and stylesheet
// resolves to a file that was actually built, and that every in-page anchor
// points at an id that exists. Run after `npm run build`.
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
if (!fs.existsSync(DIST)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(DIST);

// dist/ is the site root, but links carry the deployed base path, so strip it.
const BASE = (process.env.BASE_PATH ?? '/krishiv_portfolio').replace(/\/$/, '');

const exists = (rel) => {
  let clean = decodeURIComponent(rel.split('?')[0].split('#')[0]);
  if (BASE && (clean === BASE || clean.startsWith(BASE + '/'))) clean = clean.slice(BASE.length) || '/';
  const abs = path.join(DIST, clean);
  if (fs.existsSync(abs)) {
    return fs.statSync(abs).isFile() || fs.existsSync(path.join(abs, 'index.html'));
  }
  return fs.existsSync(abs.replace(/\/$/, '') + '/index.html');
};

const problems = [];
let internal = 0;
let external = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const page = '/' + path.relative(DIST, file).replace(/\\/g, '/');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (!url || url.startsWith('data:') || url.startsWith('mailto:') || url.startsWith('tel:')) continue;
    if (/^https?:\/\//.test(url)) {
      external++;
      continue;
    }
    if (url.startsWith('#')) {
      const id = decodeURIComponent(url.slice(1));
      if (id && !ids.has(id)) problems.push(`${page}: anchor ${url} has no matching id`);
      continue;
    }
    if (!url.startsWith('/')) continue; // relative assets are emitted by the bundler
    internal++;
    if (!exists(url)) problems.push(`${page}: ${url} does not exist in dist/`);
  }
}

console.log(`checked ${htmlFiles.length} pages, ${internal} internal links, ${external} external links`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of [...new Set(problems)]) console.error('  ' + p);
  process.exit(1);
}
console.log('all internal links and anchors resolve');
