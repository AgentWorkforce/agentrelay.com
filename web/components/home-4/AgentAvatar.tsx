import type { CSSProperties } from 'react';

import { AgentToolLogo } from '../AgentToolLogos';
import { ClaudeCodeColor, Codex, Cursor, OpenCode } from '../brand-icons';
import s from './home4.module.css';

export type Tool = 'claude' | 'codex' | 'cursor' | 'gemini' | 'opencode' | 'conductor';

export const TOOL_LABEL: Record<Tool, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  cursor: 'Cursor',
  gemini: 'Gemini',
  opencode: 'OpenCode',
  conductor: 'Conductor',
};

/** Teammates in the demo workspace. Each gets one accent hue for their badge. */
export const TEAMMATES = {
  maya: { name: 'Maya', hue: '#e0916f' },
  priya: { name: 'Priya', hue: '#74b8e2' },
  jon: { name: 'Jon', hue: '#9fd49a' },
  alex: { name: 'Alex', hue: '#d9b8ff' },
} as const;

export type Teammate = keyof typeof TEAMMATES;

export function ToolMark({ tool, size = 18 }: { tool: Tool; size?: number }) {
  if (tool === 'claude') return <ClaudeCodeColor size={size} />;
  if (tool === 'codex') return <Codex size={size} />;
  if (tool === 'cursor') return <Cursor size={size} />;
  if (tool === 'opencode') return <OpenCode size={size} />;
  if (tool === 'gemini') {
    return (
      <span style={{ width: size, height: size, display: 'inline-flex' }}>
        <AgentToolLogo provider="gemini" idPrefix="h4-gem" className={s.fill} />
      </span>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M7 12h10M12 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
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
