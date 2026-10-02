// A quiet code theme that matches the paper palette: ink for most tokens,
// the link blue for keywords, a dark amber for strings, muted ink for comments.
export const paperTheme = {
  name: 'paper',
  type: 'light',
  colors: {
    'editor.background': '#f4f2ea',
    'editor.foreground': '#1b1a17',
  },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#6b6860', fontStyle: 'italic' } },
    { scope: ['keyword', 'storage', 'storage.type', 'keyword.control', 'keyword.operator.new'], settings: { foreground: '#1563b5' } },
    { scope: ['string', 'string.quoted', 'string.template'], settings: { foreground: '#8a4b08' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.character'], settings: { foreground: '#1563b5' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: '#1b1a17', fontStyle: 'bold' } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class'], settings: { foreground: '#45433d' } },
    { scope: ['variable', 'variable.parameter', 'meta.definition.variable'], settings: { foreground: '#1b1a17' } },
    { scope: ['punctuation', 'meta.brace', 'keyword.operator'], settings: { foreground: '#45433d' } },
    { scope: ['markup.heading', 'entity.name.section'], settings: { foreground: '#1b1a17', fontStyle: 'bold' } },
  ],
};
