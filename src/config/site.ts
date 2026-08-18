/**
 * Single source of truth for site navigation.
 *
 * In the hand-written HTML this information was duplicated six times over:
 * the nav rail markup, the 00-05 numbering, and the "VOLGENDE" link in each
 * page footer were all maintained by hand and could drift apart. They are all
 * derived from this one ordered array now.
 *
 * The order is meaningful: it drives the numbering AND the next-page chain,
 * which the original already followed exactly
 * (index -> over-mij -> auteursrechten -> bibliotheek -> kunst-gallerij -> contact).
 */

export interface NavPage {
  /** Two-digit label shown beside the nav item. Derived from position. */
  readonly n: string;
  readonly label: string;
  readonly href: string;
  /** Preserved from the original markup's data-nav-item attribute. */
  readonly key: string;
}

export const pages: readonly NavPage[] = [
  { n: '00', label: 'Home', href: '/', key: 'home' },
  { n: '01', label: 'Over mij', href: '/over-mij', key: 'over-mij' },
  { n: '02', label: 'Auteursrechten', href: '/auteursrechten', key: 'auteursrechten' },
  { n: '03', label: 'Bibliotheek', href: '/bibliotheek', key: 'bibliotheek' },
  { n: '04', label: 'Kunst gallerij', href: '/kunst-gallerij', key: 'gallerij' },
  { n: '05', label: 'Contact', href: '/contact', key: 'contact' },
];

/**
 * The page that follows `href` in the reading order, wrapping to the start.
 * Wrapping means the chain never dead-ends, which the original did not handle
 * because contact.html simply had a different footer target.
 */
export function nextPage(href: string): NavPage {
  const i = pages.findIndex((p) => p.href === href);
  return pages[(i + 1) % pages.length]!;
}

export const site = {
  name: 'NIBF',
  author: 'Nisrine Bolakhrif',
  email: 'neb_off@hotmail.com',
  /** Belgian client, Flanders — nl-BE rather than plain nl. */
  lang: 'nl-BE',
  /** Registered with BOIP, which covers Belgium as well as the Netherlands. */
  copyright: '© 2026 Nisrine Bolakhrif — NIBF. Alle rechten voorbehouden.',
} as const;
