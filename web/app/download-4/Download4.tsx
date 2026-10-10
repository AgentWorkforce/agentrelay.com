'use client';

import { useState } from 'react';
import { ArrowDownToLine, Check, Copy } from 'lucide-react';
import { useCopy, useDownloadChoice, useLatestRelease } from '../../components/download/hooks';
import {
  DESKTOP_AGENT_SETUP_URL,
  DESKTOP_RELEASES_URL,
  MAC_REQUIREMENT,
  desktopBuilds,
  formatReleaseDate,
  formatSize,
  type DesktopBuild,
  type DetectedPlatform,
} from '../../lib/desktop-downloads';
import s from './download-4.module.css';

const RELEASE_BASE = `${DESKTOP_RELEASES_URL}/latest/download`;

function macScript(): string {
  return [
    'set -euo pipefail',
    'case "$(uname -m)" in arm64) arch=arm64 ;; x86_64) arch=x64 ;; esac',
    `curl -fLO "${RELEASE_BASE}/AgentRelay-macOS-$arch.dmg"`,
    `curl -fLO "${RELEASE_BASE}/AgentRelay-macOS-$arch.dmg.sha256"`,
    'shasum -a 256 -c "AgentRelay-macOS-$arch.dmg.sha256"',
    'vol=$(hdiutil attach -nobrowse -readonly "AgentRelay-macOS-$arch.dmg" | awk \'/\\/Volumes\\// {sub(/^.*\\/Volumes\\//,"/Volumes/"); print; exit}\')',
    'ditto "$vol/Agent Relay.app" "/Applications/Agent Relay.app" && hdiutil detach "$vol"',
    'open -a "Agent Relay"',
  ].join('\n');
}

function linuxScript(build: DesktopBuild): string {
  const deb = build.arch === 'arm64' ? 'AgentRelay-Linux-arm64.deb' : 'AgentRelay-Linux-x64.deb';
  return [
    'set -euo pipefail',
    `curl -fLO "${RELEASE_BASE}/${deb}"`,
    `curl -fLO "${RELEASE_BASE}/${deb}.sha256"`,
    `sha256sum -c ${deb}.sha256`,
    `sudo apt install ./${deb}`,
  ].join('\n');
}

const AGENT_PROMPT = `Install the Agent Relay desktop app on this machine. Follow ${DESKTOP_AGENT_SETUP_URL} — verify the .sha256 before installing, and stop if it fails.`;

function describe(detected: DetectedPlatform | null): { os: string; arch: string; note: string } {
  if (!detected) return { os: '…', arch: '…', note: 'detecting' };
  if (detected.os === 'mac') {
    return {
      os: 'macOS',
      arch: detected.arch === 'arm64' ? 'arm64 · Apple silicon' : 'x86_64 · Intel',
      note: detected.confident ? 'detected' : 'assumed — browser hid the CPU',
    };
  }
  if (detected.os === 'linux') return { os: 'Linux', arch: detected.arch === 'arm64' ? 'aarch64' : 'x86_64', note: detected.confident ? 'detected' : 'assumed' };
  if (detected.os === 'windows') return { os: 'Windows', arch: '—', note: 'not supported yet' };
  if (detected.os === 'mobile') return { os: 'mobile', arch: '—', note: 'open this page on your computer' };
  return { os: 'unknown', arch: '—', note: 'pick a build below' };
}

