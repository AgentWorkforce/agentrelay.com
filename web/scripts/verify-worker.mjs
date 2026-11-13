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

// Legacy entry points redirect to current docs. Follow each one and check the
// page it lands on, so a redirect to a deleted page fails here, not in prod.
const redirects = [
  ['/relaycast', '/docs/relaycast-api', /Relaycast API/],
  ['/message', '/docs/relaycast-api', /Relaycast API/],
  ['/auth', '/docs/relaycast-api', /Relaycast API/],
  ['/docs/relayhistory', '/docs/sessions', /Sessions/],
];

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

for (const [path, target, content] of redirects) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `${path}: redirect landed on ${response.status}`);
  assert.equal(new URL(response.url).pathname, target, `${path}: redirected to ${response.url}`);
  assert.match(await response.text(), content, `${path}: expected page content is missing`);
  console.log(`Worker smoke: ${path} redirects to ${target}`);
}

// The self-hosting guides are public and prerendered (lib/selfhost-docs.ts):
// each page, its Markdown mirror and the downloadable helper files must serve
// from the built Worker without a session.
for (const [path, type, content] of [
  ['/docs/self-hosting', /text\/html/, /Self-hosting Agent Relay/],
  ['/docs/self-hosting/install-eks', /text\/html/, /Install on EKS/],
  ['/docs/self-hosting/agents/install-eks', /text\/html/, /Agent runbook/],
  ['/docs/self-hosting/install-gke.md', /text\/markdown/, /# Install on GKE/],
  ['/docs/self-hosting/agents.md', /text\/markdown/, /Never print, log, paste or summarize a secret/],
  ['/self-hosting/files/eks/SHA256SUMS', null, /  rds-setup\.sh\n/],
]) {
  const response = await fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `${path}: Worker returned ${response.status}`);
  if (type) assert.match(response.headers.get('content-type') ?? '', type, `${path}: wrong content type`);
  assert.doesNotMatch(response.headers.get('x-robots-tag') ?? '', /noindex/, `${path}: must be indexable`);
  assert.match(await response.text(), content, `${path}: expected content is missing`);
  console.log(`Worker smoke: ${path} is public`);
}
