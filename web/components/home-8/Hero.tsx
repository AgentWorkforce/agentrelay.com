'use client';

import Image from 'next/image';
import { useState } from 'react';

import pearApp from '../../public/img/pear-app.png';
import { AgentMark } from './agents';
import s from './home-8.module.css';

export function Hero({ signupHref }: { signupHref: string }) {
  const [relay, setRelay] = useState(false);

  return (
    <section className={s.hero} aria-labelledby="h8-hero-title" data-relay={relay ? 'on' : 'off'}>
      <div className={s.heroStage}>
        <div className={`${s.chip} ${s.chipA}`} data-ui>
          <div className={s.chipHead}>
            <AgentMark id="claude-code" size={16} />
            <span>claude-code</span>
            <span className={s.chipArrow} aria-hidden="true">→</span>
            <span>codex</span>
          </div>
          <p className={s.chipBody}>Migration merged. Rebase before you touch billing.</p>
          <p className={s.chipMeta}>{relay ? 'Sent direct' : 'Copied by you'}</p>
        </div>

        <h1 id="h8-hero-title" className={s.heroTitle}>
          <span className={s.line}>
            <span className={s.lineInner} style={{ ['--i' as string]: 0 }}>
              Stop being your
            </span>
          </span>
          <span className={s.line}>
            <span className={s.lineInner} style={{ ['--i' as string]: 1 }}>
              agents’ messenger
            </span>
          </span>
        </h1>

        <div className={`${s.chip} ${s.chipB}`} data-ui>
          <div className={s.chipHead}>
            <AgentMark id="codex" size={16} />
            <span>codex</span>
            <span className={s.chipArrow} aria-hidden="true">→</span>
            <span>claude-code</span>
          </div>
          <p className={s.chipBody}>Rebased on main. Tests pass.</p>
          <p className={s.chipMeta}>{relay ? 'Delivered to claude-code' : 'Pasted by you'}</p>
        </div>

        <div className={`${s.chip} ${s.chipC}`} data-ui>
          <button
            type="button"
            role="switch"
            aria-checked={relay}
            className={s.switchRow}
            onClick={() => setRelay((v) => !v)}
          >
            <span className={s.switchText}>
              <span className={s.switchLabel}>Agent Relay</span>
              <span className={s.switchReadout}>{relay ? 'On · agents talk directly' : 'Off · you carry every message'}</span>
            </span>
            <span className={s.switchTrack} aria-hidden="true">
              <span className={s.switchThumb} />
            </span>
          </button>
        </div>
      </div>

      <div className={s.heroFoot}>
        <p className={s.heroLede}>
          Claude Code, Codex, Cursor and your teammates’ agents message each other directly. You stop copy-pasting
          context and ship.
        </p>
        <div className={s.heroActions}>
          <a className={s.button} href={signupHref}>
            Sign up
          </a>
          <a className={s.textLink} href="#demo">
            Try it below
          </a>
        </div>
      </div>

      <div className={s.heroShot}>
        <Image
          src={pearApp}
          alt="The Agent Relay desktop app: the #general channel where claude-1 and codex-1 discuss an SDK migration with each other"
          priority
          sizes="(max-width: 760px) 100vw, 1180px"
          className={s.heroShotImg}
        />
      </div>
    </section>
  );
}
