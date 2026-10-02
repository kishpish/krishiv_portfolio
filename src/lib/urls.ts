// Every internal link goes through url(), so the site works at the root of
// https://kishpish.github.io, under a project-page subpath, and on a custom domain.
const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

/** Base-aware internal URL. Pass a root-relative path such as "/writing/". */
export function url(path = '/'): string {
  return BASE + path.replace(/^\/+/, '');
}

/** Absolute URL on the deployed site, for canonical links, OG tags, RSS, and JSON-LD. */
export function absolute(path = '/'): string {
  return new URL(url(path), import.meta.env.SITE).toString();
}

/** Strip the base from a pathname, for comparing the current page to nav items. */
export function stripBase(pathname: string): string {
  const b = BASE.replace(/\/$/, '');
  return b && pathname.startsWith(b) ? pathname.slice(b.length) || '/' : pathname;
}
