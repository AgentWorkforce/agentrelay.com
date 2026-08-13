# design-sync notes — agentrelay.com → claude.ai/design

Repo-specific gotchas for future syncs. Config lives in `.design-sync/config.json`.

## Shape

- This is a **Next.js 16 marketing site**, not a published component library: no `dist/`, no
  Storybook. It syncs as the **package** shape driven by an explicit entry barrel.
- **`web/.design-sync-entry.tsx` is the public surface.** Adding a component to the repo does
  NOT add it to the design system — edit the barrel *and* `cfg.componentSrcMap` (the barrel
  controls what is bundled; componentSrcMap controls what is listed as a component).
- `pkg` is `"web"` via the npm-workspace symlink `node_modules/web -> ../web`, so `PKG_DIR`
  resolves to `web/`. Config paths are relative to `web/`; `cfg.entry` is relative to the repo root.

## Build inputs that must be regenerated

- `cfg.buildCmd` = `npm --workspace web run build && node .design-sync/build-css.mjs`.
- **`.design-sync/build-css.mjs` produces `cfg.cssEntry` (`web/.ds-css/compiled.css`).** The site's
  CSS cannot be consumed from source: `app/globals.css` opens with `@import 'tailwindcss'` (needs
  the Tailwind v4 compiler) and the brand fonts come from `next/font/google`, which only emits
  `@font-face` at Next build time. The generator compiles globals + brand tokens + Tailwind, then
  harvests the `@font-face` rules and woff2 files out of `.next/static/` and rewrites their URLs.
- It **requires `web/.next/static/` to exist** — run the Next build first. Fonts are stable
  (Inter / Sora / Geist Mono, fixed in `app/layout.tsx`), so an existing `.next` from an older
  build is usually fine for fonts even if the utility CSS is stale.

## Next.js decoupling

- `web/.design-sync-tsconfig.json` aliases `next/link` and `next/navigation` to
  `web/.design-sync-shims/`. esbuild honours `compilerOptions.paths`, so this redirects both the
  component bundle and the compiled previews. **This is what keeps the bundle at ~420 KB** —
  without it Next's client runtime lands in the bundle and every preview dies on
  `ReferenceError: process is not defined`.
- Beware: the converter's tsconfig reader strips `//` comments with a regex that also mangles a
  `"//"` *JSON key*. Use real line comments in that file, never a `"//": "…"` entry — a broken
  parse silently disables the paths plugin with no error.
- `web/.design-sync-shims/process-env.ts` must stay the **first import** in the entry barrel:
  `WaitlistForm` reads `process.env.NEXT_PUBLIC_WAITLIST_API_URL` at module scope.
- `usePathname()` is steerable — a preview can set `window.__dsPathname` to render nav active states.

## Deliberately out of scope

- `components/home/*`, `OpenClawLandingPage`, `SkillPage` — page-level marketing compositions.
- `ProductDocPage` — reads the content tree through `lib/content-store` (`node:fs`); it is the one
  component whose import chain breaks a browser bundle.
- `GitHubStarsBadge`, `DocsGitHubStarsBadgeServer`, `HighlightedPre` — **`async` server
  components**. They cannot render in a browser by construction. Dropping `HighlightedPre` is what
  removed shiki and took the bundle from 10.2 MB to 421 KB; do not re-add it without a sync
  alternative.

## Naming

- `components/ui/card.tsx` and `components/docs/Card.tsx` both export `Card`. The barrel gives the
  ui primitive the plain name `Card` and exports the docs link-card as **`DocsCard`**.
- `RelayAnimation` is a **default** export; the barrel uses `export { default as RelayAnimation }`.

## Authoring previews here

- Import from `'web'` in `.design-sync/previews/<Name>.tsx` — it resolves through the workspace
  symlink and the story-import rules redirect it to `window.AgentRelay`.
- **Use inline `style={{}}` for layout glue, not invented Tailwind classes.** Tailwind v4
  content-scans, so `compiled.css` contains only utilities the site itself uses: `p-0`, `pb-4`,
  `w-full`, `gap-2` exist; `pt-5` does not. A class the site never used silently does nothing.
