import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Posts: the frontmatter contract from src/content/posts/_README.md.
// Files starting with "_" are ignored, so _README.md and _template.md are safe.
const posts = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!**/_*.md'], base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    section: z.string(),
    status: z.enum(['note', 'essay', 'in progress']),
    // Optional additions to the original schema:
    related: z.array(z.string()).optional(), // slugs of posts to cross-link at the foot
    order: z.number().optional(), // position within its section (lower first)
    draft: z.boolean().optional(), // true keeps a post out of the build entirely
  }),
});

// Research projects: one Markdown file per project. Frontmatter holds the
// ten-second version; the body holds the depth.
const research = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!**/_*.md'], base: './src/content/research' }),
  schema: z.object({
    title: z.string(),
    short: z.string(), // short name for cards and nav
    order: z.number(),
    period: z.string(),
    role: z.string(), // e.g. "First author" or "Student researcher, Oden Institute"
    kind: z.enum(['lab', 'independent']),
    status: z.string().optional(), // free text when there is no paper yet, e.g. "in progress"
    paper: z.string().optional(), // publication id in canonical.yaml
    honor: z.string().optional(), // one-line badge, e.g. "Regeneron ISEF 2025 Finalist"
    /** Two or three sentences of technical description: the system, the method,
     *  the result. Stated declaratively, not as a question. */
    summary: z.string(),
    problem: z.string(),
    approach: z.string(),
    result: z.string(),
    evidence: z
      .array(z.object({ value: z.string(), label: z.string() }))
      .default([]),
    /** compact "number + unit" for the home-page index, e.g. "38,193 cells" */
    headline: z.string().optional(),
    /** The detail that used to live on a per-project page. There is no such
     *  page any more, so this is where a reader who wants more than the summary
     *  gets it. Projects without a paper have none. */
    abstract: z.string().optional(),
    /** `paper` means this is the paper's own published abstract, quoted
     *  verbatim. `summary` means the paper is not public and this was written
     *  from the project's repository instead. The label on the page says which,
     *  because calling the second one an abstract would be a claim about
     *  provenance that is not true. */
    abstract_kind: z.enum(['paper', 'summary']).default('summary'),
    /** What the paper's own abstract does not say about the scope of the work.
     *  A verbatim abstract is the paper arguing its case, and a paper does not
     *  list what it never did, so a quoted one needs this line underneath it or
     *  the limits of the work are nowhere on the page. Written here rather than
     *  folded into the summary above, which is the reader's first impression
     *  and is not the place for it. */
    abstract_note: z.string().optional(),
    figure: z
      .object({
        id: z.string(), // key into src/lib/figures
        caption: z.string(),
        alt: z.string(),
      })
      .optional(),
    /** Card thumbnail for the home-page preview row. Paths are extensionless:
     *  the component serves <src>.webp with a <src>.png or .jpg fallback. */
    thumb: z
      .object({
        src: z.string(),
        alt: z.string(),
        width: z.number(),
        height: z.number(),
        fallback: z.enum(['png', 'jpg']).default('png'),
        /** `cover` bleeds a figure that carries its own background to the card
         *  edges; `contain` keeps a plot's white margin intact. */
        fit: z.enum(['contain', 'cover']).default('contain'),
      })
      .optional(),
    /** A figure lifted straight from the paper, as one or more panels under a
     *  single shared caption. This is how a paper sets a multi-panel figure and
     *  it is why the panels carry labels rather than being stacked loose.
     *  Extensionless src, as with `thumb`. */
    plate: z
      .object({
        /** the figure's number in the paper it came from, e.g. "Figure 2" */
        source: z.string().optional(),
        caption: z.string(),
        panels: z
          .array(
            z.object({
              src: z.string(),
              alt: z.string(),
              width: z.number(),
              height: z.number(),
              fallback: z.enum(['png', 'jpg']).default('png'),
              /** the panel letter the paper gives it; omit on a single panel */
              label: z.string().optional(),
              /** the panel's own one-line title, as the paper sets it */
              title: z.string().optional(),
            }),
          )
          .min(1),
      })
      .optional(),
    media: z
      .object({
        src: z.string(), // path under public/, e.g. /media/rfdiffusion.mp4
        poster: z.string(),
        caption: z.string(),
        alt: z.string(),
      })
      .optional(),
    links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    related: z.array(z.string()).default([]), // post slugs
    landscape: z.string().optional(), // how this project is a landscape problem, one line
  }),
});

export const collections = { posts, research };
