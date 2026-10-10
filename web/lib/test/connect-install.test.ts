import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync, rmSync, existsSync, symlinkSync, readlinkSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
const installer = fileURLToPath(new URL('../../public/connect/install.sh', import.meta.url));
const commands = ['create', 'join', 'send', 'status', 'leave', 'end'];
const requirement = '-R=anchor apple generic and certificate 1[field.1.2.840.113635.100.6.2.6] exists and certificate leaf[field.1.2.840.113635.100.6.1.13] exists and certificate leaf[subject.OU] = "QUJ7SA6X8X"';
function runInstall({ corrupt = false, compatible = true, existing = false, installedClis = false, platform = 'Linux', missingCommand = '', signatureValid = true, executable = true, targetDirectory = false, signal = '', moveFails = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'connect-installer-test-'));
  const home = join(dir, 'home'); const mocks = join(dir, 'bin');
  mkdirSync(home); mkdirSync(mocks);
  const artifact = join(dir, 'archive.tar.gz'); const tree = join(dir, 'tree');
  mkdirSync(join(tree, 'agent_relay/helpers'), { recursive: true });
  const supported = compatible ? commands.filter(command => command !== missingCommand) : [];
  const helper = '#!/bin/sh\n' + (!executable ? 'exit 126\n' : `
if [ "$1" = --version ]; then echo 'agent-relay-probe 2099.1.1'; exit 0; fi
[ "$1" = connect ] && [ "$3" = --help ] || exit 2
case "$2" in ${supported.length ? supported.join('|') : 'none'}) exit 0;; *) exit 2;; esac
`);
  writeFileSync(join(tree, 'agent_relay/helpers/agent-relay-probe'), helper);
  expect(spawnSync('tar', ['-czf', artifact, '-C', tree, 'agent_relay']).status).toBe(0);
  const digest = corrupt ? '0'.repeat(64) : createHash('sha256').update(readFileSync(artifact)).digest('hex');
  writeFileSync(join(dir, 'checksum'), `${digest}  probe.tar.gz\n`);
  const script = (name: string, content: string) => { writeFileSync(join(mocks, name), `#!/bin/sh\n${content}`); chmodSync(join(mocks, name), 0o755); };
  script('uname', `if [ "$1" = -s ]; then echo ${platform}; else echo arm64; fi\n`);
  script('codesign', `
printf '%s\\n' "$*" >> "$FIXTURE/signature-check"
[ "$#" = 4 ] && [ "$1" = --verify ] && [ "$2" = --strict ] && [ "$3" = "$EXPECTED_REQUIREMENT" ] && [ -f "$4" ] || exit 1
exit ${signatureValid ? 0 : 1}
`);
  if (signal) script('mv', `kill -${signal} "$PPID"\nexit 0\n`);
  else if (moveFails) script('mv', 'exit 1\n');
  script('curl', `out=\nurl=\nwhile [ "$#" -gt 0 ]; do\n case "$1" in -o) out=$2; shift 2;; https://*) url=$1; shift;; *) shift;; esac\ndone\nprintf '%s\\n' "$url" >> "$FIXTURE/downloads"\ncase "$url" in\n */latest) printf '%s' 'https://github.com/AgentWorkforce/relay-desktop-releases/releases/tag/v2099.1.1';;\n *.sha256) cp "$FIXTURE/checksum" "$out";;\n *.tar.gz) cp "$FIXTURE/archive.tar.gz" "$out";;\n *) exit 5;;\nesac\n`);
  const target = join(home, '.local/lib/agent-relay/connect/agent-relay-probe');
  const publicBin = join(home, '.local/bin');
  if (existing || targetDirectory) {
    mkdirSync(join(home, '.local/lib/agent-relay/connect'), { recursive: true });
    if (targetDirectory) mkdirSync(target);
    else writeFileSync(target, 'old-binary');
  }
  if (installedClis) {
    mkdirSync(publicBin, { recursive: true });
    writeFileSync(join(dir, 'orchestration-cli'), 'existing-relay-cli');
    symlinkSync(join(dir, 'orchestration-cli'), join(publicBin, 'relay'));
    symlinkSync(join(dir, 'orchestration-cli'), join(publicBin, 'agent-relay'));
    writeFileSync(join(publicBin, 'agent-relay-probe'), 'desktop-managed-probe');
  }
  const temporary = join(dir, 'temporary');
  mkdirSync(temporary);
  const result = spawnSync('/bin/sh', [installer], { encoding: 'utf8', env: { ...process.env, HOME: home, FIXTURE: dir, TMPDIR: temporary, EXPECTED_REQUIREMENT: requirement, PATH: `${mocks}:${process.env.PATH}` } });
  const output = { result, binary: existsSync(target) && statSync(target).isFile() ? readFileSync(target, 'utf8') : undefined, targetIsDirectory: existsSync(target) && statSync(target).isDirectory(), temporaryEntries: readdirSync(temporary), stagedEntries: existsSync(join(home, '.local/lib/agent-relay/connect')) ? readdirSync(join(home, '.local/lib/agent-relay/connect')).filter(name => name.startsWith('.agent-relay-probe.')) : [], downloads: readFileSync(join(dir, 'downloads'), 'utf8'), signature: existsSync(join(dir, 'signature-check')), publicBinExists: existsSync(publicBin), existingCommands: installedClis ? {
    relay: readFileSync(join(publicBin, 'relay'), 'utf8'),
    agentRelay: readFileSync(join(publicBin, 'agent-relay'), 'utf8'),
    probe: readFileSync(join(publicBin, 'agent-relay-probe'), 'utf8'),
    linksIntact: ['relay', 'agent-relay'].every(name => readlinkSync(join(publicBin, name)) === join(dir, 'orchestration-cli')),
  } : undefined };
  rmSync(dir, { recursive: true, force: true }); return output;
}
describe('native Connect installer', () => {
  it('parses as POSIX sh', () => expect(spawnSync('/bin/sh', ['-n', installer]).status).toBe(0));
  it('installs only the verified helper from one immutable release without starting it', () => {
    const { result, binary, downloads, publicBinExists } = runInstall();
    expect(result.status, result.stderr).toBe(0); expect(binary).toContain('#!/bin/sh');
    expect(result.stdout).toContain('No relay process has been started');
    expect(downloads).toContain('/download/v2099.1.1/AgentRelay-Linux-arm64-probe.tar.gz');
    expect(downloads).not.toContain('/latest/download');
    expect(publicBinExists).toBe(false);
    expect(result.stdout).toContain('~/.local/lib/agent-relay/connect/agent-relay-probe connect create');
  });
  it('checks the macOS publisher signature', () => {
    const { result, signature } = runInstall({ platform: 'Darwin' });
    expect(result.status, result.stderr).toBe(0); expect(signature).toBe(true);
  });
  it('coexists with the orchestration CLI and desktop-managed probe', () => {
    const { result, binary, existingCommands } = runInstall({ installedClis: true, existing: true });
    expect(result.status, result.stderr).toBe(0);
    expect(binary).toContain('#!/bin/sh');
    expect(existingCommands).toEqual({ relay: 'existing-relay-cli', agentRelay: 'existing-relay-cli', probe: 'desktop-managed-probe', linksIntact: true });
  });
  it.each(commands)('rejects a release missing %s without replacing the existing binary', (missingCommand) => {
    const { result, binary } = runInstall({ existing: true, missingCommand });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`command: ${missingCommand}`);
    expect(binary).toBe('old-binary');
  });
  it('rejects an invalid macOS signature without replacing the existing binary', () => {
    const { result, binary } = runInstall({ existing: true, platform: 'Darwin', signatureValid: false });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('signature verification failed');
    expect(binary).toBe('old-binary');
  });
  it('distinguishes an incompatible executable from missing commands', () => {
    const { result, binary } = runInstall({ existing: true, executable: false });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Could not execute the probe');
    expect(result.stderr).not.toContain('Retry after');
    expect(binary).toBe('old-binary');
  });
  it('rejects a directory at the executable path', () => {
    const { result, targetIsDirectory, stagedEntries } = runInstall({ targetDirectory: true });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('target is a directory');
    expect(targetIsDirectory).toBe(true);
    expect(stagedEntries).toEqual([]);
  });
  it.each([['HUP', 129], ['INT', 130], ['TERM', 143]] as const)('exits and removes staging files after %s', (signal, status) => {
    const { result, binary, temporaryEntries, stagedEntries } = runInstall({ existing: true, signal });
    expect(result.status, result.stderr).toBe(status);
    expect(result.stdout).not.toContain('Relay Connect installed');
    expect(binary).toBe('old-binary');
    expect(temporaryEntries).toEqual([]);
    expect(stagedEntries).toEqual([]);
  });
  it.each([{ corrupt: true }, { compatible: false }, { moveFails: true }])('preserves existing binaries and cleans up on failure: %j', (failure) => {
    const { result, binary, temporaryEntries, stagedEntries } = runInstall({ existing: true, ...failure });
    expect(result.status).not.toBe(0); expect(binary).toBe('old-binary');
    expect(temporaryEntries).toEqual([]);
    expect(stagedEntries).toEqual([]);
  });
});
