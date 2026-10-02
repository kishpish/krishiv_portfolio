// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import { remarkDisplayMath } from './src/lib/remark-display-math.mjs';
import rehypeKatex from 'rehype-katex';
import { rehypeBaseLinks } from './src/lib/rehype-base-links.mjs';
import { rehypeTables } from './src/lib/rehype-tables.mjs';
import { paperTheme } from './src/lib/shiki-theme.mjs';

// SITE_URL and BASE_PATH are set by the deploy workflow from actions/configure-pages.
// The site is a user page served from the root of https://kishpish.github.io, so
// the default base is empty, and a project page or a custom domain still needs no
// code change: every internal link goes through url() in src/lib/urls.ts.
const site = process.env.SITE_URL || 'https://kishpish.github.io';
const rawBase = process.env.BASE_PATH ?? '';
const base = rawBase === '' ? '/' : rawBase;

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // The page and base stylesheets are a few kilobytes each, so inlining them
    // removes two render-blocking requests. KaTeX's stylesheet is far larger
    // and stays external, where it can be cached across pages.
    inlineStylesheets: 'auto',
  },
  vite: {
    build: { assetsInlineLimit: (file, content) => (file.endsWith('.css') ? content.length < 24000 : false) },
  },
  output: 'static',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/og/'),
    }),
  ],
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: { theme: paperTheme, wrap: false },
    processor: unified({
      remarkPlugins: [remarkMath, remarkDisplayMath],
      rehypePlugins: [
        [rehypeKatex, { strict: 'ignore', output: 'htmlAndMathml' }],
        [rehypeBaseLinks, { base }],
        rehypeTables,
      ],
      smartypants: true,
    }),
  },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
});
