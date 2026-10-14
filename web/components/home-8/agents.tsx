import { AgentToolLogo } from '../AgentToolLogos';
import { ClaudeCodeColor, Codex, Cursor, OpenCode } from '../brand-icons';
import s from './home-8.module.css';

export type AgentId =
  | 'claude-code'
  | 'codex'
  | 'gemini'
  | 'opencode'
  | 'cursor'
  | 'conductor'
  | 'claude-desktop'
  | 'codex-app'
  | 'phone';

export const AGENT_NAMES: Record<AgentId, string> = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
  gemini: 'Gemini CLI',
  opencode: 'OpenCode',
  cursor: 'Cursor',
  conductor: 'Conductor',
  'claude-desktop': 'Claude desktop',
  'codex-app': 'Codex app',
  phone: 'Phone agents',
};

/** The agent's own mark at `size` px. Tools without a published mark get their initial. */
export function AgentMark({ id, size = 18, className }: { id: AgentId; size?: number; className?: string }) {
  const style = { width: size, height: size };
  switch (id) {
    case 'claude-code':
      return <ClaudeCodeColor size={size} className={className} aria-hidden="true" />;
    case 'codex':
    case 'codex-app':
      return <Codex size={size} className={className} aria-hidden="true" />;
    case 'opencode':
      return <OpenCode size={size} className={className} aria-hidden="true" />;
    case 'cursor':
      return <Cursor size={size} className={className} aria-hidden="true" />;
    case 'gemini':
      return (
        <span style={{ display: 'inline-flex', ...style }} className={className}>
          <AgentToolLogo provider="gemini" className={s.markFill} idPrefix={`h8-gem-${size}`} />
        </span>
      );
    case 'claude-desktop':
      return (
        <span style={{ display: 'inline-flex', ...style }} className={className}>
          <AgentToolLogo provider="claude" className={s.markFill} />
        </span>
      );
    case 'phone':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" fill="none">
          <rect x="6" y="2" width="12" height="20" rx="3" fill="currentColor" />
          <rect x="8" y="4.5" width="8" height="13" rx="1" fill="var(--h8-screen, #0b1017)" />
        </svg>
      );
    default:
      return (
        <span
          aria-hidden="true"
          className={className}
          style={{
            ...style,
            display: 'inline-grid',
            placeItems: 'center',
            fontSize: Math.round(size * 0.62),
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {AGENT_NAMES[id].charAt(0)}
        </span>
      );
  }
}
