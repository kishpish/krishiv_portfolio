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
    /** Extra figures shown with the project on the research page, under its
     *  main figure. Extensionless src, as with `thumb`. */
    gallery: z
      .array(
        z.object({
          src: z.string(),
          alt: z.string(),
          width: z.number(),
          height: z.number(),
          fallback: z.enum(['png', 'jpg']).default('jpg'),
        }),
      )
      .default([]),
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
