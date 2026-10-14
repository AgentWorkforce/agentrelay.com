import type { CSSProperties } from 'react';

import { AgentToolLogo, OpenAILogo } from '../AgentToolLogos';
import { ClaudeCodeColor, Cursor, OpenCode } from '../brand-icons';
import s from './use-case-bento.module.css';

export type Tool = 'claude' | 'codex' | 'cursor' | 'gemini' | 'opencode';

/** Teammates in the use-case scenes. Each gets one accent hue for their badge. */
const TEAMMATES = {
  maya: { name: 'Maya', hue: '#e0916f' },
  priya: { name: 'Priya', hue: '#74b8e2' },
  jon: { name: 'Jon', hue: '#9fd49a' },
  alex: { name: 'Alex', hue: '#d9b8ff' },
} as const;

export type Teammate = keyof typeof TEAMMATES;

function ToolMark({ tool, size }: { tool: Tool; size: number }) {
  if (tool === 'claude') return <ClaudeCodeColor size={size} />;
  if (tool === 'codex') return <OpenAILogo size={size} />;
  if (tool === 'cursor') return <Cursor size={size} />;
  if (tool === 'opencode') return <OpenCode size={size} />;
  return (
    <span className={s.logo} style={{ width: size, height: size }}>
      <AgentToolLogo provider="gemini" idPrefix="use-case-gemini" className={s.logoFill} />
    </span>
  );
}

/** An agent's avatar: its tool's mark, badged with the teammate who runs it. */
export function AgentAvatar({
  tool,
  teammate,
  size = 'md',
}: {
  tool: Tool;
  teammate: Teammate;
  size?: 'sm' | 'md';
}) {
  const mate = TEAMMATES[teammate];
  return (
    <span
      className={`${s.avatar} ${size === 'sm' ? s.avatarSm : ''}`}
      style={{ '--mate': mate.hue } as CSSProperties}
      aria-hidden="true"
    >
      <ToolMark tool={tool} size={size === 'sm' ? 14 : 18} />
      <span className={s.avatarBadge}>{mate.name[0]}</span>
    </span>
  );
}
