// Prefix root-relative links and image sources in Markdown with the site base,
// so a post can link to "/writing/some-post/" and still work when the site is
// served from a project-page subpath such as /krishiv_portfolio/.
import { visit } from 'unist-util-visit';

export function rehypeBaseLinks({ base = '/' } = {}) {
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
  return (tree) => {
    if (!prefix) return;
    visit(tree, 'element', (node) => {
      for (const attr of ['href', 'src']) {
        const value = node.properties?.[attr];
        if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith(prefix + '/')) {
          node.properties[attr] = prefix + value;
        }
      }
    });
  };
}
