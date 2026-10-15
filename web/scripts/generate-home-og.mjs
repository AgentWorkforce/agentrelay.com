// Run from web: node scripts/generate-home-og.mjs
// Local asset rendering only; no server or deployed preview is needed.
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const jiti = createJiti(import.meta.url, { jsx: { runtime: 'automatic' } });
const { BrandLockup, SwoopLines, loadBrandFonts } = await jiti.import('../lib/og/template.tsx');
const { HOME_OG_IMAGE_PATH } = await jiti.import('../lib/og-meta.ts');
const { ClaudeCodeColor } = await jiti.import('../components/brand-icons.tsx');
const { OpenAILogo } = await jiti.import('../components/AgentToolLogos.tsx');

const { fonts } = await loadBrandFonts();
if (!fonts.some(font => font.name === 'Sora') || !fonts.some(font => font.name === 'Inter')) {
  throw new Error('Brand fonts are required to preserve the original card design');
}
const fontCss = fonts.map(font => `@font-face { font-family: ${font.name}; font-weight: ${font.weight}; src: url(data:font/woff;base64,${Buffer.from(font.data).toString('base64')}); }`).join('\n');
const brand = renderToStaticMarkup(React.createElement(BrandLockup, { scale: 1.2 }));
const waves = renderToStaticMarkup(React.createElement(SwoopLines, { top: 420, opacity: 0.18 }));

const logo = Icon => renderToStaticMarkup(React.createElement(Icon, { size: 64 }));
const pill = (Icon, name) => `<span class="pill">${logo(Icon)}<span>${name}</span></span>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>
    ${fontCss}
    * { box-sizing: border-box; }
    body { margin: 0; width: 1200px; height: 630px; overflow: hidden; color: #edf4fb;
      font-family: Inter, sans-serif;
      background: radial-gradient(70% 60% at 50% 0%, rgba(116,184,226,.12), transparent 70%), linear-gradient(180deg, #121c28 0%, #0d1620 100%); }
    main { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; }
    .brand { position: absolute; top: 56px; left: 80px; }
    h1 { display: grid; justify-items: center; gap: 14px; margin: 24px 0 0; font-family: Sora; font-weight: 700; font-size: 88px; line-height: 1; letter-spacing: -.045em; }
    .row { display: flex; align-items: center; gap: 22px; white-space: nowrap; }
    .pill { display: inline-flex; align-items: center; gap: 18px; padding: 12px 26px 16px 22px; border: 2px solid rgba(160,205,235,.16); border-radius: 18px; background: rgba(6,16,28,.62); box-shadow: inset 0 1px 0 rgba(255,255,255,.06); color: #fff; }
    .pill svg { width: 64px; height: 64px; flex: none; }
    p { margin: 40px 0 0; font-size: 28px; line-height: 1.4; color: #a8b8c8; }
  </style></head><body><main>${waves}
    <div class="brand">${brand}</div>
    <h1>
      <span class="row">Let ${pill(ClaudeCodeColor, 'Claude Code')}</span>
      <span class="row">talk to ${pill(OpenAILogo, 'Codex')}</span>
    </h1>
    <p>Real-time agent to agent messaging</p>
  </main></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const fits = await page.evaluate(() =>
    [...document.querySelectorAll('h1 .row, p')].every(el => {
      const box = el.getBoundingClientRect();
      return box.left >= 40 && box.right <= 1160 && box.bottom <= 600;
    }),
  );
  if (!fits) throw new Error('Headline overflows the OG image');
  await page.screenshot({ path: fileURLToPath(new URL(`../public${HOME_OG_IMAGE_PATH}`, import.meta.url)) });
} finally {
  await browser.close();
}
