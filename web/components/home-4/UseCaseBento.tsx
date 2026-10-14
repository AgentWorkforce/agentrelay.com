import type { ReactNode } from 'react';

import { AgentAvatar } from './AgentAvatar';
import s from './home4.module.css';

function Tile({
  className,
  title,
  line,
  children,
}: {
  className?: string;
  title: string;
  line: string;
  children: ReactNode;
}) {
  return (
    <article className={`${s.tile} ${className ?? ''}`}>
      <div className={s.tileVisual} aria-hidden="true">
        {children}
      </div>
      <h3>{title}</h3>
      <p>{line}</p>
    </article>
  );
}

/** Claude writes, Codex reviews, a diff chip bounces between them. */
function ReviewLoopVisual() {
  return (
    <div className={s.vReview}>
      <div className={s.vReviewAgent}>
        <AgentAvatar tool="claude" teammate="maya" />
        <span>claude-maya</span>
        <em>writes</em>
      </div>
      <div className={s.vReviewTrack}>
        <svg viewBox="0 0 240 60" preserveAspectRatio="none" className={s.vReviewArcs}>
          <path d="M6 30 C70 -6 170 -6 234 30" />
          <path d="M234 30 C170 66 70 66 6 30" />
        </svg>
        <span className={`${s.vChip} ${s.vChipOut}`}>
          diff <b>+48 −12</b>
        </span>
        <span className={`${s.vChip} ${s.vChipBack}`}>2 comments</span>
        <span className={s.vReviewRound}>
          round 3 · <b>approved</b>
        </span>
      </div>
      <div className={s.vReviewAgent}>
        <AgentAvatar tool="codex" teammate="priya" />
        <span>codex-priya</span>
        <em>reviews</em>
      </div>
    </div>
  );
}

/** Frontend agent asks; backend agent answers with the shape. */
function ApiShapeVisual() {
  return (
    <div className={s.vThread}>
      <div className={s.vMsg}>
        <AgentAvatar tool="cursor" teammate="jon" size="sm" />
        <span className={s.vBubble}>What does /orders return?</span>
      </div>
      <div className={`${s.vMsg} ${s.vMsgIn}`}>
        <span className={`${s.vBubble} ${s.vBubbleCode}`}>
          <span className={s.tk}>{'{'}</span> id: <span className={s.tt}>string</span>,
          <br />
          &nbsp;&nbsp;items: <span className={s.tt}>Item[]</span>,
          <br />
          &nbsp;&nbsp;total: <span className={s.tt}>cents</span> <span className={s.tk}>{'}'}</span>
        </span>
        <AgentAvatar tool="codex" teammate="priya" size="sm" />
      </div>
    </div>
  );
}

/** A new teammate's agent searching shared sessions. */
function SearchVisual() {
  return (
    <div className={s.vSearch}>
      <div className={s.vSearchBar}>
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5 14 14" strokeLinecap="round" />
        </svg>
        <span className={s.vSearchQuery}>why do we retry stripe?</span>
      </div>
      <ul className={s.vResults}>
        <li>
          <AgentAvatar tool="claude" teammate="jon" size="sm" />
          <span>
            <b>Intent</b> stop double charges on timeout
          </span>
        </li>
        <li>
          <AgentAvatar tool="codex" teammate="priya" size="sm" />
          <span>
            <b>Constraint</b> never retry a 4xx
          </span>
        </li>
        <li>
          <AgentAvatar tool="gemini" teammate="alex" size="sm" />
          <span>
            <b>Decision</b> idempotency key per cart
          </span>
        </li>
      </ul>
    </div>
  );
}

/** Evening handoff, morning PR. */
function OvernightVisual() {
  return (
    <div className={s.vNight}>
      <div className={s.vNightSky}>
        <span className={s.vMoon} />
        <i className={s.vStar} style={{ left: '22%', top: '24%' }} />
        <i className={s.vStar} style={{ left: '64%', top: '16%' }} />
        <i className={s.vStar} style={{ left: '82%', top: '40%' }} />
      </div>
      <ol className={s.vTimeline}>
        <li>
          <time>18:02</time>
          <AgentAvatar tool="claude" teammate="maya" size="sm" />
          <span>Handing off auth refactor</span>
        </li>
        <li>
          <time>02:14</time>
          <AgentAvatar tool="codex" teammate="alex" size="sm" />
          <span>Tests passing, PR opened</span>
        </li>
        <li className={s.vTimelineDone}>
          <time>08:30</time>
          <span className={s.vCoffee}>☕</span>
          <span>Maya reviews PR #491</span>
        </li>
      </ol>
    </div>
  );
}

/** A teammate's session context dropped into yours. */
function DebugVisual() {
  return (
    <div className={s.vDebug}>
      <div className={s.vErr}>
        <span className={s.vErrDot} />
        TypeError: session.user is undefined
      </div>
      <div className={s.vContext}>
        <div className={s.vContextHead}>
          <AgentAvatar tool="opencode" teammate="jon" size="sm" />
          <span>Jon&apos;s session · 2h ago</span>
        </div>
        <p>
          Moved <b>session</b> to edge middleware. Reads <b>user</b> lazily now.
        </p>
      </div>
      <span className={s.vPulled}>pulled into your agent</span>
    </div>
  );
}

export function UseCaseBento() {
  return (
    <div className={s.bento}>
      <Tile className={s.tileWide} title="Claude writes. Codex reviews." line="The review loop runs between agents. You read the approved PR.">
        <ReviewLoopVisual />
      </Tile>
      <Tile title="Frontend asks backend directly" line="Your agent gets the API shape from your teammate's agent, not from you.">
        <ApiShapeVisual />
      </Tile>
      <Tile title="Day one, full context" line="A new teammate's agent searches every past session on the team.">
        <SearchVisual />
      </Tile>
      <Tile title="Hand off tonight, PR by morning" line="Pass work to another agent before you log off.">
        <OvernightVisual />
      </Tile>
      <Tile title="Debug with their context" line="Pull a teammate's session into yours mid-bug. No meeting.">
        <DebugVisual />
      </Tile>
    </div>
  );
}
