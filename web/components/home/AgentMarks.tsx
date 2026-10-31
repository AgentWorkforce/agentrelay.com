import type { ReactNode } from 'react';

import { CodexColor } from '../CodexColor';
import { ClaudeCodeColor, Cursor, Grok, HermesAgent, MuseColor, OpenClawColor, OpenCode } from '../brand-icons';

export type AgentTool =
  | 'claude'
  | 'codex'
  | 'conductor'
  | 'cursor'
  | 'opencode'
  | 'hermes'
  | 'openclaw'
  | 'grok'
  | 'grokbot'
  | 'capy'
  | 'devin'
  | 'muse'
  | 'antigravity'
  | 'paseo';

/** Conductor's block mark, traced from the conductor.build app icon without its dark tile. */
function ConductorMark() {
  return (
    <svg viewBox="148 88 215 335" aria-hidden="true">
      <g fill="currentColor">
        <rect x="188" y="93" width="170" height="50" rx="5" />
        <rect x="153" y="160" width="68" height="51" rx="5" />
        <rect x="290" y="160" width="68" height="51" rx="5" />
        <rect x="153" y="229" width="68" height="51" rx="5" />
        <rect x="153" y="298" width="68" height="50" rx="5" />
        <rect x="290" y="298" width="68" height="50" rx="5" />
        <rect x="188" y="367" width="136" height="51" rx="5" />
      </g>
    </svg>
  );
}

/** Devin's mark, from the devin.ai favicon. */
const DEVIN_PATH =
  'M70 159.333V91.3471C70 88.3592 71.594 85.5983 74.1816 84.1044L133.043 50.1205C135.631 48.6265 138.819 48.6265 141.407 50.1205L200.269 84.1044C202.856 85.5983 204.45 88.3592 204.45 91.3471V126.068C204.708 137.606 210.806 148.734 221.531 154.926C232.256 161.117 244.942 160.834 255.063 155.289L285.132 137.929C287.719 136.435 290.907 136.435 293.495 137.929L352.357 171.913C354.944 173.406 356.538 176.167 356.538 179.155V247.123C356.538 250.111 354.944 252.872 352.357 254.366L293.495 288.35C290.907 289.844 287.719 289.844 285.132 288.35L255.306 271.13C245.146 265.456 232.344 265.117 221.534 271.358C210.809 277.55 204.711 288.678 204.453 300.215V334.926C204.453 337.914 202.859 340.675 200.271 342.169L141.41 376.153C138.822 377.647 135.634 377.647 133.046 376.153L74.1845 342.169C71.5969 340.675 70.0028 337.914 70.0028 334.926V266.959C70.0029 263.971 71.5969 261.21 74.1845 259.716L133.046 225.732C135.634 224.238 138.822 224.238 141.41 225.732L171.547 243.132C181.656 248.638 194.306 248.906 205.005 242.729C215.815 236.488 221.922 225.231 222.088 213.595C221.83 202.057 215.732 189.737 205.008 183.545C194.283 177.353 181.597 177.636 171.476 183.181L141.269 200.72C138.67 202.229 135.461 202.228 132.864 200.716L74.1576 166.562C71.5835 165.065 70 162.311 70 159.333Z';

function DevinMark() {
  return (
    <svg viewBox="40 40 345 345" aria-hidden="true">
      <path d={DEVIN_PATH} fill="currentColor" />
    </svg>
  );
}

function PaseoMark() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M2 10.5V4.2a3 3 0 0 1 6 0v1.4h1.6a1.6 1.6 0 0 1 0 3.2H5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** Capy's own mark (dark-mode variant of the capy.ai favicon). */
function CapyMark() {
  return <img src="/logos/capy.svg" alt="" />;
}

/** Antigravity's mark, from the antigravity.google favicon without its backdrop. */
function AntigravityMark() {
  return <img src="/logos/antigravity.svg" alt="" />;
}

/** Every agent tool we show, with its name and logo. Logos size to their container. */
export const AGENT_TOOLS: Record<AgentTool, { name: string; logo: ReactNode }> = {
  claude: { name: 'Claude Code', logo: <ClaudeCodeColor /> },
  codex: { name: 'Codex', logo: <CodexColor /> },
  conductor: { name: 'Conductor', logo: <ConductorMark /> },
  cursor: { name: 'Cursor', logo: <Cursor /> },
  opencode: { name: 'OpenCode', logo: <OpenCode /> },
  hermes: { name: 'Hermes', logo: <HermesAgent /> },
  openclaw: { name: 'OpenClaw', logo: <OpenClawColor /> },
  grok: { name: 'Grok Build', logo: <Grok /> },
  grokbot: { name: 'Grok Bot', logo: <img src="/logos/grok-bot.svg" alt="" /> },
  capy: { name: 'Capy', logo: <CapyMark /> },
  devin: { name: 'Devin', logo: <DevinMark /> },
  muse: { name: 'Muse Code', logo: <MuseColor /> },
  antigravity: { name: 'Antigravity', logo: <AntigravityMark /> },
  paseo: { name: 'Paseo', logo: <PaseoMark /> },
};
