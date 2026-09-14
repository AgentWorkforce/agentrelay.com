import type { ReactNode } from 'react';

import ClaudeCode from '@lobehub/icons/es/ClaudeCode';
import Codex from '@lobehub/icons/es/Codex';
import Cursor from '@lobehub/icons/es/Cursor';
import Github from '@lobehub/icons/es/Github';
import Grok from '@lobehub/icons/es/Grok';
import HermesAgent from '@lobehub/icons/es/HermesAgent';
import OpenClaw from '@lobehub/icons/es/OpenClaw';
import OpenCode from '@lobehub/icons/es/OpenCode';

import { FadeIn } from '../FadeIn';
import s from '../../app/landing.module.css';
import { PythonLogo, TypeScriptLogo } from './icons';

const ICON_SIZE = 24;

interface LogoItem {
  key: string;
  label: string;
  node: ReactNode;
}

/** CLI coding agents that Relay drives over a PTY. */
const CLI_LOGOS: readonly LogoItem[] = [
  { key: 'claude-code', label: 'Claude Code', node: <ClaudeCode.Color size={ICON_SIZE} /> },
  // Mono, not .Color: the coloured Codex mark is near-black and disappears
  // against the chip on this dark band.
  { key: 'codex', label: 'Codex', node: <Codex size={ICON_SIZE} /> },
  { key: 'opencode', label: 'OpenCode', node: <OpenCode size={ICON_SIZE} /> },
  { key: 'cursor', label: 'Cursor', node: <Cursor size={ICON_SIZE} /> },
  { key: 'grok', label: 'Grok', node: <Grok size={ICON_SIZE} /> },
];

/** Custom agents you build against the SDK and language bindings. */
const CUSTOM_LOGOS: readonly LogoItem[] = [
  { key: 'hermes', label: 'Hermes', node: <HermesAgent size={ICON_SIZE} /> },
  { key: 'openclaw', label: 'OpenClaw', node: <OpenClaw.Color size={ICON_SIZE} /> },
  { key: 'typescript', label: 'TypeScript', node: <TypeScriptLogo className={s.howChipSvg} /> },
  { key: 'python', label: 'Python', node: <PythonLogo className={s.howChipSvg} /> },
  { key: 'github', label: 'GitHub', node: <Github size={ICON_SIZE} /> },
];

export function HowItWorks() {
  return (
    <section className={s.howItWorks} aria-labelledby="how-it-works-title">
      <FadeIn direction="up" className={s.howHeader}>
        <h2 id="how-it-works-title" className={s.howTitle}>
          All agents work on the relay
        </h2>
        <p className={s.howSubtitle}>
          It's not a harness, and it's not a framework. Our PTY based driver can power any CLI agent or you
          can drop in our SDK for your custom orchestrator.
        </p>
      </FadeIn>
      <ul className={s.howIconList} aria-label="CLI agents and custom agents">
        {[...CLI_LOGOS, ...CUSTOM_LOGOS].map((logo) => (
          <li key={logo.key} className={s.howIcon} title={logo.label}>
            <span role="img" aria-label={logo.label}>{logo.node}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
