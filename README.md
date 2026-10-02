# kishpish.github.io

The source for my research site.

Static Astro site, content in Markdown, deployed to GitHub Pages by a workflow
on every push to `main`.

```
npm install
npm run dev        # http://localhost:4321/
npm run build      # writes dist/
npm run preview    # serves dist/ exactly as it will deploy
```

---

## Adding a post

Create a file in `src/content/posts/`. The filename becomes the URL, so
`src/content/posts/why-priors-are-not-free.md` is served at
`/writing/why-priors-are-not-free/`.

```markdown
---
title: "Why priors are not free"
description: "One or two lines. Used on the card, in search results, and on the social preview."
tags: ["inductive-bias", "bayesian"]
section: "Models & objectives"
status: "note"
---

Write the post here. Normal Markdown.

Inline math is $\nabla E(x)$ and display math is

$$p(x) \propto e^{-E(x)/T}$$

Both are rendered at build time, so no equation ever flashes in unstyled.
```

That is the whole process. Commit, push, and it is live. **You never have to
edit a component to add a post.**

### The frontmatter fields

| field | required | what it does |
| --- | --- | --- |
| `title` | yes | Post title, sentence case. |
| `description` | yes | One or two lines. Used on cards, in `<meta>`, and on the generated social image. |
| `tags` | yes | Lowercase, hyphenated. Each one gets its own page at `/writing/tags/<tag>/` automatically. |
| `section` | yes | Which group it appears under. Must match a section in `src/data/canonical.yaml` (see below). |
| `status` | yes | `note`, `essay`, or `in progress`. |
| `related` | no | Slugs of other posts to link at the foot, e.g. `["energy-is-a-modeling-choice"]`. |
| `order` | no | Position within its section. Lower sorts first. Without it, posts sort alphabetically by title. |
| `draft` | no | `true` keeps the post out of the build entirely. |

There is deliberately **no `date` field**. The writing section is organized by
subject and depth, not recency, and nothing on the site sorts by time.

### Sections

Sections, their order, and the one-line subtitle under each heading live in
`src/data/canonical.yaml` under `writing.sections`. To add one:

```yaml
writing:
  sections:
    - name: Models & objectives
      slug: models-and-objectives
      subtitle: What a model is actually optimizing, and what that costs.
```

A post whose `section` is not listed still renders. It appears at the end,
without a subtitle.

### Publishing something rough

Set `status: "in progress"`. It moves into its own section at the foot of
`/writing/`, gets a dashed badge, and carries a note at the top of the post
saying it is unfinished. Nothing else changes.

---

## Updating the CV

Replace `public/cv.pdf`. That is it.

The link is at `/cv.pdf` and appears in the header, the hero, the footer, the
research page, the publications page, and the about page. The "updated" date
next to it is read from git history (`git log -1 --format=%cs -- public/cv.pdf`)
at build time, so it cannot go stale.

```bash
cp ~/Downloads/Krishiv_Potluri_CV.pdf public/cv.pdf
git add public/cv.pdf && git commit -m "Update CV" && git push
```

If git history is not available at build time, the build falls back to
`cv.updated_fallback` in `src/data/canonical.yaml`.

---

## Changing a fact about me

Everything factual reads from **`src/data/canonical.yaml`**: name, affiliation,
contact, publications and their status, honors, positions, methods, the Notion
posts, and the writing sections. Nothing factual is hardcoded in a component.

The file is schema-validated at build time (`src/lib/canonical.ts`), so a typo
or a missing field fails the build with a message rather than shipping a broken
page.

Common edits:

- **A paper gets accepted.** Change its `status` from `under-review` to
  `accepted`. The badge, the sort order, and the JSON-LD all follow.
- **A new paper.** Add an entry to `publications`. Set `project:` to a research
  slug to link it to that project page.
- **A new honor.** Add to `honors`. Set `featured: true` to show it on the home
  page as well as the about page.
- **A Notion post moves or should come down.** Edit or set `hidden: true` on its
  entry under `notion.posts`.

### The conflicts block

My CV, resume, and activities list disagreed with each other in eight places.
Each one is recorded under `conflicts:` with every source version, what the site
shows, and why. The colophon page renders this table, so the disagreements are
public rather than quietly resolved.

If you correct one, change both the `conflicts` entry and the field it governs
(each conflicting field has a `# See conflicts.<key>` comment next to it).

---

## Adding a research project

