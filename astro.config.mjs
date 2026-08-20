import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// NOTE: deliberately no adapter.
// The Netlify adapter routes <Image /> through Netlify Image CDN on demand,
// which bills every transformation as a function invocation and can exhaust
// the free tier. Static output keeps image optimization at build time (sharp).
// The v2 Decap OAuth endpoints will be native Netlify Functions in
// netlify/functions/, which deploy independently of Astro and need no adapter.
export default defineConfig({
  // No custom domain yet — this is the live Netlify subdomain.
  // Used for canonical URLs, sitemap and OG tags, so it must be the address
  // the site is actually served from. Change here (one place) if a domain
  // is bought later; .be would suit a Belgian client better than .nl.
  site: 'https://nbkrf.netlify.app',
  output: 'static',

  integrations: [sitemap()],

  build: {
    format: 'directory',
  },
  image: {
    // Explicit: optimize at build time, never defer to a CDN.
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
});
