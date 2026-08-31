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
  // Mono, not .Color: the coloured Codex mark is near-black and disappeared
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

/**
 * Pyramid layout: the Agent Relay hub sits at the top; the two agent groups
 * sit below it. A fixed-height connector zone between them carries the
 * orthogonal pipes (relay → bus → each group) and the animated messages.
 * Coordinates are percentages of that connector zone, so the pipes and dots
 * line up at every width. Three message dots ({@link MESSAGE_CLASSES}) travel
 * the pipes up to the relay and back down to another agent (CLI → custom,
 * custom → CLI, CLI → CLI).
 */
// Apex coords (% of the relay+connector zone): relay bottom 50%, bus 75%,
// card tops 100%. The pipes connect the relay box down to each agent group.
// The drops sit at 24/76, not 25/75: with the row's gap taken out of the
// stage, a card's centre lands at (100 - gap%) / 4, which is a shade inside
// the quarter marks. The message-dot keyframes use the same lanes.
const WIRES: readonly string[] = [
  '50,50 50,75', // relay down to the bus
  '24,75 76,75', // bus across
  '24,75 24,100', // bus down to CLI agents
  '76,75 76,100', // bus down to custom agents
];

const MESSAGE_CLASSES = [s.howMsg1, s.howMsg2, s.howMsg3] as const;

function AgentGroup({
  label,
  logos,
  caption,
}: {
  label: string;
  logos: readonly LogoItem[];
  caption: string;
}) {
  return (
    <div className={s.howGroup}>
      <span className={s.howGroupLabel}>{label}</span>
      {/* Each mark carries its name in the open. The marks alone were a row of
          anonymous glyphs — a couple of them (Codex, OpenCode, Cursor) are
          plain enough that nobody could tell which runtime they were looking
          at, and the names were hidden in a `title` no touch device shows. */}
      <ul className={s.howGroupLogos}>
        {logos.map((logo) => (
          <li key={logo.key} className={s.howChip}>
            <span className={s.howChipMark} aria-hidden="true">
              {logo.node}
            </span>
            <span className={s.howChipLabel}>{logo.label}</span>
          </li>
        ))}
      </ul>
      <p className={s.howGroupCaption}>{caption}</p>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section className={s.howItWorks} aria-labelledby="how-it-works-title">
      <FadeIn direction="up" className={s.howHeader}>
        <h2 id="how-it-works-title" className={s.howTitle}>
          Works with all of them
        </h2>
        <p className={s.howSubtitle}>
          It's not a harness, and it's not a framework. Our PTY based driver can power any CLI agent or you
          can drop in our SDK for your custom orchestrator.
        </p>
      </FadeIn>

      <div className={s.howStage}>
        {/* Apex zone = relay box (top) + connector (below). Wires and message
            dots span the whole zone so a dot can travel up behind the relay
            box and pop back out. */}
        <div className={s.howApex}>
          <svg className={s.howWires} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {WIRES.map((points, i) => (
              <polyline key={i} points={points} className={s.howWire} />
            ))}
          </svg>
          <div className={s.howMsgs} aria-hidden="true">
            {MESSAGE_CLASSES.map((cls, i) => (
              <span key={i} className={`${s.howMsg} ${cls}`} />
            ))}
          </div>

          <div className={s.howCore}>
            <div className={s.howCoreNode}>
              <img
                src="/brand-kit/agent-relay-mark.svg"
                alt=""
                width={46}
                height={38}
                className={s.howCoreMark}
              />
              <img
                src="/brand-kit/agent-relay-wordmark.svg"
                alt="Agent Relay"
                width={150}
                height={30}
                className={s.howCoreWordmark}
              />
            </div>
          </div>

          <div className={s.howLink} aria-hidden="true" />
        </div>

        {/* A rise, not a converge. The pair used to slide in from opposite
            sides; now that the cards stack full-width on phones, the inbound
            translateX(40px) on the right-hand card pushed 40px of scrollable
            overflow past the gutter. translateY has no such edge. */}
        <div className={s.howRow}>
          <FadeIn direction="up" className={s.howCol}>
            <AgentGroup label="CLI agents" logos={CLI_LOGOS} caption="PTY driven, real-time injection" />
          </FadeIn>
          <FadeIn direction="up" delay={80} className={s.howCol}>
            <AgentGroup label="Your custom agents" logos={CUSTOM_LOGOS} caption="Drop-in SDK + bindings" />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
