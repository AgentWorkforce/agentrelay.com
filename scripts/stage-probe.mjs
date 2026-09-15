#!/usr/bin/env node
import { copyFile, mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
const { values } = parseArgs({ options: { binary: { type: 'string' }, platform: { type: 'string' } } });
if (!values.binary || !isAbsolute(values.binary) || !/^(darwin|linux)-(arm64|x64)$/.test(values.platform ?? '')) {
  throw new Error('Use --binary /absolute/native-binary --platform darwin-arm64 (or supported linux/macOS variant).');
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = resolve(root, 'web/public/downloads/agent-relay-probe', values.platform);
const bytes = await readFile(values.binary);
await mkdir(destination, { recursive: true });
await copyFile(values.binary, resolve(destination, 'agent-relay-probe'));
await chmod(resolve(destination, 'agent-relay-probe'), 0o755);
await writeFile(resolve(destination, 'agent-relay-probe.sha256'), createHash('sha256').update(bytes).digest('hex') + '  agent-relay-probe\n');
console.log('Staged native probe and SHA-256 for local website testing.');
