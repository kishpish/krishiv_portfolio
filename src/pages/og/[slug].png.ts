// Every page's Open Graph card, generated at build time to /og/<slug>.png.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { renderOg, type OgInput } from '../../lib/og';
import { data, publication, statusLabel, clean, firstSentence } from '../../lib/canonical';
import { absolute } from '../../lib/urls';

const name = data.person.name;
// Host plus base path, so the address printed on the card is one that actually
// serves the site. The bare hostname does not, on a project page.
const site = absolute('/').replace(/^https?:\/\//, '').replace(/\/$/, '');

export const getStaticPaths: GetStaticPaths = async () => {
  const cards: { slug: string; og: Omit<OgInput, 'name' | 'site'> }[] = [
    {
      slug: 'default',
      og: {
        eyebrow: 'machine learning · computational biology · simulation',
        title: name,
        subtitle: clean(data.research_statement.short),
        chips: [data.person.affiliation.institute_short],
      },
    },
    {
      slug: 'research',
      og: {
        eyebrow: 'research',
        title: 'Five projects, one shape',
        subtitle:
          'Something moves across a surface, pays energy, and settles somewhere. The fifth project is the benchmark work that keeps the other four honest.',
        chips: ['5 projects'],
      },
    },
    {
      slug: 'publications',
      og: {
        eyebrow: 'publications',
        title: 'Papers, talks, and media',
        subtitle: 'All first author. Venue and status stated exactly as they stand.',
        chips: [`${data.publications.length} papers`],
      },
    },
    {
      slug: 'writing',
      og: {
        eyebrow: 'writing',
        title: 'Notes',
        subtitle: clean(data.writing.intro),
        chips: ['no dates', 'edited in place'],
      },
    },
    {
      slug: 'about',
      og: {
        eyebrow: 'about',
        title: name,
        subtitle: `${data.person.affiliation.role}, ${data.person.affiliation.group}, ${data.person.affiliation.institute_short}.`,
        chips: [data.person.location],
      },
    },
    {
      slug: 'colophon',
      og: {
        eyebrow: 'colophon',
        title: 'About the figure',
        subtitle:
          'Why there is a contour map on the front page, what it is computing, and what the rest of the site is made of.',
        chips: ['Müller-Brown'],
      },
    },
  ];

  for (const entry of await getCollection('research')) {
    const pub = entry.data.paper ? publication(entry.data.paper) : null;
    cards.push({
      slug: `research-${entry.id}`,
      og: {
        eyebrow: 'research',
        title: entry.data.short,
        subtitle: firstSentence(entry.data.summary, 180),
        chips: [pub ? pub.venue : (entry.data.status ?? ''), pub ? statusLabel[pub.status] : ''].filter(Boolean),
      },
    });
  }

  for (const post of await getCollection('posts', (p) => !p.data.draft)) {
    cards.push({
      slug: `writing-${post.id}`,
      og: {
        eyebrow: post.data.section,
        title: post.data.title,
        subtitle: post.data.description,
        chips: [post.data.status, ...post.data.tags.slice(0, 1)],
      },
    });
  }

  return cards.map((c) => ({ params: { slug: c.slug }, props: { og: c.og } }));
};

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOg({ ...(props.og as Omit<OgInput, 'name' | 'site'>), name, site });
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
