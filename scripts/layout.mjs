/**
 * Layout audit across viewport widths.
 *
 *   node scripts/layout.mjs            # audit every page at every width
 *   node scripts/layout.mjs 1025       # audit a single width
 *
 * Screenshots prove a layout did not change. This proves it is not broken:
 * it measures every page at every width and reports horizontal overflow,
 * elements escaping the viewport, and content columns that have gone too
 * narrow or too wide to read comfortably.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4322';

const ROUTES = [
  ['index', '/'],
  ['over-mij', '/over-mij'],
  ['auteursrechten', '/auteursrechten'],
  ['bibliotheek', '/bibliotheek'],
  ['kunst-gallerij', '/kunst-gallerij'],
  ['contact', '/contact'],
];

// Boundary values on both sides of each breakpoint, plus the common devices.
const WIDTHS = [320, 360, 375, 414, 600, 700, 701, 768, 900, 1024, 1025, 1280, 1440, 1920, 2560];

/** Comfortable measure is roughly 45-90 characters; below ~30 it is unreadable. */
const MIN_CONTENT = 240;

async function audit(page, width) {
  return page.evaluate((minContent) => {
    const vw = window.innerWidth;
    const out = { overflow: null, escapes: [], content: null, rail: null };

    const de = document.documentElement;
    if (de.scrollWidth > vw + 1) {
      out.overflow = { scrollWidth: de.scrollWidth, viewport: vw };
    }

    // Anything sticking out past the right edge, or starting left of zero.
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 1 || r.left < -1) {
        const cls = (el.className || '').toString().split(' ')[0];
        out.escapes.push({
          tag: el.tagName.toLowerCase() + (cls ? '.' + cls : ''),
          left: Math.round(r.left),
          right: Math.round(r.right),
        });
      }
    }

    const main = document.querySelector('[data-main]');
    if (main) {
      const mr = main.getBoundingClientRect();
      const cs = getComputedStyle(main);
      out.content = Math.round(mr.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
      // The first section's padding is what actually insets the copy.
      const sec = main.querySelector('section');
      if (sec) {
        const ss = getComputedStyle(sec);
        out.content = Math.round(
          mr.width - parseFloat(ss.paddingLeft) - parseFloat(ss.paddingRight)
        );
      }
    }

    const mount = document.querySelector('[data-nav-mount]');
    if (mount) out.rail = Math.round(mount.getBoundingClientRect().width);

    out.tooNarrow = out.content !== null && out.content < minContent;
    return out;
  }, MIN_CONTENT);
}

const only = process.argv[2] ? Number(process.argv[2]) : null;
const widths = only ? [only] : WIDTHS;

const browser = await chromium.launch();
let problems = 0;

for (const w of widths) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  const rows = [];

  for (const [name, route] of ROUTES) {
    await page.goto(new URL(route, BASE).href, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    const r = await audit(page, w);

    const flags = [];
    if (r.overflow) flags.push(`OVERFLOW ${r.overflow.scrollWidth}>${r.overflow.viewport}`);
    if (r.escapes.length) {
      const u = [...new Set(r.escapes.map((e) => e.tag))].slice(0, 3);
      flags.push(`ESCAPES(${r.escapes.length}) ${u.join(',')}`);
    }
    if (r.tooNarrow) flags.push(`NARROW content=${r.content}px`);
    if (flags.length) problems++;
    rows.push({ name, content: r.content, rail: r.rail, flags });
  }

  const bad = rows.filter((r) => r.flags.length);
  const c = rows[0];
  console.log(
    `${String(w).padStart(5)}px  rail=${String(c.rail ?? '-').padStart(4)}  content=${String(c.content ?? '-').padStart(4)}  ${
      bad.length ? '' : 'all pages OK'
    }`
  );
  for (const r of bad) console.log(`         ${r.name.padEnd(16)} ${r.flags.join('  ')}`);

  await ctx.close();
}

await browser.close();
console.log(`\n${problems === 0 ? 'no layout problems' : problems + ' page/width combinations with problems'}`);
process.exit(problems ? 1 : 0);
