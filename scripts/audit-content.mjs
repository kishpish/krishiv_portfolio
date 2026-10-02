// House rules for prose on this site, checked against the built HTML:
//   1. No em dashes anywhere in visible text.
//   2. No dates presented on blog posts.
//   3. Every page has a title, a meta description, a canonical URL, and an OG image.
//   4. Exactly one h1 per page, and no skipped heading levels.
//   5. Every img has an alt attribute.
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
if (!fs.existsSync(DIST)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) files.push(p);
  }
})(DIST);

/** Visible text only: drop script, style, and svg contents, then tags. */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

const problems = [];

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const page = '/' + path.relative(DIST, file).replace(/\\/g, '/');
  const text = visibleText(html);

  // 1. em dashes
  for (const m of text.matchAll(/[^\s]{0,28}—[^\s]{0,28}/g)) {
    problems.push(`${page}: em dash in prose near "${m[0].trim()}"`);
  }

  // 2. no dates on writing pages
  if (page.startsWith('/writing/')) {
    const body = html.replace(/<footer[\s\S]*$/, '');
    const bodyText = visibleText(body);
    const datey =
      // "Published on 3 May 2025", "Posted 2025-05-03"
      /\b(published|posted|written)\s+(on\s+)?(\d|[A-Z][a-z]{2})/.test(bodyText) ||
      // a bare ISO date or "3 May 2025" / "May 3, 2025" in the body
      /\b(19|20)\d{2}-\d{2}-\d{2}\b/.test(bodyText) ||
      /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(19|20)\d{2}\b/.test(bodyText) ||
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+(19|20)\d{2}\b/.test(bodyText) ||
      /<time[^>]*datetime="(19|20)\d{2}-\d{2}-\d{2}"/.test(body);
    if (datey) problems.push(`${page}: looks like it shows a date on a post`);
  }

  // 3. head essentials
  if (!/<title>[^<]{3,}<\/title>/.test(html)) problems.push(`${page}: missing or empty <title>`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(html)) problems.push(`${page}: missing meta description`);
  if (!/<link rel="canonical"/.test(html)) problems.push(`${page}: missing canonical link`);
  if (!/<meta property="og:image"/.test(html)) problems.push(`${page}: missing og:image`);

  // 4. headings
  const h1s = [...html.matchAll(/<h1[\s>]/g)].length;
  if (h1s !== 1) problems.push(`${page}: has ${h1s} h1 elements, expected exactly 1`);
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      problems.push(`${page}: heading level jumps from h${levels[i - 1]} to h${levels[i]}`);
      break;
    }
  }

  // 5. images need alt text
  for (const m of html.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/g)) {
    problems.push(`${page}: <img> without alt: ${m[0].slice(0, 90)}`);
  }
}

console.log(`audited ${files.length} pages`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of [...new Set(problems)].slice(0, 60)) console.error('  ' + p);
  process.exit(1);
}
console.log('no em dashes, no post dates, head and headings clean, all images have alt text');