- `lucide-react` v1 has **no brand icons** (`Github` is gone). The repo uses `react-icons/si` for
  brand logos. Check an icon name exists before importing it.
- The DS is **light by default** (`--bg: #f9fafb`); dark is opt-in via `:root[data-theme='dark']`.

## Known render warns (triaged as legitimate)

- `[FONT_MISSING] "Impact", "Haettenschweiler", "Arial Narrow Bold", "Arial Black"` — a deliberate
  **web-safe system display stack** on `.landing_homePosterTextLine` in `app/landing.module.css`.
  No `@font-face` should ever ship for these. It reaches the bundle because `ChannelMessagesPreview`
  and `InstallCommand` legitimately import the landing stylesheet.
- `tokens: 1 missing` — below threshold, non-blocking.
- `variants render identically` on **DocsGitHubStarsBadge** — false positive. The three cells do
  differ (2.4k / 312 / 1.1k, the last exercising the no-`k` formatting branch), but a star badge's
  only variable is a short number inside an otherwise fixed pill, which is below the check's
  sensitivity. Verified by eye; do not "fix" it.

## Re-sync risks

- **`.next/` is gitignored build output.** A fresh clone has no fonts until `npm --workspace web
  run build` runs. `build-css.mjs` fails loudly with `[CSS_GEN]` rather than shipping fontless CSS.
- **The entry barrel rots silently.** If a component is renamed or deleted in `web/components/`,
  the barrel breaks the build (loud); if a *new* component is added, nothing complains — it just
  never reaches the design system. Re-read `web/.design-sync-entry.tsx` against the component tree
  on each sync.
- **Async server components are a recurring trap.** Before adding anything to the barrel, check for
  `export async function` — it renders as "an unknown Component is an async Client Component".
- The compiled CSS's Tailwind layer changes whenever the site's own class usage changes, so
  `_ds_bundle.css` can shift without any component changing.
- Font filenames in `fonts/` are Next build hashes; they churn across Next upgrades even when the
  typefaces are identical.

## Picker grouping

- The converter derives a component's group from its source directory, which puts 25 of the 46
  components in a single `general` bucket (`components/ui/` is a "generic" dir name, and the site
  chrome sits at `components/` root).
- `.design-sync/groups/<Name>.md` are **frontmatter-only stubs** bound via `cfg.docsDir`, purely to
  regroup those into `Primitives` / `Site` / `Media`. Discovery matches them by filename, so adding
  a component to a group is just adding a stub — no config change.
- They are safe because an empty doc body is falsy: the `.prompt.md` is still fully synthesized
  (Props / Examples / Related). A stub with real prose would REPLACE that and drop the Examples
  section — so keep these files frontmatter-only unless you intend to write the whole doc.
- Components already grouped by a real directory (`docs`, `agents`, `blog`) are left alone; the
  category override only applies to `general`/`misc`.

## Theme — the most important thing in this file

**agentrelay.com is a DARK site.** `web/app/layout.tsx:85` renders `<html lang="en"
data-theme="dark">` — one `<html>` tag for the whole app, no route overrides it. `public/brand.css`
keys its dark block off `:root[data-theme='dark']` and overrides ~70 tokens there.

The light `:root` values are a **fallback the shipped product never displays**. A component rendered
outside the Next app gets them by default, so previews rendered light until this was caught.

- `cfg.provider` mounts `BrandTheme` (`web/.design-sync-shims/brand-theme.tsx`, exported from the
  entry barrel) around every preview card. It sets `data-theme="dark"` on the document root and
  clears the harness's inline white `body` background so `globals.css body { background: var(--bg) }`
  wins. Do not replace this with a hardcoded colour.
- **Never fake a dark surface in a preview.** Re-declaring dark tokens inline double-applies under
  the global dark theme. Use the shipped tokens (`--bg`, `--surface`, `--section-bg`,
  `--bg-elevated`); reserve `--terminal-bg` / `--console-bg` for things that genuinely are terminals.
