// Feed for the writing section.
//
// Posts have no dates by design, so items carry no pubDate at all: RSS 2.0
// makes it optional, and stamping every item with the build time would both
// invent a date and change all ten of them on every deploy. The feed is
// ordered the way the index is, by section and then within section.
import rss from '@astrojs/rss';
import { data, clean } from '../lib/canonical';
import { allPosts, readingMinutes } from '../lib/posts';
import { absolute } from '../lib/urls';

export async function GET() {
  const posts = await allPosts();

  return rss({
    title: `${data.person.name}: writing`,
    description: clean(data.writing.intro),
    // The site's own home, base path included. Astro's `context.site` is the
    // origin only, which on a project page points at a different site.
    site: absolute('/'),
    trailingSlash: true,
    items: posts.map((post) => ({
      title: post.data.title,
      description: `${post.data.description} (${readingMinutes(post.body)} min, ${post.data.status})`,
      link: absolute(`/writing/${post.id}/`),
      categories: [post.data.section, ...post.data.tags],
    })),
    customData: [
      `<language>en-us</language>`,
      `<managingEditor>${data.person.email} (${data.person.name})</managingEditor>`,
      // Notes are edited in place, so a reader should expect revisions.
      `<copyright>Notes are edited in place when they turn out to be wrong.</copyright>`,
    ].join(''),
  });
}
