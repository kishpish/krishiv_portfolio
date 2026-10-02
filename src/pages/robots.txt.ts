// Generated rather than static, so the sitemap URL follows the deployed origin
// and base path instead of being pinned to the project-page address.
import type { APIRoute } from 'astro';
import { absolute } from '../lib/urls';

export const GET: APIRoute = () =>
  new Response(
    [
      '# Everything here is meant to be read.',
      'User-agent: *',
      'Allow: /',
      '',
      '# Generated social cards are not pages.',
      'Disallow: /og/',
      '',
      `Sitemap: ${absolute('/sitemap-index.xml')}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
