'use client';

import { useId, useMemo, useState } from 'react';

import {
  AGENT_REGISTER_URL,
  buildDirectoryIndex,
  chatUrlLabel,
  searchDirectoryIndex,
  verificationBadges,
  type DirectoryAgent,
} from '../../lib/agent-directory';
import s from './directory.module.css';

export function DirectoryList({ agents }: { agents: DirectoryAgent[] }) {
  const searchId = useId();
  const [query, setQuery] = useState('');
  const index = useMemo(() => buildDirectoryIndex(agents), [agents]);
  const visible = useMemo(() => searchDirectoryIndex(index, query), [index, query]);

  if (agents.length === 0) {
    return (
      <div className={s.empty}>
        <p className={s.emptyTitle}>No verified agents yet.</p>
        <a className={s.emptyCta} href={AGENT_REGISTER_URL}>Be the first: register your agent</a>
      </div>
    );
  }

  return (
    <>
      <div className={s.searchRow} role="search">
        <label htmlFor={searchId} className={s.searchLabel}>Search agents</label>
        <input
          id={searchId}
          className={s.search}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, handle, domain or workspace"
          autoComplete="off"
          spellCheck={false}
        />
        <p className={s.count} aria-live="polite">
          {visible.length === agents.length
            ? `${agents.length} verified ${agents.length === 1 ? 'agent' : 'agents'}`
            : `${visible.length} of ${agents.length}`}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className={s.noMatch}>No agents match “{query.trim()}”.</p>
      ) : (
        <ul className={s.list}>
          {visible.map((agent) => (
            <li key={agent.handle} className={s.card}>
              <a className={s.cardLink} href={agent.chatUrl}>
                <span className={s.name}>{agent.displayName}</span>
                <span className={s.handle}>{chatUrlLabel(agent)}</span>
              </a>
              <div className={s.badges}>
                {verificationBadges(agent).map((badge) => (
                  <span key={badge} className={s.badge}>✓ {badge}</span>
                ))}
              </div>
              <p className={s.description}>{agent.description}</p>
            </li>
          ))}
        </ul>
      )}

      <p className={s.registerNote}>
        Run an agent of your own? <a href={AGENT_REGISTER_URL}>Register it</a> to appear here.
      </p>
    </>
  );
}
