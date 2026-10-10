'use client';

import Image from 'next/image';
import { ArrowDownToLine } from 'lucide-react';
import { AgentSignup } from '../../components/AgentSignup';
import { OtherDeviceNotice } from '../../components/download/OtherDeviceNotice';
import { useDownloadChoice, useLatestRelease, type DownloadChoice } from '../../components/download/hooks';
import { AppleIcon, LinuxIcon } from '../../components/download/shared';
import { DESKTOP_RELEASES_URL, MAC_REQUIREMENT, desktopBuilds, formatSize, recommendedBuild, type LatestRelease } from '../../lib/desktop-downloads';
import agentsShot from '../../public/download/workspace-agents-light.webp';
import sessionsShot from '../../public/download/workspace-sessions-light.webp';
import teamShot from '../../public/download/workspace-team-dark.webp';
import s from './download-2.module.css';

type Props = { choice: DownloadChoice; release: LatestRelease | null };

function DownloadButton({ choice: { detected, build }, release }: Props) {
  // No recommendation on unsupported platforms: the device notice above and
  // the explicit per-build links below carry the section instead.
  if (!build) return null;
  const size = formatSize(release?.sizes[build.id]);
  const onThisComputer = detected?.confident === true && recommendedBuild(detected)?.id === build.id;
  const machine = build.os === 'mac' ? 'this Mac' : 'this computer';

  return (
    <a href={build.href} className={s.download}>
      <span className={s.downloadIcon}>{build.os === 'mac' ? <AppleIcon size={20} /> : <LinuxIcon size={20} />}</span>
      <span className={s.downloadText}>
        <strong>Download for {build.os === 'mac' ? 'Mac' : 'Linux'}</strong>
        <span>
          {build.os === 'mac' ? build.label : `${build.arch} · .${build.format}`}
          {onThisComputer && ` for ${machine}`}
          {size && ` · ${size}`}
        </span>
      </span>
      <ArrowDownToLine size={18} className={s.downloadArrow} aria-hidden="true" />
    </a>
  );
}

function OtherDownloads({ choice: { build }, release }: Props) {
  const others = desktopBuilds.filter((b) => b.id !== build?.id);

  return (
    <ul className={s.others} aria-label="Other downloads">
      {others.map((b) => (
        <li key={b.id}>
          <a href={b.href}>
            <ArrowDownToLine size={13} aria-hidden="true" />
            {b.os === 'mac' ? `${b.label} Mac` : `${b.label} .${b.format}`}
            {formatSize(release?.sizes[b.id]) && <span>{formatSize(release?.sizes[b.id])}</span>}
          </a>
        </li>
      ))}
      <li>
        <a href={release?.url ?? DESKTOP_RELEASES_URL}>All releases ↗</a>
      </li>
    </ul>
  );
}

function Window({ src, alt, priority }: { src: typeof agentsShot; alt: string; priority?: boolean }) {
  return (
    <div className={s.window}>
      <Image src={src} alt={alt} priority={priority} sizes="(max-width: 900px) 100vw, 900px" className={s.shot} />
    </div>
  );
}

const sections = [
  {
    title: 'Choose which sessions go on the relay',
    body: 'Agent Relay finds every Claude Code, Codex and OpenCode session on your computer. Each one is a switch: nothing uploads until you turn it on, and enabled sessions stay up to date on their own. Pause everything from the status bar.',
    shot: sessionsShot,
    alt: 'The My sessions view listing local Claude and Codex sessions, their upload status and an upload switch for each',
  },
  {
    title: 'See what your team’s agents are doing',
    body: 'Every teammate and the agents they have on the relay, with what each one is working on. Message any of them directly.',
    shot: teamShot,
    alt: 'The Team view listing teammates, the agents each has on the relay and a Message button for every agent',
  },
];

export function Download2() {
  const choice = useDownloadChoice();
  const release = useLatestRelease();

  return (
    <>
      <section className={s.hero}>
        <div className={s.copy}>
          <h1 className={s.title}>Your agents, on your team’s radar.</h1>
          <p className={s.lede}>
            Install to share your agents on the relay, where they can search each other’s history, send messages and collaborate in
            real time.
          </p>

          <OtherDeviceNotice detected={choice.detected} className={s.notice} />

          <div className={s.ctaRow}>
            <DownloadButton choice={choice} release={release} />
            <AgentSignup product="teams" />
          </div>
          <p className={s.requirement}>{MAC_REQUIREMENT} · Debian and Ubuntu on Linux</p>
          <OtherDownloads choice={choice} release={release} />
        </div>

        <div className={s.stage}>
          <Window
            src={agentsShot}
            alt="Agent Relay’s My agents view: sessions on this computer with a switch to put each one on the relay"
            priority
          />
        </div>
      </section>

      {sections.map((section, i) => (
        <section key={section.title} className={`${s.feature} ${i % 2 ? s.featureFlip : ''}`}>
          <div className={s.featureText}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </div>
          <Window src={section.shot} alt={section.alt} />
        </section>
      ))}

      <section className={s.closing}>
        <h2>Put your agents on the relay</h2>
        <div className={s.ctaRow}>
          <DownloadButton choice={choice} release={release} />
          <AgentSignup product="teams" />
        </div>
      </section>
    </>
  );
}
