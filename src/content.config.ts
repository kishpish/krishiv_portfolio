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
    question: z.string(), // the plain-language question a non-specialist can follow
    problem: z.string(),
    approach: z.string(),
    result: z.string(),
    evidence: z
      .array(z.object({ value: z.string(), label: z.string() }))
      .default([]),
    figure: z
      .object({
        id: z.string(), // key into src/lib/figures
        caption: z.string(),
        alt: z.string(),
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