- Components whose CSS modules hardcode dark values — `InstallCommand`, `AgentSetupPrompt`, and the
  landing-band modules generally — are unreadable under the light fallback. Under the dark theme
  they are correct with no wrapper at all.
- `BrandTheme` is excluded from the component list (`componentSrcMap: {"BrandTheme": null}`) — it is
  infrastructure, not a card — but it IS a bundle export the design agent can use.

## Runtime image assets (`/integration-logos/`)

- `lib/integration-logos.ts` `providerLogo()` returns an **absolute** `/integration-logos/<file>`
  and `IntegrationGrid` / `IntegrationLogos` render it as a plain `<img src>`. A design project has
  no `public/` tree, so without help those marks 404 — in real designs, not just in preview cards.
- **`.design-sync/copy-assets.mjs` must run after EVERY `package-build.mjs`.** The build rewrites
  `ds-bundle/` and preserves only its own outputs, so the copied logo directory is deleted every
  single time. **This has already been forgotten once mid-run.** Treat the build as a two-part
  command and never split it:
  `node .ds-sync/package-build.mjs … && node .design-sync/copy-assets.mjs`
  The regression is invisible in source — `web/public/integration-logos/` still has all 40 files,
  and the `.svg` MIME patch survives because it lives outside the bundle. Only the copy inside
  `ds-bundle/` dies. Durable fixes if this keeps biting: have the build invoke it, or inline the
  logos as data URIs in `web/lib/integration-logos.ts` (which would also drop 40 requests from the
  real docs page).
  **Diagnostic:** text/monogram chips rendering while image chips are blank means missing assets,
  not a broken grid.
- The upload plan must include `integration-logos/**` in its `writes`, or the marks ship broken.
- `agent-art/` (21 files, 15 MB) is deliberately NOT shipped — committed artwork is content, not
  design system. `AgentArt` renders an accent-gradient fallback instead, and its previews are
  authored against that path.
- **Staged-script patch, reapply after re-copying `.ds-sync/`:** `storybook/http-serve.mjs`'s MIME
  map has no `.svg` entry, so SVGs serve as `application/octet-stream` and browsers refuse to render
  them in `<img>`. Patch it after the `cp -r` staging step:
  `'.png': 'image/png'` → `'.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2'`
  There is no override hook for this file — `loadLib` only covers `lib/`, and `.ds-sync/` is
  gitignored, so the patch does not survive a fresh staging.

## agent-art — declined, but cheaper than it looks

The user declined shipping `web/public/agent-art/` (21 files, 15 MB) — heavy, and committed agent
artwork is content rather than design system. `AgentArt` therefore previews and ships on its
`hasCustomArt: false` path (accent gradient + monogram), which renders correctly.

Worth knowing if it is ever reconsidered: the weight is very unevenly distributed —
`card.png` is 10.8 MB across 7 files, `banner.png` 4.2 MB, but **`card-sm.png` is 0.4 MB for all
seven agents**. Shipping only the `card-sm` variant would enable a real-artwork preview at ~2.7% of
the size that was declined. It would need an `agent-art/**` entry in the upload plan's writes and a
line in `.design-sync/copy-assets.mjs`.

## Design-system findings (for the repo, not the sync)

Surfaced while making every component render. These are product issues in `web/`, not sync
problems — nothing here blocks a sync, and none of it was worked around in the previews.

- **No dark-tuned danger token.** Every red in the system is a hardcoded hex and none is tuned for
  the dark theme the site actually ships:
  `waitlist.module.css .error` `#c44` (~3.7:1 against `--bg`, under AA for body text) ·
  `ui/button.tsx` destructive `#DC2626` on `#FEE2E2` (a light-palette pair now shipping on a dark
  site) · `--status-red` `#ff5f57` (~5.8:1, but documented for terminal chrome).
  Fix: a `--danger` / `--danger-fg` token pair in `brand.css`, dark-tuned alongside the rest.
- **`Input` has no invalid state.** No `aria-invalid` styling in `components/ui/input.tsx`; the
  preview fakes the error ring with an inline border. Worth a real variant.
