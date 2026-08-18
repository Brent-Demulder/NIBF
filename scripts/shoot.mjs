/**
 * Visual regression harness for the Astro migration.
 *
 *   node scripts/shoot.mjs baseline   # shoot legacy/*.html via file://  -> .omc/shots/baseline
 *   node scripts/shoot.mjs current    # shoot the built site            -> .omc/shots/current
 *   node scripts/shoot.mjs compare    # diff the two, print a report
 *   node scripts/shoot.mjs promote    # current becomes the new baseline
 *
 * Phases 1 and 2 of the migration must produce pixel-identical output.
 * This is what proves it.
 *
 * `baseline` only works while legacy/ exists. It was deleted once Phase 2
 * passed, so the baseline is now the verified Phase 2 output, promoted from
 * current/. Phase 3 changes things deliberately (contrast, breakpoints), and
 * diffing against that baseline is what shows exactly what moved. To recover
 * the original hand-written reference, check out a commit before legacy/ was
 * removed and re-run `baseline`.
 *
 * Determinism note: every page is shot with reducedMotion: 'reduce'. The site
 * honours prefers-reduced-motion, which freezes the three.js hero at its rest
 * pose and disables card tilt and scroll parallax. Without this the homepage
 * could never diff clean.
 */
import { chromium } from 'playwright';
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, '.omc', 'shots');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4321';

const PAGES = [
  { name: 'index', legacy: 'index.html', route: '/' },
  { name: 'over-mij', legacy: 'over-mij.html', route: '/over-mij' },
  { name: 'auteursrechten', legacy: 'auteursrechten.html', route: '/auteursrechten' },
  { name: 'bibliotheek', legacy: 'bibliotheek.html', route: '/bibliotheek' },
  { name: 'kunst-gallerij', legacy: 'kunst-gallerij.html', route: '/kunst-gallerij' },
  { name: 'contact', legacy: 'contact.html', route: '/contact' },
];

const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'tablet', width: 900, height: 1200 },
  { label: 'mobile', width: 375, height: 812 },
];

async function settle(page) {
  // Fonts must be resolved or metrics shift between runs.
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  // Give the three.js hero a chance to mount, but never block on it.
  await page
    .locator('[data-hero-3d] canvas')
    .first()
    .waitFor({ timeout: 4000 })
    .catch(() => {});
  await page.waitForTimeout(500);
}

/** Optional page filter, e.g. `shoot.mjs current index` during a phased port. */
const only = process.argv[3];
const selected = only ? PAGES.filter((p) => p.name === only) : PAGES;

async function shoot(mode) {
  if (!selected.length) {
    console.error(`no page named "${only}"`);
    process.exit(1);
  }

  const outDir = path.join(SHOTS, mode);
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  let taken = 0;

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    for (const p of selected) {
      const url =
        mode === 'baseline'
          ? pathToFileURL(path.join(ROOT, 'legacy', p.legacy)).href
          : new URL(p.route, BASE_URL).href;

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      } catch {
        // networkidle can hang on the CDN three.js request; fall back.
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      }
      await settle(page);

      const file = path.join(outDir, `${p.name}--${vp.label}.png`);
      await page.screenshot({ path: file, fullPage: true });
      taken++;
      console.log(`  ${p.name} @ ${vp.label}`);
    }

    await context.close();
  }

  await browser.close();
  console.log(`\n${taken} screenshots -> ${path.relative(ROOT, outDir)}`);
}

async function compare() {
  let pixelmatch, PNG;
  try {
    pixelmatch = (await import('pixelmatch')).default;
    PNG = (await import('pngjs')).PNG;
  } catch {
    console.error('compare needs: npm i -D pixelmatch pngjs');
    process.exit(1);
  }

  const baseDir = path.join(SHOTS, 'baseline');
  const curDir = path.join(SHOTS, 'current');
  const diffDir = path.join(SHOTS, 'diff');

  if (!existsSync(baseDir) || !existsSync(curDir)) {
    console.error('Need both baseline and current. Run those first.');
    process.exit(1);
  }
  await mkdir(diffDir, { recursive: true });

  const files = (await readdir(baseDir))
    .filter((f) => f.endsWith('.png'))
    .filter((f) => !only || f.startsWith(`${only}--`));
  const rows = [];
  let worst = 0;

  for (const f of files) {
    const curPath = path.join(curDir, f);
    if (!existsSync(curPath)) {
      rows.push([f, 'MISSING', '']);
      worst = 100;
      continue;
    }

    const a = PNG.sync.read(readFileSync(path.join(baseDir, f)));
    const b = PNG.sync.read(readFileSync(curPath));

    if (a.width !== b.width || a.height !== b.height) {
      rows.push([f, 'SIZE', `${a.width}x${a.height} vs ${b.width}x${b.height}`]);
      worst = 100;
      continue;
    }

    const diff = new PNG({ width: a.width, height: a.height });
    const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
      threshold: 0.1,
    });
    const pct = (changed / (a.width * a.height)) * 100;
    worst = Math.max(worst, pct);

    if (changed > 0) {
      await writeFile(path.join(diffDir, f), PNG.sync.write(diff));
    }
    rows.push([f, `${pct.toFixed(3)}%`, changed ? 'diff written' : 'clean']);
  }

  const pad = Math.max(...rows.map((r) => r[0].length));
  console.log('');
  for (const [name, pct, note] of rows) {
    console.log(`  ${name.padEnd(pad)}  ${String(pct).padStart(9)}  ${note}`);
  }
  console.log(`\nworst: ${worst.toFixed(3)}%`);
  process.exit(worst > 0.1 ? 1 : 0);
}

async function promote() {
  const curDir = path.join(SHOTS, 'current');
  const baseDir = path.join(SHOTS, 'baseline');
  if (!existsSync(curDir)) {
    console.error('nothing to promote: run `current` first');
    process.exit(1);
  }
  await rm(baseDir, { recursive: true, force: true });
  await cp(curDir, baseDir, { recursive: true });
  await rm(path.join(SHOTS, 'diff'), { recursive: true, force: true });
  console.log('current -> baseline');
}

const mode = process.argv[2];
if (mode === 'baseline' || mode === 'current') {
  console.log(`Shooting ${mode}...`);
  await shoot(mode);
} else if (mode === 'compare') {
  await compare();
} else if (mode === 'promote') {
  await promote();
} else {
  console.error('usage: shoot.mjs <baseline|current|compare|promote>');
  process.exit(1);
}
