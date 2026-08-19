import type { APIRoute } from 'astro';
import { site } from '../config/site';

// Prerendered to /robots.txt by the static build. Driven by site.indexable so
// that opening the site to search engines is one boolean, not a hunt through
// several files.
//
// Note that robots.txt alone does not keep a URL out of search results -- it
// only asks crawlers not to fetch it, and a URL linked from elsewhere can
// still be listed. The noindex meta tag in BaseLayout is what actually
// prevents indexing; this is the belt to that pair of braces.
export const GET: APIRoute = ({ site: base }) => {
  const sitemap = new URL('sitemap-index.xml', base).href;

  const body = site.indexable
    ? `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`
    : `# Placeholder site: empty gallery and bibliotheek, temporary domain.\n# See site.indexable in src/config/site.ts.\nUser-agent: *\nDisallow: /\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
