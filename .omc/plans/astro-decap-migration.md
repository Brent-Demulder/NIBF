# NIBF — migration plan: static HTML → Astro

Written 2026-08-18, re-scoped the same day. Stack settled: **Astro (static output, no adapter) + Decap CMS + self-hosted GitHub OAuth proxy (Path B) + images in-repo, optimized at build time.**

---

## Scope: this is v1

The goal of v1 is **to stop writing HTML files and start on a foundation that can grow**, not to ship a finished CMS. The content model will change a lot once real work exists, so building Decap now means building it twice.

**In v1 (Phases 0–3):** Astro project, component decomposition, design tokens, all six pages ported at visual parity, contrast and breakpoint fixes, working contact form, deployed.

**Deferred to v2 (Phases 4–5):** Decap admin, `config.yml`, OAuth functions, `exposities` and `series` collections, detail routes.

**Decided and closed:** the three.js hero **survives**. **No English version** — site stays `lang="nl"` only, and nothing needs structuring for i18n.

### The rule for what goes in v1

Spend on what is **expensive to retrofit**; skip what is **cheap to add later**.

| Expensive to retrofit — do now | Cheap to add later — defer |
|---|---|
| Component decomposition | Decap admin + `config.yml` |
| Design tokens | OAuth functions |
| Content separated from markup | Extra collections and fields |
| URL structure | Detail routes |
| Font hosting | Editorial workflow |

This is why minimal content collections **are** in v1 while Decap is not: collections are the seam between content and markup, and retrofitting that seam later means rewriting every list page. Decap is just a form that writes into that seam — it can arrive any time.

---

## Guiding principles

1. **Migrate structure first, change design second.** Phases 1–2 must produce pixel-identical output. Only after parity is proven do we touch contrast or breakpoints. Changing two things at once makes regressions unattributable.
2. **Schema follows real content, not imagined content.** v1 schemas encode only fields the current design actually renders. No speculative fields for work that doesn't exist yet.
3. **Nothing that costs money.** Static output, no Astro adapter, no Netlify Image CDN.
4. **Minimise future support requests.** The scarce resource is Jelle's time, not hosting.

---

## Target structure (v1)

```
.
├── netlify.toml
├── astro.config.mjs
├── public/favicon.svg
└── src/
    ├── styles/global.css         # design tokens + base
    ├── config/site.ts            # ordered page list → nav numbering + "VOLGENDE" chain
    ├── layouts/BaseLayout.astro
    ├── components/
    │   ├── NavRail.astro         # sticky right rail + burger
    │   ├── SiteFooter.astro      # © + next-page link
    │   ├── Eyebrow.astro         # — LABEL accent rule + mono caps
    │   ├── WorkCard.astro
    │   ├── GalleryTile.astro
    │   ├── LibraryRow.astro
    │   ├── Placeholder.astro     # striped gradient, used when a work has no image yet
    │   └── HeroLogo.astro        # three.js, dynamically imported
    ├── content.config.ts
    ├── content/
    │   ├── kunstwerken/<slug>/index.md + co-located images
    │   └── teksten/<slug>/index.md
    └── pages/
        ├── index.astro
        ├── over-mij.astro
        ├── auteursrechten.astro
        ├── bibliotheek.astro
        ├── kunst-gallerij.astro
        └── contact.astro
```

`netlify/functions/` and `public/admin/` arrive in v2.

---

## Phase 0 — Safety net

- Branch off `main`.
- **Capture a visual baseline**: all six pages at 1440, 900 and 375 px into `.omc/baseline/`. This is what Phases 1–2 are diffed against.
- `npm create astro@latest` — minimal template, TypeScript strict.
- Move the six HTML files to `legacy/` rather than deleting. They stay until parity is confirmed.

## Phase 1 — Shell and tokens

Port `index.astro` only, so the shared furniture gets proven on one page before being applied to six.

**Extract design tokens into `global.css`.** Current `:root` defines only three; everything else is hardcoded at every use site:

```css
:root {
  --blue: #1C2F8F;
  --gold: #A9812F;          /* decorative only — rules, underlines */
  --gold-text: #8A6A26;     /* text-safe variant, see Phase 3 */
  --ink: #2A2E3D;
  --muted: #4A4F60;
  --soft: #6C7288;
  --panel: #FCFBF8;
  --rule-faint: rgba(28,47,143,.08);
  --rule: rgba(28,47,143,.12);
  --rule-strong: rgba(28,47,143,.16);
  --font-display: 'EB Garamond', Georgia, serif;
  --font-body: 'Work Sans', Helvetica, Arial, sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
  --pad-x: 7vw;
  --radius: 2px;
}
```

**`src/config/site.ts`** — one ordered array replaces three hand-maintained things across six files:

```ts
export const pages = [
  { n: '00', label: 'Home',           href: '/' },
  { n: '01', label: 'Over mij',       href: '/over-mij' },
  { n: '02', label: 'Auteursrechten', href: '/auteursrechten' },
  { n: '03', label: 'Bibliotheek',    href: '/bibliotheek' },
  { n: '04', label: 'Kunst gallerij', href: '/kunst-gallerij' },
  { n: '05', label: 'Contact',        href: '/contact' },
]
```

Nav numbering, nav order, and the footer "VOLGENDE →" link all derive from this. The existing chain already matches this order exactly, so no behaviour changes.

**Self-host fonts** via `@fontsource/eb-garamond`, `@fontsource/work-sans`, `@fontsource/ibm-plex-mono`. Removes two preconnects and a render-blocking stylesheet, and avoids the EU data-transfer question around the Google Fonts CDN on a Dutch client site.

