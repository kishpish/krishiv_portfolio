// Loads src/data/canonical.yaml once at build time and validates it, so a typo
// in the data file fails the build loudly instead of shipping a broken page.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { load as parseYaml } from 'js-yaml';
import { z } from 'astro/zod';

const link = z.object({ label: z.string(), href: z.url() });

const schema = z.object({
  person: z.object({
    name: z.string(),
    given_name: z.string(),
    family_name: z.string(),
    tagline: z.string(),
    location: z.string(),
    email: z.email(),
    affiliation: z.object({
      role: z.string(),
      group: z.string(),
      group_url: z.url(),
      institute: z.string(),
      institute_short: z.string(),
      institute_url: z.url(),
      university: z.string(),
      university_short: z.string(),
      advisor: z.string(),
      since: z.string(),
    }),
    education: z.object({
      school: z.string(),
      place: z.string(),
      class_of: z.number(),
      coursework_beyond: z.string(),
    }),
    profiles: z.object({
      github: z.url(),
      github_handle: z.string(),
      linkedin: z.url(),
      orcid: z.url(),
      orcid_id: z.string(),
      scholar: z.url().nullable(),
      x: z.url().nullable(),
    }),
  }),
  images: z.record(
    z.string(),
    z.object({ src: z.string(), alt: z.string(), width: z.number(), height: z.number() }),
  ),
  me_page: z.object({
    lede: z.string(),
    trajectories: z.string(),
    photo_caption: z.string(),
    pitch_intro: z.string(),
    closing: z.string(),
  }),
  cv: z.object({ path: z.string(), updated_fallback: z.string(), label: z.string() }),
  site: z.object({ title: z.string(), description: z.string(), repo: z.url(), repo_branch: z.string() }),
  research_statement: z.object({
    short: z.string(),
    core_label: z.string(),
    core_html: z.string(),
    directions_label: z.string(),
    directions_html: z.string(),
    interests: z.array(z.string()),
  }),
  current_work: z.array(z.object({ title: z.string(), note: z.string() })),
  publications: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      authors: z.array(z.string()),
      venue: z.string(),
      venue_long: z.string(),
      year: z.number(),
      status: z.enum(['preprint', 'accepted', 'under-review', 'published']),
      doi: z.string().optional(),
      links: z.array(link).default([]),
      note: z.string().optional(),
      project: z.string().optional(),
    }),
  ),
  talks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      venue: z.string(),
      year: z.number(),
      kind: z.string(),
      note: z.string().optional(),
      href: z.url().optional(),
    }),
  ),
  honors: z.array(
    z.object({
      year: z.string(),
      title: z.string(),
      org: z.string(),
      detail: z.string().optional(),
      href: z.url().optional(),
      featured: z.boolean().optional(),
    }),
  ),
  positions: z.array(
    z.object({
      org: z.string(),
      role: z.string(),
      advisor: z.string().optional(),
      period: z.string(),
      summary: z.string(),
      href: z.url().optional(),
    }),
  ),
  hackathons: z.array(
    z.object({
      name: z.string(),
      event: z.string(),
      date: z.string(),
      role: z.string(),
      summary: z.string(),
      links: z.array(link).default([]),
    }),
  ),
  media: z.array(
    z.object({ id: z.string(), title: z.string(), outlet: z.string(), year: z.number(), href: z.url() }),
  ),
  beyond: z.array(
    z.object({
      label: z.string(),
      title: z.string(),
      body: z.string(),
      exit_velocity: z.string().optional(),
      sixty: z.string().optional(),
    }),
  ),
  methods: z.array(z.object({ area: z.string(), items: z.string() })),
  notion: z.object({
    index_url: z.url(),
    index_title: z.string(),
    verified_public: z.boolean(),
    posts: z.array(
      z.object({
        title: z.string(),
        url: z.url(),
        tag: z.string(),
        summary: z.string(),
        minutes: z.number().nullable(),
        hidden: z.boolean().default(false),
      }),
    ),
  }),
  writing: z.object({
    intro: z.string(),
    sections: z.array(z.object({ name: z.string(), slug: z.string(), subtitle: z.string() })),
  }),
  conflicts: z.record(
    z.string(),
    z.object({ sources: z.record(z.string(), z.string()), chosen: z.string(), why: z.string() }),
  ),
});

export type Canonical = z.infer<typeof schema>;
export type Publication = Canonical['publications'][number];

const file = path.join(process.cwd(), 'src/data/canonical.yaml');
const parsed = schema.safeParse(parseYaml(fs.readFileSync(file, 'utf8')));
if (!parsed.success) {
  throw new Error(`src/data/canonical.yaml failed validation:\n${parsed.error.message}`);
}

export const data: Canonical = parsed.data;

/** Collapse folded YAML whitespace in long strings. */
export const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

export function publication(id: string): Publication {
  const pub = data.publications.find((p) => p.id === id);
  if (!pub) throw new Error(`Unknown publication id "${id}" (check src/data/canonical.yaml)`);
  return pub;
}

export const statusLabel: Record<Publication['status'], string> = {
  preprint: 'Preprint',
  accepted: 'Accepted',
  'under-review': 'Under review',
  published: 'Published',
};

/** First letter up, rest untouched. For free-text status values such as "in progress". */
export const sentence = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * The first sentence of a block of prose, for the places with a character
 * budget: meta descriptions and Open Graph cards. The project summaries open
 * with a concrete problem statement, which is what belongs there; the
 * technical detail that follows does not fit and would be truncated anyway.
 */
export function firstSentence(s: string, max = 240): string {
  const t = clean(s);
  const m = /[.!?](?=\s+[A-Z(\u00C0-\u024F]|$)/.exec(t);
  const out = m ? t.slice(0, m.index + 1) : t;
  return out.length <= max ? out : `${out.slice(0, max - 1).replace(/[\s,;:]+\S*$/, '')}\u2026`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * When the CV PDF was last changed, from git history (so the marker can never
 * go stale), falling back to cv.updated_fallback in the data file.
 */
function cvUpdated(): { iso: string; short: string; long: string } {
  let iso = data.cv.updated_fallback;
  try {
    const out = execSync('git log -1 --format=%cs -- public/cv.pdf', {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(out)) iso = out;
  } catch {
    /* no git available: use the fallback */
  }
  const [y, m] = iso.split('-').map(Number);
  return { iso, short: `${MONTHS[m - 1]} ${y}`, long: `${MONTHS_LONG[m - 1]} ${y}` };
}

export const cv = { ...data.cv, updated: cvUpdated() };
