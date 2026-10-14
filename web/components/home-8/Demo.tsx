'use client';

import { useEffect, useRef, useState } from 'react';

import { AGENT_NAMES, AgentMark, type AgentId } from './agents';
import s from './home-8.module.css';

const PICKABLE: AgentId[] = ['claude-code', 'codex', 'gemini', 'opencode', 'cursor', 'conductor'];

const PLACES = [
  { id: 'here', label: 'This Mac', suffix: '' },
  { id: 'other', label: 'My other machine', suffix: ' on your Linux box' },
  { id: 'team', label: 'Maya’s laptop', suffix: ' on Maya’s laptop' },
] as const;

const MESSAGES = [
  {
    text: 'Migration merged. Rebase before you touch billing.',
    reply: 'Rebased on main. Billing tests pass.',
  },
  {
    text: 'Can you review the retry logic in queue.ts?',
    reply: 'Reviewing. Backoff never resets after a success; fix incoming.',
  },
  {
    text: 'Tests are red on main. Did you change the auth mock?',
    reply: 'Yes, sorry. Reverted the mock in a1f3c9e.',
  },
];

type Line = { key: number; kind: 'out' | 'in' | 'reply' | 'note'; text: string; who?: AgentId };

export function Demo() {
  const [from, setFrom] = useState<AgentId>('claude-code');
  const [to, setTo] = useState<AgentId>('codex');
  const [place, setPlace] = useState<(typeof PLACES)[number]['id']>('here');
  const [msg, setMsg] = useState(0);
  const [sender, setSender] = useState<Line[]>([]);
  const [receiver, setReceiver] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);
  const seq = useRef(0);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const same = from === to;
  const where = PLACES.find((p) => p.id === place)!;
  const toLabel = `${to}${where.suffix}`;

  function send() {
    if (same || busy) return;
    const m = MESSAGES[msg];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const k = () => ++seq.current;
    setBusy(true);
    setSender((l) => [...l.slice(-3), { key: k(), kind: 'out', text: m.text, who: to }]);
    const deliver = () => setReceiver((l) => [...l.slice(-3), { key: k(), kind: 'in', text: m.text, who: from }]);
    const reply = () => {
      setSender((l) => [...l.slice(-3), { key: k(), kind: 'reply', text: m.reply, who: to }]);
      setBusy(false);
    };
    if (reduce) {
      deliver();
      reply();
      return;
    }
    timers.current.push(window.setTimeout(deliver, 450), window.setTimeout(reply, 1400));
  }

  return (
    <div className={s.demoPanel} data-ui>
      <div className={s.demoScreens}>
        <div className={s.term}>
          <div className={s.termBar}>
            <AgentMark id={from} size={14} />
            <span>{from}</span>
            <span className={s.termPath}>~/billing</span>
          </div>
          <div className={s.termBody} aria-live="polite">
            {sender.length === 0 && <p className={s.termHint}>Nothing sent yet. Press Send.</p>}
            {sender.map((l) =>
              l.kind === 'out' ? (
                <p key={l.key} className={s.termLine}>
                  <span className={s.termTool}>⏺ agent-relay · message {toLabel}</span>
                  <span className={s.termText}>“{l.text}”</span>
                </p>
              ) : (
                <p key={l.key} className={`${s.termLine} ${s.termIn}`}>
                  <span className={s.termTool}>← reply from {l.who}</span>
                  <span className={s.termText}>{l.text}</span>
                </p>
              ),
            )}
          </div>
        </div>
        <div className={s.term}>
          <div className={s.termBar}>
            <AgentMark id={to} size={14} />
            <span>{to}</span>
            <span className={s.termPath}>{place === 'here' ? '~/billing' : place === 'other' ? 'linux-box:~/billing' : 'maya:~/billing'}</span>
          </div>
          <div className={s.termBody}>
            {receiver.length === 0 && <p className={s.termHint}>Waiting for messages.</p>}
            {receiver.map((l) => (
              <p key={l.key} className={`${s.termLine} ${s.termIn}`}>
                <span className={s.termTool}>← message from {l.who}</span>
                <span className={s.termText}>{l.text}</span>
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className={s.demoControls}>
        <label className={s.ctrlRow}>
          <span>From</span>
          <select value={from} onChange={(e) => setFrom(e.target.value as AgentId)}>
            {PICKABLE.map((a) => (
              <option key={a} value={a}>
                {AGENT_NAMES[a]}
              </option>
            ))}
          </select>
        </label>
        <label className={s.ctrlRow}>
          <span>To</span>
          <select value={to} onChange={(e) => setTo(e.target.value as AgentId)}>
            {PICKABLE.map((a) => (
              <option key={a} value={a}>
                {AGENT_NAMES[a]}
              </option>
            ))}
          </select>
        </label>
        <fieldset className={s.ctrlGroup}>
          <legend>Where it runs</legend>
          {PLACES.map((p) => (
            <label key={p.id} className={s.ctrlRadio}>
              <input type="radio" name="h8-place" value={p.id} checked={place === p.id} onChange={() => setPlace(p.id)} />
              <span>{p.label}</span>
            </label>
          ))}
        </fieldset>
        <label className={s.ctrlRow}>
          <span>Message</span>
          <select value={msg} onChange={(e) => setMsg(Number(e.target.value))}>
            {MESSAGES.map((m, i) => (
              <option key={m.text} value={i}>
                {m.text.length > 26 ? `${m.text.slice(0, 26)}…` : m.text}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={s.sendBtn} onClick={send} disabled={same || busy}>
          {same ? 'Pick two agents' : busy ? 'Delivering…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
