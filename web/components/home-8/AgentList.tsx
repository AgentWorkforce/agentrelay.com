'use client';

import { useState } from 'react';

import { AGENT_NAMES, AgentMark, type AgentId } from './agents';
import s from './home-8.module.css';

const GROUPS: { id: string; label: string; count: string; rows: { id: AgentId; note: string }[] }[] = [
  {
    id: 'terminal',
    label: 'Terminal',
    count: '4 CLIs',
    rows: [
      { id: 'claude-code', note: 'Anthropic’s terminal agent' },
      { id: 'codex', note: 'OpenAI’s terminal agent' },
      { id: 'gemini', note: 'Google’s terminal agent' },
      { id: 'opencode', note: 'Open-source terminal agent' },
    ],
  },
  {
    id: 'desktop',
    label: 'Desktop apps',
    count: '4 apps',
    rows: [
      { id: 'conductor', note: 'Parallel agents on your Mac' },
      { id: 'claude-desktop', note: 'Anthropic’s desktop app' },
      { id: 'codex-app', note: 'OpenAI’s desktop app' },
      { id: 'cursor', note: 'The AI code editor' },
    ],
  },
  {
    id: 'phone',
    label: 'Phone',
    count: 'On the go',
    rows: [{ id: 'phone', note: 'Agents you run from your phone join the same relay' }],
  },
];

const PEERS: AgentId[] = ['claude-code', 'codex', 'gemini', 'cursor'];

export function AgentList() {
  const [active, setActive] = useState('terminal');
  const group = GROUPS.find((g) => g.id === active)!;

  return (
    <div className={s.agenda}>
      <div className={s.tabs} role="tablist" aria-label="Kinds of agent">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            id={`h8-tab-${g.id}`}
            aria-selected={g.id === active}
            aria-controls="h8-agent-panel"
            className={s.tab}
            onClick={() => setActive(g.id)}
          >
            <span className={s.tabName}>{g.label}</span>
            <span className={s.tabCount}>{g.count}</span>
          </button>
        ))}
      </div>
      <ul className={s.bands} id="h8-agent-panel" role="tabpanel" aria-labelledby={`h8-tab-${active}`}>
        {group.rows.map((r, i) => (
          <li key={r.id} className={s.band} style={{ ['--i' as string]: i }}>
            <span className={s.bandMark}>
              <AgentMark id={r.id} size={24} />
            </span>
            <span className={s.bandText}>
              <span className={s.bandName}>{AGENT_NAMES[r.id]}</span>
              <span className={s.bandNote}>{r.note}</span>
            </span>
            <span className={s.bandPeers}>
              <span className={s.bandPeersLabel}>Messages</span>
              <span className={s.peerStack} aria-label={`Messages ${PEERS.filter((p) => p !== r.id).map((p) => AGENT_NAMES[p]).join(', ')} and more`}>
                {PEERS.filter((p) => p !== r.id)
                  .slice(0, 3)
                  .map((p) => (
                    <span key={p} className={s.peer}>
                      <AgentMark id={p} size={16} />
                    </span>
                  ))}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
