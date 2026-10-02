// Ordering, grouping, reading time, and neighbours for the writing section.
// Posts have no dates by design: order comes from section order (canonical.yaml),
// then the optional `order` field, then title.
import { getCollection, type CollectionEntry } from 'astro:content';
import GithubSlugger from 'github-slugger';
import { data } from './canonical';

export type Post = CollectionEntry<'posts'>;

const WPM = 225;

/** Reading time in whole minutes, computed from the Markdown body. */
export function readingMinutes(body: string | undefined): number {
  if (!body) return 1;
  const text = body
    .replace(/^---[\s\S]*?---/, '') // frontmatter, if present
    .replace(/\$\$[\s\S]*?\$\$/g, ' equation ') // a display equation reads as a few words
    .replace(/\$[^$\n]+\$/g, ' x ') // inline math reads as a word
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`|\-]/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WPM));
}

export function sectionSlug(name: string): string {
  const known = data.writing.sections.find((s) => s.name === name);
  if (known) return known.slug;
  return new GithubSlugger().slug(name);
}

export function tagSlug(tag: string): string {
  return new GithubSlugger().slug(tag);
}

export async function allPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', (p) => !p.data.draft);
  const sectionIndex = (name: string) => {
    const i = data.writing.sections.findIndex((s) => s.name === name);
    return i === -1 ? data.writing.sections.length : i;
  };
  return posts.sort(
    (a, b) =>
      sectionIndex(a.data.section) - sectionIndex(b.data.section) ||
      (a.data.order ?? 999) - (b.data.order ?? 999) ||
      a.data.title.localeCompare(b.data.title),
  );
}

export interface SectionGroup {
  name: string;
  slug: string;
  subtitle?: string;
  posts: Post[];
}

/** Posts grouped by section, in the order defined in canonical.yaml. */
export async function groupedPosts(filter: (p: Post) => boolean = () => true): Promise<SectionGroup[]> {
  const posts = (await allPosts()).filter(filter);
  const groups: SectionGroup[] = data.writing.sections.map((s) => ({ ...s, posts: [] as Post[] }));
  for (const post of posts) {
    let g = groups.find((x) => x.name === post.data.section);
    if (!g) {
      g = { name: post.data.section, slug: sectionSlug(post.data.section), posts: [] };
      groups.push(g);
    }
    g.posts.push(post);
  }
  return groups.filter((g) => g.posts.length > 0);
}

/** Previous and next post in reading order (section order, then order within section). */
export async function neighbours(id: string): Promise<{ prev?: Post; next?: Post }> {
  const posts = (await allPosts()).filter((p) => p.data.status !== 'in progress');
  const i = posts.findIndex((p) => p.id === id);
  if (i === -1) return {};
  return { prev: posts[i - 1], next: posts[i + 1] };
}

export async function allTags(): Promise<{ tag: string; slug: string; count: number }[]> {
  const counts = new Map<string, number>();
  for (const p of await allPosts()) for (const t of p.data.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, slug: tagSlug(tag), count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export const statusText: Record<Post['data']['status'], string> = {
  note: 'note',
  essay: 'essay',
  'in progress': 'in progress',
};
