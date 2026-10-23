import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

export function previewConfig(stage, origin) {
  if (!/^pp-[1-9][0-9]*-[1-9][0-9]*$/.test(stage ?? '') || origin !== 'https://preview.agentrelay.cloud') throw new Error('Invalid product preview target');
  return {
    name: `agentrelay-web-${stage}`, main: '.open-next/worker.js',
    compatibility_date: '2025-04-01', compatibility_flags: ['nodejs_compat'],
    assets: { directory: '.open-next/assets', binding: 'ASSETS' },
    workers_dev: false, preview_urls: false, routes: [], observability: { enabled: true },
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  writeFileSync('web/wrangler.product-preview.json', JSON.stringify(previewConfig(process.env.SST_STAGE, process.env.PRODUCT_PREVIEW_ORIGIN)));
}
