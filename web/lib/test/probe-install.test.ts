import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const installer = fileURLToPath(new URL('../../public/install.sh', import.meta.url));

describe('Relay Probe installer', () => {
  it('parses under sh and exposes help without starting installation', () => {
    expect(spawnSync('/bin/sh', ['-n', installer], { encoding: 'utf8' }).status).toBe(0);
    const help = spawnSync('/bin/sh', [installer, '--help'], { encoding: 'utf8' });
    expect(help.status).toBe(0);
    expect(help.stdout).toContain('agent-relay-probe');
  });

  it('prints the platform under set -u without treating the ellipsis as part of its name', () => {
    const source = readFileSync(installer, 'utf8');
    const progressLine = source.split('\n').find((line) => line.includes('Downloading Agent Relay Probe for'));
    expect(progressLine).toBeDefined();

    const result = spawnSync('/bin/sh', ['-c', `set -u; platform=darwin-arm64; ${progressLine}`], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('Downloading Agent Relay Probe for darwin-arm64…\n');
  });
});
