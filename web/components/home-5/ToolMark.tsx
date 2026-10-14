import { AgentToolLogo } from '../AgentToolLogos';
import { ClaudeCodeColor, Codex, Cursor, OpenCode } from '../brand-icons';
import s from './home5.module.css';

export type Tool = 'claude' | 'codex' | 'cursor' | 'opencode' | 'gemini';

export const TOOL_LABEL: Record<Tool, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  cursor: 'Cursor',
  opencode: 'OpenCode',
  gemini: 'Gemini',
};

/** One agent's logo, sized by the surrounding font-size (1em square). */
export function ToolMark({ tool, id, className }: { tool: Tool; id: string; className?: string }) {
  if (tool === 'claude') return <ClaudeCodeColor className={className} size="1em" />;
  if (tool === 'codex') return <Codex className={className} size="1em" />;
  if (tool === 'cursor') return <Cursor className={className} size="1em" />;
  if (tool === 'opencode') return <OpenCode className={className} size="1em" />;
  return <AgentToolLogo provider="gemini" idPrefix={`h5-${id}`} className={`${s.em} ${className ?? ''}`} />;
}
