// Every glyph on the site, defined once.
//
// All of them are single filled paths on a 24 unit grid, so a row that mixes a
// brand mark with a drawn one still reads as one family. A stroked icon next to
// a solid logo is the thing that makes an icon row look assembled from two
// sources, which is why there are none here.

export const ICON: Record<string, string> = {
  // Brand marks, in their official single-path form.
  github:
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z',
  orcid:
    'M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378a.947.947 0 1 1 0 1.894.947.947 0 0 1 0-1.894zm-.722 3.038h1.444v10.041H6.647zm3.562 0h3.9c3.712 0 5.344 2.653 5.344 5.025 0 2.578-2.016 5.025-5.325 5.025h-3.919zm1.444 1.303v7.444h2.297c2.359 0 3.588-1.444 3.588-3.722 0-2.016-1.088-3.722-3.722-3.722z',
  scholar:
    'M5.242 13.769 0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5s-5.548 1.749-6.758 4.269zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z',
  x: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',

  // Drawn here, solid like the marks above.
  email:
    'M1.5 6.75A1.5 1.5 0 0 1 3 5.25h18a1.5 1.5 0 0 1 1.5 1.5v.43l-10.11 6.07a.75.75 0 0 1-.78 0L1.5 7.18zm0 2.18v8.32A1.5 1.5 0 0 0 3 18.75h18a1.5 1.5 0 0 0 1.5-1.5V8.93l-9.34 5.6a2.25 2.25 0 0 1-2.32 0z',
  /** a page with a turned corner and a few lines of type on it */
  paper:
    'M5 2.25h8.19a.75.75 0 0 1 .53.22l5.06 5.06c.14.14.22.33.22.53V21a.75.75 0 0 1-.75.75H5A.75.75 0 0 1 4.25 21V3A.75.75 0 0 1 5 2.25zm8.75 1.81V7.5a.5.5 0 0 0 .5.5h3.44zM7.6 11.6h8.8a.7.7 0 0 1 0 1.4H7.6a.7.7 0 0 1 0-1.4zm0 3.4h8.8a.7.7 0 0 1 0 1.4H7.6a.7.7 0 0 1 0-1.4zm0 3.4h5.4a.7.7 0 0 1 0 1.4H7.6a.7.7 0 0 1 0-1.4z',
  /** angle brackets, for a repository that is not on GitHub */
  code: 'M8.4 4.3a1 1 0 0 1 .3 1.4L4.2 12l4.5 6.3a1 1 0 1 1-1.6 1.2l-5-7a1 1 0 0 1 0-1.2l5-7a1 1 0 0 1 1.3-.3zm7.2 0a1 1 0 0 1 1.4.3l5 7a1 1 0 0 1 0 1.2l-5 7a1 1 0 1 1-1.6-1.2l4.5-6.3-4.5-6.3a1 1 0 0 1 .2-1.4z',
  /** a rosette, for a prize or a judged award */
  award:
    'M12 1.75a6.25 6.25 0 1 1 0 12.5 6.25 6.25 0 0 1 0-12.5zm0 2a4.25 4.25 0 1 0 0 8.5 4.25 4.25 0 0 0 0-8.5zM7.3 14.9l-1.55 6.1a.6.6 0 0 0 .87.67L12 19l5.38 2.67a.6.6 0 0 0 .87-.67l-1.55-6.1a8.2 8.2 0 0 1-9.4 0z',
  /** a box with an arrow leaving it, for anything else off the site */
  external:
    'M14 3.25h6.75a.75.75 0 0 1 .75.75v6.75a1 1 0 1 1-2 0V6.66l-7.3 7.3a1 1 0 0 1-1.42-1.42l7.3-7.29H14a1 1 0 1 1 0-2zM4.75 6.5h4.5a1 1 0 1 1 0 2H5.75v9.75h9.75V14.5a1 1 0 1 1 2 0v4.75a.75.75 0 0 1-.75.75H4.75a.75.75 0 0 1-.75-.75V7.25a.75.75 0 0 1 .75-.75z',
};

export type LinkKind = 'paper' | 'code' | 'award' | 'external';

/**
 * What kind of thing a link points at, decided from the address first and the
 * label only as a fallback, because a host is a fact and a label is a choice.
 */
export function linkKind(label: string, href: string): LinkKind {
  const h = href.toLowerCase();
  const l = label.toLowerCase();
  if (h.includes('github.com')) return 'code';
  if (h.includes('biorxiv') || h.includes('arxiv') || h.includes('doi.org') || h.endsWith('.pdf')) return 'paper';
  if (l.includes('preprint') || l.includes('paper') || l.includes('pdf')) return 'paper';
  if (l.includes('code') || l.includes('repo')) return 'code';
  if (l.includes('award') || l.includes('isef') || l.includes('prize') || l.includes('finalist')) return 'award';
  return 'external';
}

export const KIND_ICON: Record<LinkKind, string> = {
  paper: 'paper',
  code: 'github',
  award: 'award',
  external: 'external',
};

/**
 * A preprint and the code behind it are the two things a reader actually came
 * for, so they carry the weight. Everything else is supporting material and is
 * drawn quieter, which is the only way the first two can read as primary.
 */
export function linkTier(kind: LinkKind): 'primary' | 'secondary' {
  return kind === 'paper' || kind === 'code' ? 'primary' : 'secondary';
}
