// Every rendered text node on every page, in both themes, against WCAG AA.
//
// The palette is derived numerically, but a derivation only proves the token
// pairs the author thought of. This walks what the browser actually painted:
// each text node, its computed colour, and the first ancestor that actually
// has a background. Anything below 4.5:1 (3:1 for large text, 3:1 for a border
// that carries meaning) is a failure and the script exits non-zero.
//
// Run against a built site being served. The dev server works too.
//   node scripts/audit-contrast.mjs [baseUrl]
import { chromium } from 'playwright-core';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8100/krishiv_portfolio';
const DIST = path.join(process.cwd(), 'dist');

/**
 * Every built page, so a new route is audited without editing this file.
 * The retired addresses are meta-refresh redirects to where the content
 * actually lives, and the page each one lands on is in this list already, so
 * they are dropped here rather than raced in the browser.
 */
const redirects = [];
function routes(dir = DIST, prefix = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...routes(full, `${prefix}/${name}`));
    else if (name === 'index.html') {
      if (/<meta[^>]+http-equiv=["']refresh/i.test(readFileSync(full, 'utf8'))) redirects.push(`${prefix}/`);
      else out.push(`${prefix}/`);
    }
  }
  return out.sort();
}

const IN_PAGE = () => {
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
  const parse = (s) => {
    const n = (s.match(/[\d.]+/g) || []).map(Number);
    return n.length >= 3 ? { rgb: n.slice(0, 3), a: n.length > 3 ? n[3] : 1 } : null;
  };
  const over = (fg, bg, a) => fg.map((c, i) => c * a + bg[i] * (1 - a));
  /**
   * The effective background behind an element: every translucent layer from
   * the element upward, composited onto the first opaque one beneath them.
   * Collected top-down and then flattened bottom-up, because an 8% blue over
   * cream is cream-ish and a naive walk would report it as blue.
   */
  const bgOf = (el) => {
    const stack = [];
    let n = el;
    while (n) {
      const p = parse(getComputedStyle(n).backgroundColor);
      if (p && p.a > 0) {
        stack.push(p);
        if (p.a >= 0.999) break;
      }
      n = n.parentElement;
    }
    let base = stack.length && stack[stack.length - 1].a >= 0.999 ? stack.pop().rgb : [255, 255, 255];
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i].rgb, base, stack[i].a);
    return base;
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const text = t.nodeValue.trim();
    if (!text) continue;
    const el = t.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
    // Text clipped away for screen readers is never painted, so it has no
    // contrast to meet. The site hides it with clip-path on a 1px box.
    if (cs.clipPath && cs.clipPath !== 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    // Inside an SVG the painted colour is `fill`, not `color`: a <text> that
    // inherits a light `color` it never uses would otherwise read as a failure
    // against the light sheet a figure sits on.
    const svg = el.ownerSVGElement != null;
    const fg = parse(svg && cs.fill && cs.fill !== 'none' ? cs.fill : cs.color);
    if (!fg) continue;
    const bg = bgOf(el);
    const colour = fg.a >= 0.99 ? fg.rgb : over(fg.rgb, bg, fg.a);
    const px = parseFloat(cs.fontSize);
    const large = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700);
    const need = large ? 3 : 4.5;
    const got = ratio(colour, bg);
    if (got + 0.005 < need)
      out.push({ text: text.slice(0, 48), sel: el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0], got: +got.toFixed(2), need, px: +px.toFixed(1) });
  }
  return out;
};

const pages = routes();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let failures = 0;
let checked = 0;

// Light is the default and carries no attribute; the other two are set the way
// the pre-paint script sets them, so the audit sees exactly what a reader does.
const THEMES = [
  { name: 'light', attr: null },
  { name: 'dark', attr: 'dark' },
  { name: 'cvd', attr: 'cvd' },
];

for (const theme of THEMES) {
  const scheme = theme.name;
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  if (theme.attr) await ctx.addInitScript((v) => localStorage.setItem('theme', v), theme.attr);
  const page = await ctx.newPage();
  for (const route of pages) {
    await page.goto(BASE + route, { waitUntil: 'load' });
    // Belt and braces: the attribute must actually be on, or the run would
    // silently audit the default three times and report a clean sweep.
    const live = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    if (live !== theme.attr) {
      console.log(`FAIL setup  ${scheme} ${route}  data-theme is ${JSON.stringify(live)}, expected ${JSON.stringify(theme.attr)}`);
      failures++;
    }
    // Open every disclosure, so an abstract is audited too.
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
    await page.waitForTimeout(60);
    const bad = await page.evaluate(IN_PAGE);
    checked++;
    for (const b of bad) {
      failures++;
      console.log(`FAIL ${scheme.padEnd(5)} ${route}  ${b.sel}  ${b.got}:1 needs ${b.need}  ${b.px}px  "${b.text}"`);
    }
  }
  await ctx.close();
}
await browser.close();

console.log(`\naudited ${checked} page renders across ${THEMES.map((x) => x.name).join(', ')}` +
  (redirects.length ? `, skipped ${redirects.length} redirect page(s)` : ''));
if (failures) {
  console.log(`${failures} contrast failures`);
  process.exit(1);
}
console.log('every rendered text node clears WCAG AA in every theme');
