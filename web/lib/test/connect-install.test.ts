import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync, rmSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
const installer = fileURLToPath(new URL('../../public/connect/install.sh', import.meta.url));
function runInstall({ corrupt = false, compatible = true, existing = false, unrelated = false, platform = 'Linux' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'connect-installer-test-'));
  const home = join(dir, 'home'); const mocks = join(dir, 'bin');
  mkdirSync(home); mkdirSync(mocks);
  const artifact = join(dir, 'archive.tar.gz'); const tree = join(dir, 'tree');
  mkdirSync(join(tree, 'agent_relay/helpers'), { recursive: true });
  const helper = '#!/bin/sh\n' + (compatible ? 'test "$1" = connect && test "$3" = --help\n' : 'exit 2\n');
  writeFileSync(join(tree, 'agent_relay/helpers/agent-relay-probe'), helper);
  expect(spawnSync('tar', ['-czf', artifact, '-C', tree, 'agent_relay']).status).toBe(0);
  const digest = corrupt ? '0'.repeat(64) : createHash('sha256').update(readFileSync(artifact)).digest('hex');
  writeFileSync(join(dir, 'checksum'), `${digest}  probe.tar.gz\n`);
  const script = (name: string, content: string) => { writeFileSync(join(mocks, name), `#!/bin/sh\n${content}`); chmodSync(join(mocks, name), 0o755); };
  script('uname', `if [ "$1" = -s ]; then echo ${platform}; else echo arm64; fi\n`);
  script('codesign', 'printf "%s\\n" "$*" >> "$FIXTURE/signature-check"\n');
  script('curl', `out=\nurl=\nwhile [ "$#" -gt 0 ]; do\n case "$1" in -o) out=$2; shift 2;; https://*) url=$1; shift;; *) shift;; esac\ndone\nprintf '%s\\n' "$url" >> "$FIXTURE/downloads"\ncase "$url" in\n */latest) printf '%s' 'https://github.com/AgentWorkforce/relay-desktop-releases/releases/tag/v2099.1.1';;\n *.sha256) cp "$FIXTURE/checksum" "$out";;\n *.tar.gz) cp "$FIXTURE/archive.tar.gz" "$out";;\n *) exit 5;;\nesac\n`);
  const target = join(home, '.local/lib/agent-relay/connect/relay');
  if (existing || unrelated) {
    mkdirSync(join(home, '.local/bin'), { recursive: true });
    mkdirSync(join(home, '.local/lib/agent-relay/connect'), { recursive: true });
    writeFileSync(target, 'old-binary');
    if (unrelated) writeFileSync(join(home, '.local/bin/relay'), 'another-tool');
    else symlinkSync(target, join(home, '.local/bin/relay'));
  }
  const result = spawnSync('/bin/sh', [installer], { encoding: 'utf8', env: { ...process.env, HOME: home, FIXTURE: dir, PATH: `${mocks}:${process.env.PATH}` } });
  const output = { result, binary: existsSync(target) ? readFileSync(target, 'utf8') : undefined, downloads: readFileSync(join(dir, 'downloads'), 'utf8'), signature: existsSync(join(dir, 'signature-check')) };
  rmSync(dir, { recursive: true, force: true }); return output;
}
describe('native Connect installer', () => {
  it('parses as POSIX sh', () => expect(spawnSync('/bin/sh', ['-n', installer]).status).toBe(0));
  it('installs only the verified helper from one immutable release without starting it', () => {
    const { result, binary, downloads } = runInstall();
    expect(result.status, result.stderr).toBe(0); expect(binary).toContain('#!/bin/sh');
    expect(result.stdout).toContain('No relay process has been started');
    expect(downloads).toContain('/download/v2099.1.1/AgentRelay-Linux-arm64-probe.tar.gz');
    expect(downloads).not.toContain('/latest/download');
  });
  it('checks the macOS publisher signature', () => {
    const { result, signature } = runInstall({ platform: 'Darwin' });
    expect(result.status, result.stderr).toBe(0); expect(signature).toBe(true);
  });
  it.each([{ corrupt: true }, { compatible: false }, { unrelated: true }])('preserves existing binaries on failure: %j', (failure) => {
    const { result, binary } = runInstall({ existing: true, ...failure });
    expect(result.status).not.toBe(0); expect(binary).toBe('old-binary');
  });
});