**three.js** moves from a CDN dynamic import to `npm i three`, but stays a dynamic `import()` inside `HeroLogo.astro` so Vite code-splits it and it only loads on the homepage. Never let it into the shared bundle.

**Scripts** move into the components that own them (`NavRail` owns the burger, `GalleryTile` owns tilt). Astro bundles and dedupes, so the ~60-line block currently copied six times becomes one.

**Gate:** `index.astro` diffs clean against the baseline at all three widths.

## Phase 2 — Port the remaining five pages

Purely mechanical. Inline styles → scoped `<style>` blocks or shared classes. No content edits, no design changes.

**Gate:** all six pages diff clean. `legacy/` deleted. Expect roughly a 70% reduction in source size.

## Phase 3 — Corrections, content seam, deploy

**Contrast.** Measured against white, the current small text fails WCAG AA (4.5:1):

| Current | Ratio | Used for | Replace with | New ratio |
|---|---|---|---|---|
| `#9AA0B4` | 2.6:1 | all mono metadata | `#6C7288` | 4.83:1 |
| `#B7BCCB` | 1.9:1 | nav numbering | `#6C7288` | 4.83:1 |
| `#7A8099` | 3.9:1 | image captions | `#6C7288` | 4.83:1 |
| `#A9812F` | 3.6:1 | eyebrow labels | `#8A6A26` | 5.03:1 |

Keep the original `#A9812F` as `--gold` for the 1px accent rules and nav underline, where contrast rules don't apply.

**Breakpoints.** The single 1024px `!important` block flips the whole layout at once, so a tablet gets the phone layout and a 1025px laptop gets a cramped content column. Add an intermediate state: collapse the rail to a top bar below 1024, keep multi-column content down to ~700.

**Meta.** Per-page `description`, Open Graph and Twitter tags, favicon. Currently only `<title>` exists, so sharing any page produces a blank preview.

**Contact form** → Netlify Forms: `data-netlify="true"` plus a honeypot and a hidden `form-name` input. Netlify parses forms out of built HTML at deploy, which works with static output. Free tier is 100 submissions/month.

**Gallery filters** become real: client-side filtering over `data-tags`, as `<button>` not `<span>`, so they're keyboard reachable.

**Minimal content collections.** Two only, schemas encoding *only* what the current design renders:

- **`kunstwerken`** — titel, jaar, medium, afmetingen, afbeeldingen (`{ src: image(), alt }`), beschrijving, tags, uitgelicht, draft
- **`teksten`** — titel, jaar, type, excerpt, draft

Migrate the ~4 hardcoded gallery items and ~5 library rows into real entries. `Placeholder.astro` renders the striped gradient for any work without an image, so the site stays visually intentional while empty. `draft: true` filtered from production builds.

**URL structure settled now**, since it is expensive to change later: extensionless URLs, with `.html` → extensionless redirects in `netlify.toml` as cheap insurance.

**Deploy to Netlify**, point the domain, verify HTTPS.

---

# Deferred to v2

Kept here because the research is done and the answers are non-obvious.

## Phase 4 — Full content model

Add **`exposities`** (titel, locatie, plaats, startDatum, eindDatum, beschrijving, afbeeldingen, url) and **`series`** — the latter because "Herhaling I–VI" is six canvases that belong together, currently hardcoded, deserving its own route at `/kunst-gallerij/serie/[slug]`. In v1 a plain `serie` string field on a work is enough.

Add a **`beschikbaarheid`** field to `teksten` (`volledig` | `op-aanvraag`), encoding the site's copyright stance per text rather than globally. Add detail routes for works and texts — the current design links every card to itself, which is a dead end.

## Phase 5 — Decap + OAuth

**Two Netlify Functions**, plain JS in `netlify/functions/`, entirely outside Astro — `auth.mjs` redirects to GitHub authorize, `callback.mjs` exchanges the code for a token. Because these are native Netlify Functions rather than Astro routes, **no adapter is needed** and the site stays fully static. This is the detail that keeps the image-CDN cost trap closed; Astro's own docs describe OAuth as on-demand Astro routes, which would force an adapter.

**Critical media config** in `public/admin/config.yml`:

```yaml
- name: kunstwerken
  folder: src/content/kunstwerken
  path: "{{slug}}/index"
  media_folder: ""      # co-locate uploads with the entry
  public_folder: ""     # write a relative path into frontmatter
  create: true
```

Decap then stores `herhaling-i-vi/index.md` alongside `herhaling-i-vi/doek-01.jpg` and writes `doek-01.jpg` into frontmatter — a relative path, which is what Astro's `image()` resolves against the entry file. Avoids the usual `public/` upload folder, which Astro copies through unoptimized.

Verify with one real upload before building anything else on top.

## Phase 6 — Handover

- Onboarding: create her GitHub account, enable 2FA together, **save the recovery codes** into her password manager and a copy Jelle holds. This is the single step preventing an unrecoverable lockout.
- Enable **Netlify deploy-failure notifications to Jelle's email**. A bad entry fails the build and her publish silently doesn't go live — he needs to know before she does.
- One-page written guide for her: adding a work, drafts, image sizes.

---

## Risks

**v1:** low. The only real one is **slug derivation** — with `path: "{{slug}}/index"` and a `**/index.md` glob, entry IDs come out as `slug/index`. Needs `generateId` on the loader or trimming. Small, but it bites silently on URLs.

**v2:** image path resolution (mitigated above, but verify with a real upload), and **schema ↔ `config.yml` drift** — two files describing one shape. Strict Zod fails the build loudly on mismatch, but that only helps if deploy-failure notifications are on. This is the known cost of Decap over Keystatic, accepted knowingly.
