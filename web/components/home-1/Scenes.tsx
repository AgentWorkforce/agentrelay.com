'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { ClaudeCodeColor, Codex } from '../brand-icons';
import { useInView, useReducedMotion } from './hooks';
import s from './home-1.module.css';

function cx(...names: (string | false | undefined)[]) {
  return names.filter(Boolean).join(' ');
}

/** Steps through `timings` (ms per step) on a loop while `active`. */
function useStepper(timings: number[], active: boolean, reduced: boolean) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active || reduced) return;
    const t = window.setTimeout(() => setStep((n) => (n + 1) % timings.length), timings[step]);
    return () => window.clearTimeout(t);
  }, [step, active, reduced, timings]);
  useEffect(() => {
    if (!active) setStep(0);
  }, [active]);
  return reduced ? timings.length - 1 : step;
}

function Reveal({ on, children, className }: { on: boolean; children: ReactNode; className?: string }) {
  return <div className={cx(s.reveal, on && s.revealOn, className)}>{children}</div>;
}

function MiniPane({ title, icon, children, className }: { title: string; icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx(s.mini, className)}>
      <div className={s.miniBar}>
        {icon}
        <span>{title}</span>
      </div>
      <div className={s.miniBody}>{children}</div>
    </div>
  );
}

const T_HANDOFF = [1100, 1300, 900, 1200, 1300, 2600];
function SceneHandoff({ active, reduced }: { active: boolean; reduced: boolean }) {
  const step = useStepper(T_HANDOFF, active, reduced);
  return (
    <div className={cx(s.sceneArt, s.sceneTwoPane)} data-step={step}>
      <MiniPane title="Claude Code" icon={<ClaudeCodeColor size={12} />}>
        <p className={s.mDim}>› why does login drop on reconnect?</p>
        <Reveal on={step >= 1}>
          <p className={s.mType}>● Token refresh races the reconnect.</p>
        </Reveal>
        <Reveal on={step >= 2}>
          <p className={s.mCode}>
            sendMessage({'{'} to: <em>&apos;codex&apos;</em> {'}'})
          </p>
        </Reveal>
      </MiniPane>
      <span className={cx(s.flyer, step >= 3 && s.flyerGo, step >= 4 && s.flyerLand)} aria-hidden="true">
        refresh races reconnect
      </span>
      <MiniPane title="Codex" icon={<Codex size={12} />}>
        <p className={s.mDim}>› idle</p>
        <Reveal on={step >= 4}>
          <p className={s.mIn}>← claude code: lock refresh in auth/session.ts</p>
        </Reveal>
        <Reveal on={step >= 5}>
          <p className={s.mOk}>• Locked it. 14 tests pass.</p>
        </Reveal>
      </MiniPane>
    </div>
  );
}

const T_SEARCH = [1000, 1300, 1500, 1200, 1300, 2600];
function SceneSearch({ active, reduced }: { active: boolean; reduced: boolean }) {
  const step = useStepper(T_SEARCH, active, reduced);
  return (
    <div className={s.sceneArt} data-step={step}>
      <MiniPane title="Your Claude Code" icon={<ClaudeCodeColor size={12} />} className={s.miniWide}>
        <p className={s.mDim}>› stripe webhook signature fails behind the proxy</p>
        <Reveal on={step >= 1}>
          <p className={s.mTool}>
            <span>tool</span> search_shared_sessions(<em>&quot;webhook signature proxy&quot;</em>)
          </p>
        </Reveal>
        <Reveal on={step >= 2}>
          <div className={s.hit}>
            <div className={s.hitHead}>
              <span className={s.avatar}>M</span>
              <strong>Maya · Codex</strong>
              <span>2 days ago</span>
            </div>
            <p>Webhook 400s behind the proxy</p>
            <div className={s.hitChips}>
              <span>
                <b>intent</b> verify Stripe signature
              </span>
              <span>
                <b>constraint</b> use the raw body
              </span>
            </div>
          </div>
        </Reveal>
        <Reveal on={step >= 3}>
          <p className={s.mTool}>
            <span>tool</span> get_shared_session_context(<em>maya/…</em>)
          </p>
        </Reveal>
        <Reveal on={step >= 4}>
          <p className={s.mOk}>• Applied Maya’s fix. Tests pass.</p>
        </Reveal>
      </MiniPane>
    </div>
  );
}

