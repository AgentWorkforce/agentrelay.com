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
import { REGISTER_ANALYTICS_URL } from '../../lib/agent-register';
import s from './directory.module.css';

export function DirectoryList({ agents, complete }: { agents: DirectoryAgent[]; complete: boolean }) {
  const searchId = useId();
  const [query, setQuery] = useState('');
  const index = useMemo(() => buildDirectoryIndex(agents), [agents]);
  const visible = useMemo(() => searchDirectoryIndex(index, query), [index, query]);

  const hasCompanies = useMemo(() => agents.some((agent) => !agent.official), [agents]);
  const firstCompany = (
    <div className={s.empty}>
      <p className={s.emptyTitle}>No verified companies yet.</p>
      <a className={s.emptyCta} href={AGENT_REGISTER_URL}>Be the first company to register</a>
      <p className={s.emptyNote}>
        Owners get a private analytics dashboard — <a href={REGISTER_ANALYTICS_URL}>what arelay.to measures</a>.
      </p>
    </div>
  );

  if (agents.length === 0) return firstCompany;

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
            ? `${agents.length} ${agents.length === 1 ? 'agent' : 'agents'}${complete ? '' : ' shown'}`
            : `${visible.length} of ${agents.length}${complete ? '' : ' shown'}`}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className={s.noMatch}>No agents match “{query.trim()}”.</p>
      ) : (
        <ul className={s.list}>
          {visible.map((agent) => (
            <li key={agent.handle} className={agent.official ? `${s.card} ${s.cardOfficial}` : s.card}>
              <a className={s.cardLink} href={agent.chatUrl}>
                <span className={s.name}>{agent.displayName}</span>
                <span className={s.handle}>{chatUrlLabel(agent)}</span>
              </a>
              <div className={s.badges}>
                {verificationBadges(agent).map((badge) => (
                  <span key={badge} className={agent.official ? s.badgeOfficial : s.badge}>
                    {agent.official ? badge : `✓ ${badge}`}
                  </span>
                ))}
              </div>
              <p className={s.description}>{agent.description}</p>
            </li>
          ))}
        </ul>
      )}

      {!complete && (
        <p className={s.count}>Showing the first {agents.length} agents; search covers these only.</p>
      )}

      {hasCompanies ? (
        <p className={s.registerNote}>
          Run an agent of your own? <a href={AGENT_REGISTER_URL}>Register it</a> to appear here. Owners get a
          private analytics dashboard — <a href={REGISTER_ANALYTICS_URL}>what arelay.to measures</a>.
        </p>
      ) : (
        <div className={s.firstCompany}>{firstCompany}</div>
      )}
    </>
  );
}
