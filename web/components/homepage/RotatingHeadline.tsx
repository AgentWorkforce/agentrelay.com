'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { AGENT_TOOLS, type AgentTool } from '../home/AgentMarks';
import { TypeScriptLogo } from '../home/icons';
import s from './rotating-headline.module.css';

export type Tool = AgentTool | 'custom' | 'dots' | 'pi';

/** The agents we work with, plus one built on our SDK. */
export const TOOLS: Record<Tool, { name: string; logo: ReactNode }> = {
  ...AGENT_TOOLS,
  muse: { name: 'Muse', logo: <img src="/logos/muse-transparent.png" alt="" /> },
  dots: { name: 'Dots', logo: <img src="/logos/dot.webp" alt="" /> },
  pi: { name: 'Pi', logo: <img className={s.monoLogo} src="/logos/pi.svg" alt="" /> },
  custom: { name: 'your custom agent', logo: <TypeScriptLogo className={s.fill} /> },
};

/**
 * Start with familiar coding agents, then mix in hosted assistants and
 * cross-provider conversations as the rotation progresses.
 */
const PAIRS: [Tool, Tool][] = [
  ['claude', 'codex'],
  ['conductor', 'codex'],
  ['conductor', 'claude'],
  ['capy', 'claude'],
  ['capy', 'codex'],
  ['devin', 'codex'],
  ['devin', 'claude'],
  ['paseo', 'claude'],
  ['paseo', 'codex'],
  ['opencode', 'codex'],
  ['opencode', 'claude'],
  ['grok', 'claude'],
  ['dots', 'claude'],
  ['dots', 'muse'],
  ['muse', 'grokbot'],
  ['muse', 'claude'],
  ['grok', 'codex'],
  ['custom', 'codex'],
  ['claude', 'codex'],
  ['claude', 'antigravity'],
  ['codex', 'antigravity'],
  ['codex', 'grokbot'],
  ['claude', 'dots'],
  ['claude', 'grokbot'],
  ['claude', 'muse'],
  ['codex', 'muse'],
  ['codex', 'openclaw'],
  ['claude', 'openclaw'],
  ['claude', 'custom'],
  ['claude', 'hermes'],
  ['codex', 'hermes'],
  ['codex', 'cursor'],
  ['claude', 'cursor'],
];

const STEP_MS = 2400;

/** The logo, then the name letter by letter, so each letter can flicker on its own beat. */
function Label({ tool }: { tool: Tool }) {
  return (
    <>
      <span className={s.logo} style={{ '--i': 0 } as CSSProperties}>
        {TOOLS[tool].logo}
      </span>
      {[...TOOLS[tool].name].map((char, index) => (
        <span className={s.char} key={index} style={{ '--i': index + 1 } as CSSProperties}>
          {char === ' ' ? '\u00a0' : char}
        </span>
      ))}
    </>
  );
}

/** A tool name. On change the old name blinks out letter by letter, the new one blinks in, and the space eases to fit. */
function Slot({ tool }: { tool: Tool }) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const last = useRef(tool);
  const [width, setWidth] = useState<number>();
  const [leaving, setLeaving] = useState<Tool | null>(null);

  useLayoutEffect(() => {
    if (labelRef.current) setWidth(labelRef.current.offsetWidth);
    if (last.current === tool) return;
    setLeaving(last.current);
    last.current = tool;
    const timer = window.setTimeout(() => setLeaving(null), 900);
    return () => window.clearTimeout(timer);
  }, [tool]);

  return (
    <span className={s.slot}>
      <span className={s.track} style={width ? { width } : undefined}>
        <span className={s.label} data-entering={leaving ? '' : undefined} key={tool} ref={labelRef}>
          <Label tool={tool} />
        </span>
        {leaving && (
          <span className={`${s.label} ${s.leaving}`} key={`leaving-${leaving}`}>
            <Label tool={leaving} />
          </span>
        )}
      </span>
    </span>
  );
}

export function RotatingHeadline() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setStep((n) => (n + 1) % PAIRS.length), STEP_MS);
    return () => window.clearInterval(timer);
  }, []);

  const [from, to] = PAIRS[step];

  return (
    <h2 className={s.headline} aria-label="Let your coding agents talk to each other">
      <span aria-hidden="true" className={s.row}>
        Let <Slot tool={from} />
      </span>
      <span aria-hidden="true" className={s.row}>
        talk to <Slot tool={to} />
      </span>
    </h2>
  );
}
