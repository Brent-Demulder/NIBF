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
  name: 'NBKRF',
  author: 'Nisrine Bolakhrif',
  email: 'neb_off@hotmail.com',

  /**
   * Whether search engines may index the site.
   *
   * False while this is a placeholder on a netlify.app subdomain: the gallery
   * and bibliotheek are empty, and letting an empty portfolio get indexed --
   * then moving it to a custom domain later -- splits whatever authority it
   * earns and leaves stale results pointing at the subdomain.
   *
   * Flip to true when there is real work on the site and the final domain is
   * settled. That single change updates robots.txt and drops the noindex tag
   * from every page.
   */
  indexable: false,
  /** Belgian client, Flanders — nl-BE rather than plain nl. */
  lang: 'nl-BE',
  /** Registered with BOIP, which covers Belgium as well as the Netherlands. */
  copyright: '© 2026 Nisrine Bolakhrif — NBKRF. Alle rechten voorbehouden.',
} as const;
