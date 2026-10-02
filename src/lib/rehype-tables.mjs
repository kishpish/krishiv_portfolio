// Wrap Markdown tables and display math in scroll containers so neither can
// push the page wider than a phone screen. The wrappers are focusable regions
// so keyboard users can scroll them.
import { visit, SKIP } from 'unist-util-visit';

function wrap(node, className, label) {
  return {
    type: 'element',
    tagName: 'div',
    properties: { className: [className], tabIndex: 0, role: 'region', ariaLabel: label },
    children: [node],
  };
}

export function rehypeTables() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.tagName === 'table') {
        parent.children[index] = wrap(node, 'table-scroll', 'Table');
        return SKIP;
      }
      const cls = node.properties?.className;
      if (node.tagName === 'span' && Array.isArray(cls) && cls.includes('katex-display')) {
        parent.children[index] = wrap(node, 'math-scroll', 'Equation');
        return SKIP;
      }
    });
  };
}
