// Run from web: node scripts/generate-flows-og.mjs
// Local asset rendering only; no server or deployed preview is needed.
import { chromium } from '@playwright/test';
import { codeToHtml } from 'shiki';
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

const script = `export default flow<TicketInput>(
  "software-factory",
  { budget: "$8/run" },
  async (f, input) => {
    await f
      .agent("planner", { task: "Write the plan" })
      .gate(r => r.artifacts.includes("plan/plan.md"));

    await f
      .agent("implementer", { task: "Build the plan" });

    // Tests run outside the agent.
    await f.run("npm test")
      .gate(out => /failed:\\s*0/.test(out));

    await f
      .agent("adversary", { task: "Review changes" })
      .gate(r => r.artifacts.includes("adversary/clean"));

    f.done("success");
  },
);`;

const code = await codeToHtml(script, { lang: 'typescript', theme: 'github-dark' });
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
    h1 { font-family: Sora; font-weight: 800; font-size: 48px; line-height: 1; letter-spacing: -.045em; margin: 0; }
    p { max-width: 470px; font-size: 23px; line-height: 1.5; color: #a8b8c8; margin: 26px 0 0; }
    .accent { position: absolute; left: 606px; top: 90px; width: 594px; height: 540px; border-radius: 21.6px 0 0; overflow: hidden; background: linear-gradient(135deg, #c1674b, #a8543b); }
    section { position: absolute; left: 34.2px; top: 19.8px; width: 559.8px; height: 520.2px; background: #0f1b29; border: 2px solid rgba(116,184,226,.30); border-radius: 14.4px 0 0; padding: 18px; box-shadow: -16px 16px 44px rgba(0,0,0,.5); }
    header { display: flex; align-items: center; gap: 8px; height: 36px; border-bottom: 1px solid rgba(116,184,226,.18); padding-bottom: 11px; }
    .ts { border-radius: 5px; padding: 4px; color: #94cbef; background: #243e51; font: 700 12px Inter; }
    header span { font: 700 15px Inter; }
    pre { margin: 0; padding: 15px 0 0; background: transparent !important; }
    code { font: 12.5px/19.5px Menlo, Consolas, monospace; }
  </style></head><body><main>${waves}
    <aside><div class="brand">${brand}</div>
      <h1>A Flow is a script<br>that runs your agents.</h1>
      <p>Coordinate Claude, Codex, and other coding agents across shared work, approvals, and long-running workflows</p>
    </aside>
    <div class="accent">
      <svg width="576" height="576" viewBox="0 0 640 640" fill="none" style="position:absolute;left:0;top:0"><g stroke="#fff" stroke-width="1.6" stroke-linecap="round"><line x1="-60" y1="150" x2="170" y2="-80" opacity=".22"/><line x1="-60" y1="220" x2="240" y2="-80" opacity=".18"/><line x1="-60" y1="430" x2="120" y2="250" opacity=".16"/><line x1="-40" y1="600" x2="150" y2="410" opacity=".13"/></g></svg>
      <section><header><b class="ts">TS</b><span>software-factory.flow.ts</span></header>${code}</section>
    </div>
  </main></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const fits = await page.evaluate(() => {
    const code = document.querySelector('pre');
    const panel = document.querySelector('section');
    return code.scrollWidth <= panel.clientWidth && code.getBoundingClientRect().bottom <= panel.getBoundingClientRect().bottom;
  });
  if (!fits) throw new Error('Script overflows the OG image');
  await page.screenshot({ path: fileURLToPath(new URL('../public/og/agent-relay-flows-v20260913.png', import.meta.url)) });
} finally {
  await browser.close();
}
