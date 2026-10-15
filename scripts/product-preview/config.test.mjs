import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewConfig } from './config.mjs';
test('preview is service-binding-only and stage isolated', () => {
  const config = previewConfig('pp-123-1', 'https://preview.agentrelay.cloud');
  assert.equal(config.name, 'agentrelay-web-pp-123-1');
  assert.deepEqual(config.routes, []);
  assert.equal(config.workers_dev, false);
});
test('refuses production and unscoped destinations', () => {
  for (const stage of ['production', 'dev', 'pp-123', 'pp-0-1']) assert.throws(() => previewConfig(stage, 'https://preview.agentrelay.cloud'));
  assert.throws(() => previewConfig('pp-123-1', 'https://agentrelay.com'));
});
