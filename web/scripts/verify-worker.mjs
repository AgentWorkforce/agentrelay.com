// Exercise the actual built Worker, not Next's development server. A successful
// bundle/upload does not prove the Worker can boot or read prerendered content.
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

const base = new URL(process.argv[2]);
const cases = [
  ['/', /Agent Relay/i],
  ['/docs/sessions', /Sessions/],
  ['/blog/promptgramming', /Promptgramming/],
  // force-dynamic: proves request-time rendering as well as the static cache.
  // This checks rendering, not availability of the external directory service.
  ['/directory', /Agent directory/],
];

// Wait only for connection readiness. An HTTP error is a test failure, not a
// startup condition to hide with retries.
for (let attempt = 0; ; attempt++) {
  try {
    await fetch(base, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
    break;
  } catch (error) {
    if (attempt === 29) throw error;
    await setTimeout(1000);
  }
}

for (const [path, content] of cases) {
  const response = await fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `${path}: Worker returned ${response.status}`);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  const html = await response.text();
  assert.match(html, content, `${path}: expected page content is missing`);
  assert.doesNotMatch(html, /Worker threw exception|Internal Server Error/);
  console.log(`Worker smoke: ${path} returned the expected page`);
  if (path === '/') {
    const asset = html.match(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+\.(?:js|css))"/);
    assert.ok(asset, 'Homepage has no built JavaScript/CSS asset');
    const assetUrl = new URL(asset[1], base);
    assert.equal(assetUrl.origin, base.origin, 'Built asset points outside this Worker');
    const assetResponse = await fetch(assetUrl, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    assert.equal(assetResponse.status, 200, 'Built asset is unavailable');
    assert.doesNotMatch(assetResponse.headers.get('content-type') ?? '', /text\/html/);
  }
}
