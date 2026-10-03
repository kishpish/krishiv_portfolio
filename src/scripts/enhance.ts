// Progressive enhancement that has to survive client-side navigation.
//
// With <ClientRouter /> in the layout, a module script in the body runs once
// for the whole session, not once per page, so everything here is wired to
// `astro:page-load`. That event fires on the first load as well as after each
// client-side navigation, which makes it the one correct hook for both.
import { initAllLandscapes } from './landscape';
import { initAllPitchLabs } from './pitch';

/** Elements that reveal on scroll. Blocks and cards, never prose paragraphs. */
const REVEAL_SELECTOR = [
  '[data-reveal]',
].join(',');

let observer: IntersectionObserver | null = null;

function initReveal(): void {
  // Reduced motion gets no observer at all: the CSS already renders everything
  // at full opacity, and starting an observer would only add work.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  // The hiding rule in global.css is scoped to this class, so it is added only
  // now, once we know the observer is about to run. A reader with scripts off
  // never gets here and never has anything hidden from them.
  document.documentElement.classList.add('js-reveal');

  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer?.unobserve(entry.target); // fire once, never on scroll back up
      }
    },
    // Start slightly before the element is actually in view, and accept a
    // sliver so tall blocks do not wait until they are fully on screen.
    { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
  );

  for (const el of document.querySelectorAll(REVEAL_SELECTOR)) {
    if (el.classList.contains('is-in')) continue;
    observer.observe(el);
  }

  // A deep link such as /research/#tem171-inhibitors must not land on a
  // section that is still waiting to be revealed, so the target and all of its
  // ancestors are shown immediately.
  revealHashTarget();
}

function revealHashTarget(): void {
  const id = location.hash.slice(1);
  if (!id) return;
  let el = document.getElementById(id) as HTMLElement | null;
  while (el) {
    if (el.hasAttribute('data-reveal')) {
      el.classList.add('is-in');
      observer?.unobserve(el);
    }
    el = el.parentElement;
  }
}

function boot(): void {
  initAllLandscapes();
  initAllPitchLabs();
  initReveal();
}

// `astro:page-load` covers the first paint and every client-side navigation.
document.addEventListener('astro:page-load', boot);

// If the router is not present for any reason, nothing would ever call boot,
// so run it directly too. Both paths are idempotent.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

window.addEventListener('hashchange', revealHashTarget);