Create a file in `src/content/research/`. The filename becomes the URL.
Frontmatter carries the ten-second version; the body carries the depth.

```markdown
---
title: "The full project title"
short: "Short name"          # for cards, nav, and the home-page index
order: 6                     # position in the list
period: "2026"
role: "First author"
kind: independent            # or: lab
paper: my-paper-id           # optional, an id from canonical.yaml publications
honor: "1st Place, Somewhere" # optional badge
question: "The plain-language question a non-specialist could follow."
problem: >-
  What is actually hard here.
approach: >-
  What you did about it.
result: >-
  What came out, stated at the strength the evidence supports.
headline: "449 people"       # compact number for the home-page index
evidence:
  - value: "0.23"
    label: "median ρ on held-out individuals"
figure:                      # optional
  id: my-figure
  caption: "What the reader is looking at."
  alt: "A description for someone who cannot see it."
links:
  - { label: code, href: "https://github.com/..." }
related: ["a-post-slug"]
landscape: >-
  One line on how this project is a landscape problem.
---

The body. Markdown, with math and tables.
```

### Adding a figure to a project

Figures are plain SVG generated from real data at build time. No chart library.

1. Put the data in `src/data/figures/<id>.json`. Keep it small and rounded, and
   include a `source` field naming where the numbers came from.
2. Write a component at `src/components/figures/<Name>.astro`. Use the scales
   and palette in `src/lib/figures/plot.ts`. The existing four are the pattern.
3. Register it in the map in `src/components/ProjectFigure.astro`.
4. Reference it from the project's frontmatter as `figure.id`.

The caption must describe what is plotted accurately, including sample sizes.

---

## How it is put together

```
src/
  data/
    canonical.yaml       every fact on the site, schema-validated
    figures/*.json       data behind the project figures
  content/
    posts/*.md           the writing section
    research/*.md        one file per project
  lib/
    canonical.ts         loads and validates canonical.yaml
    posts.ts             ordering, grouping, reading time, neighbours
    urls.ts              base-path-aware links (url() and absolute())
    og.ts                social card generation
    landscape/           the energy landscape: potential, contours,
                         string method, Langevin + metadynamics
    figures/plot.ts      scales, ticks, formatting, palette
  components/            UI, including figures/
  pages/                 routes
  scripts/landscape.ts   the live hero animation (browser)
  styles/global.css      design tokens and base styles
scripts/
  check-links.mjs        every internal link and anchor resolves
  audit-content.mjs      no em dashes, no post dates, head and headings clean
```

### The figure on the front page

It is the Müller-Brown potential, computed rather than drawn. The
[colophon](https://kishpish.github.io/colophon/) explains why
it is there and what every mark in it means.

Everything is server-rendered SVG. The canvas animation is an enhancement that
only runs when the browser allows motion, and the static figure underneath is
complete on its own.

### House rules

- **No em dashes** in any prose. Commas, colons, parentheses, full stops.
  `npm run audit` fails the build if one appears.
- **No dates on posts.** Also enforced by `npm run audit`.
- **Content in Markdown, never in components.** If adding a post means editing
  JSX, something has gone wrong.
- **Every number on the site is defensible** and traceable to
  `canonical.yaml`, a figure's data file, or a linked paper.

---

## Deploying

Pushing to `main` builds and deploys. One-time setup:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Push to `main`.

The workflow (`.github/workflows/deploy.yml`) takes the site URL and base path
from `actions/configure-pages`, so it works unchanged at
`https://<user>.github.io/<repo>/`.

### A custom domain later

1. Add the domain in **Settings → Pages → Custom domain**, and point your DNS at
   GitHub Pages.
2. Add a `public/CNAME` file containing just the domain.

No code change. `configure-pages` reports a base path of `/` for a custom
domain, and every internal link already goes through `url()`.

### Checks before you push

```bash
npm run check        # TypeScript and Astro diagnostics
npm run build
npm run check:links  # every internal link and anchor resolves
npm run audit        # em dashes, post dates, meta tags, headings, alt text
```

`npm run check` also runs in CI, so a type error fails the deploy rather than
shipping.

---

## License

Code is MIT. Site content, including the writing and the research descriptions,
is &copy; Krishiv Potluri.

Bundled fonts are subsets of Lato (© Łukasz Dziedzic) and IBM Plex Mono
(© IBM Corp.), both under the SIL Open Font License 1.1. The license is at
`public/fonts/OFL.txt`.