function CopyButton({ id, text, copied, copy, label = 'Copy' }: { id: string; text: string; copied: string | null; copy: (k: string, t: string) => void; label?: string }) {
  return (
    <button type="button" className={s.copy} onClick={() => copy(id, text)}>
      {copied === id ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
      {copied === id ? 'Copied' : label}
    </button>
  );
}

export function Download4() {
  const { detected, build, choose } = useDownloadChoice();
  const release = useLatestRelease();
  const [copied, copy] = useCopy();
  const [tab, setTab] = useState<'script' | 'agent'>('script');
  const info = describe(detected);
  const script = build ? (build.os === 'mac' ? macScript() : linuxScript(build)) : null;

  return (
    <div className={s.wrap}>
      <header className={s.head}>
        <h1 className={s.title}>
          Agent Relay <span>desktop</span>
        </h1>
        <p className={s.lede}>
          The menu-bar app that puts the coding sessions you choose on your team’s relay. {MAC_REQUIREMENT}, or Debian/Ubuntu.
        </p>
      </header>

      <section className={s.terminal} aria-label="Your download">
        <div className={s.bar}>
          <i /><i /><i />
          <span>~ agent-relay</span>
        </div>
        <div className={s.body}>
          <p className={s.cmd}><span className={s.ps}>$</span> uname -sm <span className={s.comment}># from your browser</span></p>
          <dl className={s.kv}>
            <dt>os</dt><dd>{info.os}</dd>
            <dt>arch</dt><dd>{info.arch} <span className={s.comment}>{info.note}</span></dd>
            <dt>build</dt><dd className={s.str}>{build ? build.asset : '—'} <span className={s.comment}>{build ? (formatSize(release?.sizes[build.id]) ?? '') : 'pick one below'}</span></dd>
            <dt>release</dt><dd>{release ? `v${release.version} · ${formatReleaseDate(release.publishedAt)}` : 'latest'}</dd>
          </dl>
          <div className={s.actions}>
            {build ? (
              <a href={build.href} className={s.download}>
                <ArrowDownToLine size={17} aria-hidden="true" />
                Download {build.os === 'mac' ? `for ${build.label}` : `.${build.format}`}
              </a>
            ) : (
              <span className={s.download} aria-disabled="true">Choose a build</span>
            )}
            <div className={s.switcher} role="group" aria-label="Other builds">
              {desktopBuilds.filter((b) => b.format !== 'tar.gz').map((b) => (
                <button key={b.id} type="button" aria-pressed={b.id === build?.id} onClick={() => choose(b.id)}>
                  {b.os === 'mac' ? `mac-${b.arch}` : `linux-${b.arch}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.tabs} role="tablist" aria-label="Install from the command line">
          <button type="button" role="tab" aria-selected={tab === 'script'} onClick={() => setTab('script')}>Install from a shell</button>
          <button type="button" role="tab" aria-selected={tab === 'agent'} onClick={() => setTab('agent')}>Ask your agent</button>
        </div>
        {tab === 'script' ? (
          script ? (
            <div className={s.code} role="tabpanel">
              <div className={s.codeHead}>
                <span>{build?.os === 'mac' ? 'zsh · verifies the checksum, then installs to /Applications' : 'bash · verifies the checksum, then installs with apt'}</span>
                <CopyButton id="script" text={script} copied={copied} copy={copy} />
              </div>
              <pre>{script}</pre>
            </div>
          ) : (
            <div className={s.code} role="tabpanel">
              <pre>Choose a build above to see its install script.</pre>
            </div>
          )
        ) : (
          <div className={s.code} role="tabpanel">
            <div className={s.codeHead}>
              <span>Paste into Claude Code, Codex or OpenCode</span>
              <CopyButton id="prompt" text={AGENT_PROMPT} copied={copied} copy={copy} />
            </div>
            <pre className={s.prompt}>{AGENT_PROMPT}</pre>
          </div>
        )}
      </section>

      <section className={s.section} aria-labelledby="artifacts">
        <div className={s.sectionHead}>
          <h2 id="artifacts">Artifacts</h2>
          <a href={release?.url ?? DESKTOP_RELEASES_URL}>{release ? `v${release.version}` : 'releases'} on GitHub ↗</a>
        </div>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr><th>File</th><th>For</th><th className={s.num}>Size</th><th>Checksum</th></tr>
            </thead>
            <tbody>
              {desktopBuilds.map((b) => (
                <tr key={b.id} className={b.id === build?.id ? s.rowCurrent : undefined}>
                  <td><a href={b.href}>{b.asset}</a></td>
                  <td>{b.os === 'mac' ? `Mac · ${b.label}` : `${b.label} · ${b.detail}`}</td>
                  <td className={s.num}>{formatSize(release?.sizes[b.id]) ?? '—'}</td>
                  <td><a href={b.checksumHref}>.sha256</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={s.foot}>
          Stable names always point at the newest release; each release also carries version-pinned copies. Release builds are
          signed with a Developer ID and notarized by Apple.
        </p>
      </section>
    </div>
  );
}
