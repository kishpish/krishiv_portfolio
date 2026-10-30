// Light, dark, or the system's answer.
//
// The attribute that actually drives the palette is set by an inline script in
// the <head>, before the first paint, so there is no flash of the wrong theme.
// Everything here is the part that can wait: the button, its label, and keeping
// the two in step when the preference changes under us.
//
// Rules:
//   - `data-theme` absent means "follow the system", which is the default and
//     is also what a reader with no JavaScript gets, because the stylesheet
//     carries a prefers-color-scheme rule of its own.
//   - Nothing here reads or writes the theme except through `apply`, so the
//     attribute, the stored value, the button label and the theme-color meta
//     can never drift apart.
//   - If storage throws, which it does in private mode and with site data
//     blocked, the toggle still works for the life of the page.

export type Mode = 'light' | 'dark' | 'cvd';

const KEY = 'theme';
/** Cream first, because that is the site. */
const ORDER: Mode[] = ['light', 'dark', 'cvd'];
const DEFAULT: Mode = 'light';
const LABEL: Record<Mode, string> = {
  light: 'Light theme',
  dark: 'Dark theme',
  cvd: 'Colour-safe theme',
};
/** What the browser chrome should match, so the address bar is not the one
 *  light rectangle left on a dark page. */
const THEME_COLOR: Record<Mode, string> = {
  light: '#f6f1e5',
  dark: '#191711',
  cvd: '#f6f1e5',
};

export function stored(): Mode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'cvd') return v;
  } catch {
    // Private mode, or site data blocked. The default is the answer.
  }
  return DEFAULT;
}

function paint(mode: Mode): void {
  const root = document.documentElement;
  // The default needs no attribute: :root is already the cream theme, which is
  // also what a reader with no JavaScript gets.
  if (mode === DEFAULT) root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLOR[mode];
}

function label(mode: Mode): void {
  for (const b of document.querySelectorAll<HTMLElement>('[data-theme-toggle]')) {
    b.hidden = false;
    const span = b.querySelector<HTMLElement>('[data-theme-label]');
    if (span) span.textContent = LABEL[mode];
    // The visible label is the accessible name on a wide screen and is hidden
    // on a narrow one, so the name is carried here as well and is correct in
    // both cases.
    b.setAttribute('title', `${LABEL[mode]}. Click to change.`);
    b.setAttribute('aria-label', `${LABEL[mode]}. Click to change.`);
  }
}

export function apply(mode: Mode, persist: boolean): void {
  paint(mode);
  label(mode);
  if (!persist) return;
  try {
    // The default is stored as an absence, so a reader who cycles back to it
    // is not pinned to it if the default ever moves.
    if (mode === DEFAULT) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
  } catch {
    // Not fatal: the choice holds for this page either way.
  }
}

let wired = false;
let current: Mode = DEFAULT;

export function initTheme(): void {
  current = stored();
  // The inline script already set the attribute; this re-runs it so the label,
  // the title and the meta are correct, and so a client-side navigation that
  // replaced the header gets its button back.
  apply(current, false);

  if (wired) return;
  wired = true;

  // Delegated, so it survives the header being swapped out by the router.
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const btn = target?.closest?.('[data-theme-toggle]');
    if (!btn) return;
    current = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
    apply(current, true);
    notify();
  });
}

/**
 * Canvases read their colours out of CSS custom properties once, at startup,
 * because reading a computed style every frame is not free. They need telling
 * when those properties change underneath them.
 */
function notify(): void {
  document.dispatchEvent(new CustomEvent('theme:change', { detail: { theme: current } }));
}
