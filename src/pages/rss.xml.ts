// Feed for the writing section. Posts have no dates by design, so the feed
// orders them the way the index does (by section, then within section) and
// gives every item the same build timestamp rather than inventing per-post
// dates. Readers that sort by date keep the order the site intends.
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { data, clean } from '../lib/canonical';
import { allPosts, readingMinutes } from '../lib/posts';
import { absolute } from '../lib/urls';

export async function GET(context: APIContext) {
  const posts = await allPosts();
  const stamp = new Date();

  return rss({
    title: `${data.person.name}: writing`,
    description: clean(data.writing.intro),
    site: context.site ?? absolute('/'),
    trailingSlash: true,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      link: absolute(`/writing/${post.id}/`),
      pubDate: stamp,
      categories: [post.data.section, ...post.data.tags],
      customData: [
        `<status>${post.data.status}</status>`,
        `<readingTime>${readingMinutes(post.body)} min</readingTime>`,
      ].join(''),
    })),
    customData: [
      `<language>en-us</language>`,
      `<managingEditor>${data.person.email} (${data.person.name})</managingEditor>`,
      // Notes are edited in place, so a reader should expect revisions.
      `<copyright>Notes are edited in place when they turn out to be wrong.</copyright>`,
    ].join(''),
  });
}
