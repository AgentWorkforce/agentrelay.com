## How to build with Agent Relay

Components come from `window.AgentRelay` (root `_ds_bundle.js`). Import `styles.css` once — it
carries the brand tokens, the compiled component CSS, and the self-hosted brand faces
(Inter body, Sora headings, Geist Mono code).

### Agent Relay is a dark product — start there

The site renders `<html data-theme="dark">` on every route, marketing and docs alike. Dark is the
brand. Set it once, at the root of what you build:

```jsx
<BrandTheme>{/* your page */}</BrandTheme>   // or: <html data-theme="dark">
```

Without it the tokens fall back to a light `:root` set that the shipped product never displays —
components still render, they just aren't Agent Relay. `BrandTheme` also accepts `theme="light"`;
the light palette is a supported alternate, not the default.

Because dark re-defines ~70 tokens, anything written **in tokens** themes itself and anything
written in hardcoded hex does not. That is the whole reason to use the token names below.

One other wrapper: **`CodeGroup`** reads the docs language from context — wrap it in
`DocsLanguageProvider` when you want its TypeScript/Python tabs to work.

### Style with CSS custom properties — that is the vocabulary

The components' own class names are hashed CSS-module names (`site-nav_navLink__aB3x`). Never
target or reproduce them. The public styling surface is the token set, and it is what your own
layout CSS should use too:

| Role | Tokens |
|---|---|
| Surfaces | `--bg` `--bg-elevated` `--surface` `--surface-strong` `--section-bg` `--card-bg` |
| Text | `--fg` `--fg-muted` `--fg-faint` |
| Brand | `--primary` `--primary-hover` `--primary-fg` `--primary-50`…`--primary-950` |
| Secondary (warm) | `--secondary-bg` `--secondary-fg` `--secondary-500`…`--secondary-950` |
| Lines | `--line` `--card-border` `--card-hover-border` |
| Code | `--code-bg` `--code-fg` `--inline-code-bg` `--inline-code-fg` |
| Terminal | `--terminal-bg` `--terminal-panel` `--terminal-fg` `--terminal-keyword` `--terminal-string` |
| Type | `--font-geist-sans` (body) `--font-heading` (Sora) `--font-geist-mono` (code) |
| Easing | `--ease-out-quint` `--ease-out-expo` |

Two global classes are part of the system and safe to use on your own anchors and buttons:
`.btn` plus `.btn-primary` or `.btn-secondary` — the canonical pill button, shared site-wide.

**Do not assume arbitrary Tailwind utilities exist.** The shipped stylesheet is content-scanned
from this site, so it contains only the utilities the site itself uses — `p-0`, `pb-4`, `w-full`,
`gap-2`, `text-sm`, `inline-flex`, `items-center` are present; `pt-5` is not. Write your layout as
plain CSS (or inline styles) against the tokens above and you are never guessing.

### Where the truth is

- `styles.css` and its `@import` closure — the real tokens and compiled component CSS.
- `components/<group>/<Name>/<Name>.prompt.md` — usage and examples for one component.
- `components/<group>/<Name>/<Name>.d.ts` — the exact prop contract.

Groups: **Primitives** (9 — Button, Badge, Input, Card + its parts) · **Docs** (16 — Note, Warning,
DocsCard, CardGroup, CodeGroup, nav, search, version select) · **Site** (9 — SiteNav, SiteFooter,
WaitlistForm, InstallCommand, logos) · **Media** (7 — relay animations, SdkCodeExample,
ChannelMessagesPreview) · **Agents** (4) · **Blog** (1).

### Idiomatic composition

```jsx
const { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } = window.AgentRelay;

<section style={{ background: 'var(--section-bg)', padding: '48px 24px' }}>
  <h2 style={{ font: '600 1.75rem/1.2 var(--font-heading)', color: 'var(--fg)' }}>
    Your agents, talking
  </h2>
  <Card style={{ maxWidth: 380, padding: 24, marginTop: 24 }}>
    <CardHeader className="p-0 pb-4">
      <Badge>Relay Ready</Badge>
      <CardTitle>prod-pipeline-fix</CardTitle>
      <CardDescription>4 agents · 128 messages</CardDescription>
    </CardHeader>
    <CardContent className="p-0">
      <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem' }}>
        Planner assigned the review to Builder.
      </p>
      <Button style={{ marginTop: 16 }}>Open channel</Button>
    </CardContent>
  </Card>
</section>
```

Use library components for controls and surfaces; use tokens for your own layout glue.
