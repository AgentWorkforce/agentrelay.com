// Run from web: node scripts/generate-teams-og.mjs
// Local asset rendering only; no server or deployed preview is needed.
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const jiti = createJiti(import.meta.url, { jsx: { runtime: 'automatic' } });
const { BrandLockup, SwoopLines, loadBrandFonts } = await jiti.import('../lib/og/template.tsx');
const { fonts } = await loadBrandFonts();
if (!fonts.some(font => font.name === 'Sora') || !fonts.some(font => font.name === 'Inter')) {
  throw new Error('Brand fonts are required to preserve the original card design');
}
const fontCss = fonts.map(font => `@font-face { font-family: ${font.name}; font-weight: ${font.weight}; src: url(data:font/woff;base64,${Buffer.from(font.data).toString('base64')}); }`).join('\n');
const brand = renderToStaticMarkup(React.createElement(BrandLockup, { scale: 1.4 }));
const waves = renderToStaticMarkup(React.createElement(SwoopLines, { top: 420, opacity: 0.18 }));

const { AgentToolLogo } = await jiti.import('../components/AgentToolLogos.tsx');
const { default: Grok } = await jiti.import('@lobehub/icons/es/Grok');
const agents = [
  ['claude', 'Claude Code', 'Review the pull request'],
  ['codex', 'Codex', 'Build session search'],
  ['opencode', 'OpenCode', 'Update the setup guide'],
  ['gemini', 'Gemini CLI', 'Check retry handling'],
  ['copilot', 'Copilot', 'Add team invitations'],
  ['grok', 'Grok', 'Trace the dropped socket'],
];
const tiles = agents.map(([provider, label, task]) => {
  const logo = renderToStaticMarkup(provider === 'grok'
    ? React.createElement(Grok, { size: 36 })
    : React.createElement(AgentToolLogo, { provider, className: 'agent-logo', idPrefix: `og-${provider}` }));
  return `<article><div class="tool">${logo}<strong>${label}</strong></div><p>${task}</p><footer><i></i> Working</footer></article>`;
}).join('');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>
    ${fontCss}
    * { box-sizing: border-box; }
    body { margin: 0; width: 1200px; height: 630px; overflow: hidden; color: #edf4fb;
      font-family: Inter, sans-serif; background: #08111a;
      background-image: radial-gradient(900px 540px at 6% -12%, rgba(116,184,226,.20) 0%, transparent 60%), radial-gradient(720px 500px at 106% 116%, rgba(116,184,226,.10) 0%, transparent 55%), linear-gradient(165deg, #0b1a29 0%, #08111a 55%, #060d15 100%); }
    main { position: relative; display: flex; height: 100%; }
    aside { position: relative; display: flex; flex-direction: column; justify-content: center; width: 600px; padding-left: 80px; flex-shrink: 0; }
    .brand { margin-bottom: 44px; }
    h1 { font-family: Sora; font-weight: 800; font-size: 46px; line-height: 1; letter-spacing: -.045em; margin: 0; }
    p { max-width: 470px; font-size: 23px; line-height: 1.5; color: #a8b8c8; margin: 26px 0 0; }
    .accent { position: absolute; left: 606px; top: 90px; width: 594px; height: 540px; border-radius: 21.6px 0 0; overflow: hidden; background: linear-gradient(135deg, #c1674b, #a8543b); }
    section { position: absolute; left: 34.2px; top: 19.8px; width: 559.8px; height: 520.2px; background: #0f1b29; border: 2px solid rgba(116,184,226,.30); border-radius: 14.4px 0 0; padding: 18px; box-shadow: -16px 16px 44px rgba(0,0,0,.5); }
    header { display: flex; align-items: center; gap: 8px; height: 36px; border-bottom: 1px solid rgba(116,184,226,.18); padding-bottom: 11px; }
    header span { font: 700 15px Inter; }
    header { justify-content: space-between; }
    header small { color: #a8b8c8; font-size: 12px; }
    .agents { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-top: 18px; }
    article { min-width: 0; padding: 18px 14px; border: 1px solid #294153; border-radius: 9px; background: #091722; }
    .tool { display: flex; align-items: center; gap: 10px; }
    .tool svg { width: 32px; height: 32px; flex-shrink: 0; }
    .tool strong { font-size: 17px; white-space: nowrap; }
    article p { font-size: 13px; line-height: 1.5; margin: 15px 0 12px; white-space: nowrap; }
    footer { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #94cbef; }
    footer i { width: 5px; height: 5px; border-radius: 50%; background: #74b8e2; }
  </style></head><body><main>${waves}
    <aside><div class="brand">${brand}</div>
      <h1>Your team’s agents.<br>One shared view.</h1>
      <p>See what every agent is doing.<br>Follow the work. Share what works.</p>
    </aside>
    <div class="accent">
      <svg width="576" height="576" viewBox="0 0 640 640" fill="none" style="position:absolute;left:0;top:0"><g stroke="#fff" stroke-width="1.6" stroke-linecap="round"><line x1="-60" y1="150" x2="170" y2="-80" opacity=".22"/><line x1="-60" y1="220" x2="240" y2="-80" opacity=".18"/><line x1="-60" y1="430" x2="120" y2="250" opacity=".16"/><line x1="-40" y1="600" x2="150" y2="410" opacity=".13"/></g></svg>
      <section><header><span>Team sessions</span><small>6 agents connected</small></header><div class="agents">${tiles}</div></section>
    </div>
  </main></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const fits = await page.evaluate(() => {
    const code = document.querySelector('.agents');
    const panel = document.querySelector('section');
    return code.scrollWidth <= panel.clientWidth && code.getBoundingClientRect().bottom <= panel.getBoundingClientRect().bottom;
  });
  if (!fits) throw new Error('Agent tiles overflow the OG image');
  await page.screenshot({ path: fileURLToPath(new URL('../public/og/agent-relay-teams-v20260915.png', import.meta.url)) });
} finally {
  await browser.close();
}
