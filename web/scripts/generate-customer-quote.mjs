// Run from web: node scripts/generate-customer-quote.mjs
// Renders the shareable customer quote card (629:368, 1258x736 @2x) to public/img.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const jiti = createJiti(import.meta.url, { jsx: { runtime: 'automatic' } });
const { BrandLockup, SwoopLines, loadBrandFonts } = await jiti.import('../lib/og/template.tsx');
const { POMERADO_QUOTE: quote } = await jiti.import('../lib/customer-quotes.ts');

const { fonts } = await loadBrandFonts();
if (!fonts.some(font => font.name === 'Sora') || !fonts.some(font => font.name === 'Inter')) {
  throw new Error('Brand fonts are required to render the quote card');
}
const fontCss = fonts.map(font => `@font-face { font-family: ${font.name}; font-weight: ${font.weight}; src: url(data:font/woff;base64,${Buffer.from(font.data).toString('base64')}); }`).join('\n');
const brand = renderToStaticMarkup(React.createElement(BrandLockup, { scale: 1 }));
const waves = renderToStaticMarkup(React.createElement(SwoopLines, { top: 560, opacity: 0.16 }));
const publicFile = path => new URL(`../public${path}`, import.meta.url);
const dataUri = path => `data:image/png;base64,${readFileSync(publicFile(path)).toString('base64')}`;
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const tag = { lead: 'strong', key: 'em', plain: 'span' };
const body = quote.segments.map(({ tone, text }) => `<${tag[tone]}>${escape(text)}</${tag[tone]}>`).join(' ');

const WIDTH = 1258;
const HEIGHT = 736;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 2 });
  await page.setContent(`<!doctype html><html><head><style>
    ${fontCss}
    * { box-sizing: border-box; }
    body { margin: 0; width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; color: #edf4fb; font-family: Inter, sans-serif;
      background: radial-gradient(70% 55% at 50% 0%, rgba(116,184,226,.14), transparent 70%), linear-gradient(180deg, #121c28 0%, #0d1620 100%); }
    main { position: relative; height: 100%; padding: 52px 72px; display: flex; flex-direction: column; }
    .top { display: flex; justify-content: flex-end; }
    .bubble { position: relative; margin-top: auto; padding: 50px 96px 40px 52px; border: 2px solid rgba(160,205,235,.16);
      border-radius: 34px 34px 34px 6px; background: rgba(6,16,28,.62); box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 40px 90px rgba(0,0,0,.35); }
    .mark { position: absolute; top: -38px; left: 44px; font-family: Sora; font-weight: 700; font-size: 124px; line-height: 1; color: #74b8e2; }
    blockquote { margin: 0; font-weight: 500; font-size: 34px; line-height: 1.38; letter-spacing: -.015em; color: #a8b8c8; text-wrap: pretty; }
    blockquote strong { font-family: Sora; font-weight: 700; color: #fff; letter-spacing: -.03em; }
    blockquote em { font-style: normal; color: #edf4fb; }
    .who { display: flex; align-items: center; gap: 20px; margin: 24px 0 0 2px; }
    .avatar { position: relative; flex: none; width: 80px; height: 80px; overflow: hidden; border-radius: 16px 16px 16px 3px; border: 2px solid rgba(160,205,235,.22); }
    .avatar img { position: absolute; width: 156px; height: 156px; left: -36px; top: -4px; }
    .name { font-family: Sora; font-weight: 700; font-size: 26px; letter-spacing: -.02em; color: #fff; }
    .role { display: flex; align-items: center; gap: 4px; margin-top: 4px; font-size: 20px; color: #a8b8c8; }
    .role img { width: 30px; height: 30px; margin-left: 2px; }
    .spacer { margin-top: auto; }
  </style></head><body><main>${waves}
    <div class="top">${brand}</div>
    <div class="bubble"><div class="mark">“</div><blockquote>${body}</blockquote></div>
    <div class="who">
      <div class="avatar"><img src="${dataUri(quote.avatar)}" alt=""></div>
      <div><div class="name">${quote.name}</div><div class="role">${quote.title}, <img src="${dataUri(quote.companyLogo)}" alt="">${quote.company}</div></div>
    </div>
    <div class="spacer"></div>
  </main></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const fits = await page.evaluate(height => document.querySelector('main').scrollHeight <= height, HEIGHT);
  if (!fits) throw new Error('Quote overflows the card');
  await page.screenshot({ path: fileURLToPath(publicFile(quote.image)) });
} finally {
  await browser.close();
}