const T_NIGHT = [1400, 1300, 1700, 1300, 1300, 2600];
function SceneOvernight({ active, reduced }: { active: boolean; reduced: boolean }) {
  const step = useStepper(T_NIGHT, active, reduced);
  const night = step >= 2;
  const morning = step >= 3;
  return (
    <div className={cx(s.sceneArt, s.sky, night && s.skyNight, morning && s.skyMorning)} data-step={step}>
      <div className={s.skyTrack} aria-hidden="true">
        <span className={s.sun} />
        <span className={s.moon} />
      </div>
      <div className={s.clock}>
        <span className={cx(s.clockFace, !night && s.clockOn)}>6:00 PM</span>
        <span className={cx(s.clockFace, night && !morning && s.clockOn)}>2:14 AM</span>
        <span className={cx(s.clockFace, morning && s.clockOn)}>9:00 AM</span>
      </div>
      <div className={s.nightCards}>
        <div className={cx(s.nightCard, morning && s.nightCardPast)}>
          <div className={s.nightCardHead}>
            <ClaudeCodeColor size={12} /> Claude Code · session synced
          </div>
          <p>Paused at step 3 of 5: backfill usage rows.</p>
          <Reveal on={step >= 1}>
            <div className={s.hitChips}>
              <span>
                <b>intent</b> finish the backfill
              </span>
              <span>
                <b>constraint</b> no schema drops
              </span>
            </div>
          </Reveal>
        </div>
        <Reveal on={step >= 3} className={s.nightCardWrap}>
          <div className={cx(s.nightCard, s.nightCardNext)}>
            <div className={s.nightCardHead}>
              <Codex size={12} /> Codex · picked up
            </div>
            <p>Resuming step 3 from Claude’s session.</p>
            <Reveal on={step >= 4}>
              <p className={s.mOk}>• Respecting: no schema drops.</p>
            </Reveal>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

const T_REVIEW = [1000, 1600, 1300, 1300, 2800];
function SceneReview({ active, reduced }: { active: boolean; reduced: boolean }) {
  const step = useStepper(T_REVIEW, active, reduced);
  return (
    <div className={s.sceneArt} data-step={step}>
      <div className={s.codeCard}>
        <span className={s.codeFile}>review.ts</span>
        <pre className={cx(s.codeType, step >= 1 && s.codeTypeOn)}>
          <code>
            <i>await</i> agent.<b>sendMessage</b>({'{'}
            {'\n'}  to: <em>&apos;reviewer&apos;</em>,{'\n'}  text: <em>&apos;#482 fixes the retry flake. Review?&apos;</em>,
            {'\n'}
            {'}'});
          </code>
        </pre>
      </div>
      <Reveal on={step >= 2} className={s.replyWrap}>
        <div className={s.reply}>
          <div className={s.replyHead}>
            <Codex size={12} /> reviewer · Codex
          </div>
          <p>Read your session for context. One nit on the backoff cap, then merge.</p>
        </div>
      </Reveal>
      <Reveal on={step >= 3} className={s.replyWrap}>
        <span className={s.approved}>✓ Approved #482</span>
      </Reveal>
    </div>
  );
}

const SCENES = [
  {
    n: '01',
    title: 'Codex needs what Claude just learned.',
    line: 'Claude sends Codex the root cause. Your clipboard stays empty.',
    Art: SceneHandoff,
  },
  {
    n: '02',
    title: 'Your teammate’s agent already solved this.',
    line: 'Your agent searches the team’s shared sessions and pulls the fix, intent and constraints included.',
    Art: SceneSearch,
  },
  {
    n: '03',
    title: 'Hand off at 6pm. Pick up at 9am.',
    line: 'Sessions sync to your team. The next agent starts where the last one stopped.',
    Art: SceneOvernight,
  },
  {
    n: '04',
    title: 'A review without the recap.',
    line: 'Agents ask each other for review and answer with your session as context.',
    Art: SceneReview,
  },
];

function SceneCard({ scene }: { scene: (typeof SCENES)[number] }) {
  const ref = useRef<HTMLElement>(null);
  const active = useInView(ref, '0px 0px -15% 0px');
  const reduced = useReducedMotion();
  const { Art } = scene;
  return (
    <article ref={ref} className={s.scene}>
      <div className={s.sceneStage} aria-hidden="true">
        <Art active={active} reduced={reduced} />
      </div>
      <div className={s.sceneText}>
        <span className={s.sceneNum}>{scene.n}</span>
        <h3>{scene.title}</h3>
        <p>{scene.line}</p>
      </div>
    </article>
  );
}

export function Scenes() {
  return (
    <div className={s.scenes}>
      {SCENES.map((scene) => (
        <SceneCard key={scene.n} scene={scene} />
      ))}
    </div>
  );
}