- **`DocsProductSwitcher`'s open menu inverts under the shipped theme.** `.productSwitcherMenu`
  paints `color-mix(in srgb, var(--bg), #061a28 14%)` — the page background pushed toward a very dark
  navy. In light theme that darkens a near-white page and reads as a raised popover. Under
  `data-theme="dark"` — the only theme the site ships — `--bg` is *already* darker than the mix
  target, so the "raised" menu comes out **darker than the page behind it**. A popover that recedes
  reads as a hole. It stays legible only on its 1px border and shadow. Fix in site source: lift
  toward `--surface` (#0f1b29) or the `--nav-surface` family the rest of the dark chrome uses.
  **This is the same shape as the BrandTheme body-background bug — a rule written against the light
  `:root` fallback that inverts in the theme the product actually renders. Worth grepping
  `color-mix(in srgb, var(--bg)` across the site for siblings.**
- **`BannerLink` is theme-independent by construction.** `docs.module.css` hardcodes
  `#2d6a9c` / `#234969` / `#4a90c2` instead of tokens, so it renders identically in both themes.
  Deliberate today; worth knowing it will not follow a future theme change.
- **Interaction-only states are unreachable from outside.** `WaitlistForm`'s success/error/loading
  live in `useState` behind a network POST, and `AgentSetupPrompt`'s expanded panel behind a click.
  Neither accepts an initial-state prop, so no preview can show them. The fix is a prop on the
  component (e.g. `initialState`), not a preview trick.

## Preview authoring techniques that this repo needs

Learned across 46 components / 164 cells. These are the non-obvious ones — a future sync that
ignores them will reproduce the same bugs.

**Emitted CSS-module class names are unhashed, and several components need them.** esbuild emits
`docs.module.css .article` as plain `.docs_article` in `_ds_bundle.css`, so a preview can reproduce
a real page context with a bare class name and no import: `<div className="docs_article">`. Much of
the docs kit ships *no styling of its own* — table borders, code-frame padding, inline-`code` chips,
paragraph rhythm and link colour all come from `.article`, which the component never renders. Same
trick supplies `docs_codeWrapper*`, `docs_articleHeader`, `agents_ctaPrimary`, `site_footer_logo`.
**Risk:** these names are an emitted-artifact contract, not a public API. If the bundler ever
hashes CSS-module names, several previews silently lose styling with no build error.

**`composes: … from global` does not reach the stylesheet.** CSS Modules resolves composition in the
module's *JS export*, so `.agents_ctaPrimary` emits with an empty body. A preview passing that class
alone renders unstyled. Pass both: `"agents_ctaPrimary btn btn-primary"`. Only `.ctaPrimary` /
`.ctaSecondary` in `agents.module.css` and `landing.module.css` use `composes`.

**`window.__dsPathname` must be set per-render, not at module scope.** Each cell is captured in its
own page load (`?story=<Label>`), but in the grid card all cells mount at once — a module-scope
assignment leaks to every sibling.

**Seed a component's own cache rather than faking props.** `DocsGitHubStarsBadge` reads
`localStorage['agentrelay:github-stars:<repo>']` before fetching; `DocsLanguageProvider` hydrates
from `localStorage['agent-relay-docs-language']`. The capture reuses ONE browser context across every
cell, so **each** cell must write the key it wants — not just the non-default one.

**DOM state needs a DOM press.** `DocsProductSwitcher` is a native `<details>` with no `open` prop;
`SiteNav`'s dropdown is internal state. An effect that queries the element and sets `open`/`.click()`
is the only route. In SiteNav target `button[aria-label="Toggle menu"]` — a bare
`querySelector('button')` grabs an `actions`-slot button first. Modals that portal to `document.body`
escape the cell entirely, so open them only for the solo `?story=` render, and type into them
after a `requestAnimationFrame` (the modal mounts on the commit *after* the click).

**Components sized by a CSS-module class need scaling, not props.** `LogoIcon` (34×28) and
`LogoWordmark` take no props; wrap in a box reserving the scaled footprint and `transform: scale()`
the inner element. For the always-white wordmark, wrap in `className="site_footer_logo"` over
`var(--footer-bg)` — that is the shipped rule, no inline colour needed.

**`--accent-ink` is NOT redefined in the dark block** (`#111827` in both themes). That makes it the
correct colour for copy over `RelayAnimation`'s canvas, which paints a warm oatmeal ground in every
theme — `var(--fg)` would vanish there.

**`AgentArt` / `ForkAgentButton` take a whole `Agent` object** from `web/lib/agents.ts`, which is not
on the entry barrel. Previews build literals from real catalog values; only `repo` and `personaFile`
change rendered output (they default to `AgentWorkforce/agents` and `persona.ts`).

## Capture-harness traps

- **`package-build` wipes `_screenshots/` AND `integration-logos/` on every run.** A grade written
  before a build still reads green afterwards while the sheet behind it no longer exists and the
  logo tiles render blank. **Always build through `node .design-sync/build.mjs`** — it runs
  `package-build` then `copy-assets` so the two can never separate. The safe ordering is
  **build → copy-assets → capture → upload, with no build after the copy**; "capture then build" is
  an ordering error, not something to retry.
- **`carried forward` can mean stale pixels.** The grade key covers *your* inputs — the authored
  `.tsx` and preview-affecting config — not rendered output. After a provider / CSS / font / bundle
  change, a fully-graded component whose key didn't move carries forward with verdicts minted
  against the OLD render, and silence looks identical to correctness. After any such change,
  `package-capture --force` everything in scope. This bit three of four agents on the dark flip.
- **Verify the bundle, not the shim source, and grep quote-agnostically.** `preview-rebuild` does not
  rebuild `_ds_bundle.js`, so a provider/shim fix is visible in source and invisible to captures.
  esbuild emits double quotes, so a single-quoted grep yields a false negative — match a distinctive
  string literal instead, since string content survives minification:
  `grep -c 'ds-brand-theme-chrome' ds-bundle/_ds_bundle.js`
- **Capture geometry hides components behind their own breakpoints.** `site-nav.module.css` collapses
  at `max-width: 960px` and `docs.module.css` fires at both 1100px and 900px, so at the 900x700
  default the whole docs kit and SiteNav were being graded in the site's mobile layout. Hence
  `viewport: "1240x900"` across the docs kit and `1280x720` + `cardMode: single` for SiteNav.

- **`viewport` overrides are NOT single-mode-only**, despite the comment at
  `package-capture.mjs:143`. `emit.mjs:127` writes the attribute whenever the override sets it, so a
  multi-cell grid card keeps every cell *and* gets the wider viewport. Only the 900x700 *defaults*
  are gated behind `cardMode`. Verify rather than infer:
  `head -1 ds-bundle/components/<group>/<Name>/<Name>.html`.
  When you raise a viewport, raise the preview's own frame to match — at 900px tall the DocsNav rail
  is `maxHeight: 812` (the real `.sidebarCol` `calc(100vh - 88px)`); at the old 600 the archived nav
  cropped mid-tree.
- **`[CONFIG_STALE]` fails `preview-rebuild` but `package-capture` still runs**, silently
  re-shooting the previously compiled previews. The tell is the printed cell labels — if they are
  the old export names, you are grading a stale card.
- **A shim edit is invisible to captures until a central `package-build`.** `BrandTheme` lives in
  `_ds_bundle.js`, and `preview-rebuild` only recompiles `_preview/<Name>.js`. Verify the artifact,
  not the source: `grep _ds_bundle.js` for the new code before trusting any capture.
- **Animations capture at roughly frame 0** (~300–600ms after load). `page.clock.setFixedTime` fixes
  `Date` but does not pause `setInterval`, and there is no capture-delay knob.
  `MessageRelayAnimation` / `NodeRelayAnimation` spawn their ring on a 250ms tick, so every
  screenshot shows the Lead node alone — the previews tighten the frame and caption it as the
  opening frame rather than pretending otherwise. `RelayAnimation` and `ChannelMessagesPreview`
  paint populated first frames and capture well.
- **Only cells that paint their own surface survive a page-background bug** — that is why the
  white-page defect passed a spot check of card-based components and was exposed only by bare
  badges and inputs. Check a transparent component when validating theme changes.
