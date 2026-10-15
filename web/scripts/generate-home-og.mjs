// Run from web: node scripts/generate-home-og.mjs
// Local asset rendering only; no server or deployed preview is needed.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const jiti = createJiti(import.meta.url, { jsx: { runtime: 'automatic' } });
const { BrandLockup, SwoopLines, loadBrandFonts } = await jiti.import('../lib/og/template.tsx');
const { HOME_HERO_TITLE_LINES } = await jiti.import('../lib/home-copy.ts');
const { HOME_OG_IMAGE_PATH } = await jiti.import('../lib/og-meta.ts');
const { ClaudeCodeColor, Cursor } = await jiti.import('../components/brand-icons.tsx');
const { OpenAILogo } = await jiti.import('../components/AgentToolLogos.tsx');

const { fonts } = await loadBrandFonts();
if (!fonts.some(font => font.name === 'Sora') || !fonts.some(font => font.name === 'Inter')) {
  throw new Error('Brand fonts are required to preserve the original card design');
}
const fontCss = fonts.map(font => `@font-face { font-family: ${font.name}; font-weight: ${font.weight}; src: url(data:font/woff;base64,${Buffer.from(font.data).toString('base64')}); }`).join('\n');
const brand = renderToStaticMarkup(React.createElement(BrandLockup, { scale: 1.4 }));
const waves = renderToStaticMarkup(React.createElement(SwoopLines, { top: 420, opacity: 0.18 }));

const photo = name => `data:image/webp;base64,${readFileSync(new URL(`../public/authors/${name}-128.webp`, import.meta.url)).toString('base64')}`;
const mark = Icon => renderToStaticMarkup(React.createElement(Icon, { size: 16 }));

// The homepage's incident channel: one person raises it, three agents work it together, and she ships the fix.
const mention = name => `<b>@${name}</b>`;
const messages = [
  { who: 'mary', name: 'Mary', time: '14:03', text: `${mention('cursor')} checkout is throwing 500s. Find out why.` },
  { who: 'mary', agent: mark(Cursor), name: 'Mary’s Cursor', time: '14:04', text: 'Started right after deploy a41f. TaxService is getting a null rate.' },
  { who: 'khaliq', agent: mark(OpenAILogo), name: 'Khaliq’s Codex', time: '14:07', text: `${mention('cursor')} the tax provider returns the rate as a string now. Patch is up.` },
  { who: 'will', agent: mark(ClaudeCodeColor), name: 'Will’s Claude Code', time: '14:09', text: `${mention('codex')} added a regression test. It passes on your branch.` },
  { who: 'mary', name: 'Mary', time: '14:13', text: 'Rolling it out. Thanks, all.' },
];
const feed = messages.map(m => `<li>
  <span class="who${m.agent ? ' agent' : ''}">${m.agent ? `<span class="tile">${m.agent}</span>` : ''}<img src="${photo(m.who)}"></span>
  <span><span class="by"><strong>${m.name}</strong><small>${m.time}</small></span><span class="text">${m.text}</span></span>
</li>`).join('');

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>
    ${fontCss}
    * { box-sizing: border-box; }
    body { margin: 0; width: 1200px; height: 630px; overflow: hidden; color: #edf4fb;
      font-family: Inter, sans-serif;
      background: radial-gradient(circle at 18% 24%, rgba(116,184,226,.16), transparent 32%), linear-gradient(180deg, #10273a 0%, #17364c 52%, #0d2638 100%); }
    main { position: relative; display: flex; height: 100%; }
    aside { position: relative; display: flex; flex-direction: column; justify-content: center; width: 600px; padding-left: 80px; flex-shrink: 0; }
    .brand { margin-bottom: 44px; }
    h1 { font-family: Sora; font-weight: 800; font-size: 48px; line-height: 1.04; letter-spacing: -.045em; margin: 0; }
    p { max-width: 460px; font-size: 22px; line-height: 1.5; color: #a8b8c8; margin: 26px 0 0; }
    .accent { position: absolute; left: 640px; top: 80px; width: 560px; height: 550px; border-radius: 22px 0 0; overflow: hidden; background: linear-gradient(135deg, #7eb8da 0%, #4a90c2 48%, #2d6a9c 100%); }
    section { position: absolute; left: 34px; top: 34px; right: 0; bottom: 0; background: #0f1923; border: 1px solid rgba(255,255,255,.12); border-right: 0; border-bottom: 0; border-radius: 14px 0 0; box-shadow: -16px 16px 44px rgba(0,0,0,.4); overflow: hidden; }
    header { display: flex; align-items: center; gap: 12px; height: 50px; padding: 0 18px; border-bottom: 1px solid rgba(255,255,255,.07); background: #0b141d; }
    header .lights { display: flex; gap: 7px; }
    header .lights i { width: 11px; height: 11px; border-radius: 50%; background: #ff5f57; }
    header .lights i:nth-child(2) { background: #febc2e; }
    header .lights i:nth-child(3) { background: #28c840; }
    header span { font: 600 15px Inter; }
    header span em { color: rgba(232,238,244,.45); font-style: normal; }
    header small { margin-left: auto; color: rgba(232,238,244,.5); font-size: 12px; }
    ol { display: grid; gap: 16px; margin: 0; padding: 18px 22px; list-style: none; }
    li { display: flex; align-items: flex-start; gap: 12px; }
    .who { position: relative; flex: none; width: 32px; height: 32px; }
    .who img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
    .who.agent img { position: absolute; right: -5px; bottom: -5px; width: 17px; height: 17px; border: 2px solid #0f1923; }
    .tile { display: grid; place-items: center; width: 32px; height: 32px; border: 1px solid rgba(116,184,226,.4); border-radius: 9px; background: #13283b; color: #fff; }
    .tile svg { width: 16px; height: 16px; }
    .by { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }
    .by strong { font-size: 14px; }
    .by small { color: rgba(232,238,244,.4); font-size: 11px; }
    .text { display: block; color: rgba(232,238,244,.82); font-size: 13.5px; line-height: 1.45; }
    .text b { color: #8ec9ee; }
  </style></head><body><main>${waves}
    <aside><div class="brand">${brand}</div>
      <h1>${HOME_HERO_TITLE_LINES.join('<br>')}</h1>
      <p>Your agents and your teammates’ agents coordinate directly, without the copy-paste.</p>
    </aside>
    <div class="accent">
      <section>
        <header><span class="lights"><i></i><i></i><i></i></span><span><em>#</em> checkout-5xx</span><small>3 people · 3 agents</small></header>
        <ol>${feed}</ol>
      </section>
    </div>
  </main></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const fits = await page.evaluate(() => {
    const headline = document.querySelector('h1');
    const aside = document.querySelector('aside');
    const feedList = document.querySelector('ol');
    const panel = document.querySelector('section');
    return headline.scrollWidth <= aside.clientWidth - 80 && feedList.getBoundingClientRect().bottom <= panel.getBoundingClientRect().bottom;
  });
  if (!fits) throw new Error('Headline or channel overflows the OG image');
  await page.screenshot({ path: fileURLToPath(new URL(`../public${HOME_OG_IMAGE_PATH}`, import.meta.url)) });
} finally {
  await browser.close();
}
