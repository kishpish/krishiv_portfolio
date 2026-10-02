// remark-math follows micromark, which only treats `$$` as a math *block* when
// the fence is on its own lines:
//
//     $$
//     E = -T \log p
//     $$
//
// Written on one line, `$$E = -T \log p$$` is parsed as inline math and ends up
// inside a paragraph, so it renders at body size with no room around it and
// never gets the scroll wrapper that keeps it from widening a phone screen.
//
// Authors reasonably write the one-line form, so this plugin honours the
// intent: a paragraph whose only content is a math span that was written with
// `$$` delimiters becomes a real math block. It checks the original source
// rather than guessing, so `$a + b$` alone in a paragraph is left as inline.
import { visit } from 'unist-util-visit';

export function remarkDisplayMath() {
  return (tree, file) => {
    const source = String(file?.value ?? '');
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.children?.length !== 1) return;
      const child = node.children[0];
      if (child.type !== 'inlineMath') return;

      // Only promote if the author actually wrote `$$`.
      const start = child.position?.start?.offset;
      if (typeof start !== 'number' || source.slice(start, start + 2) !== '$$') return;

      // Build the node mdast-util-math would have produced for a fenced block,
      // including the hast hints remark-rehype reads. Copying the inline node's
      // data instead would keep the math-inline class and change nothing.
      parent.children[index] = {
        type: 'math',
        value: child.value,
        meta: null,
        position: node.position,
        data: {
          hName: 'pre',
          hChildren: [
            {
              type: 'element',
              tagName: 'code',
              properties: { className: ['language-math', 'math-display'] },
              children: [{ type: 'text', value: child.value }],
            },
          ],
        },
      };
    });
  };
}
