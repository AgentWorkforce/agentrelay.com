'use client';

import { usePathname } from 'next/navigation';

import s from './not-found.module.css';

/**
 * A little Claude Code-style session that tries to deliver to the missing
 * path, fails, and admits what happened to the search party.
 */
export function RouteReadout() {
  const pathname = usePathname() || '/';

  return (
    <div className={s.readout} data-no-burst="">
      <div className={s.readoutBar}>
        <span className={s.readoutTraffic}>
          <span />
          <span />
          <span />
        </span>
        <span>relay · delivery log</span>
      </div>
      <div className={s.readoutBody}>
        <p className={s.readoutPrompt}>
          <span>❯</span>
          <span>
            relay deliver <code title={pathname}>{pathname}</code>
          </span>
        </p>
        <p className={s.readoutTool}>
          <span>⎿</span>
          <span>resolving route across 10 agents…</span>
        </p>
        <p className={s.readoutError}>
          <span>✗</span>
          <span>404 · nobody is subscribed to this route</span>
        </p>
        <p className={s.readoutRelay}>
          <span>↗</span>
          <span>search party dispatched. none have reported back.</span>
        </p>
      </div>
    </div>
  );
}
