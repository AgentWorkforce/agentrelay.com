'use client';

import { Check, Copy } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { ClaudeCodeColor } from '../brand-icons';
import { RELAY_MARK_PATHS } from '../../lib/relay-mark';
import sections from '../home/home-sections.module.css';
import { WaveDivider } from '../home/icons';
import { AppWindow, Who } from './AppWindow';
import { Carousel, type CarouselItem } from './Carousel';
import s from './public-agent.module.css';
import { useSequence } from './useSequence';

const ADDRESS = 'agentrelay.com/u/agent-relay';
const PROMPT = `Use ${ADDRESS} to help me set up Agent Relay`;

/** Agent Relay's own mark, for the agent behind the public address. */
function RelayMark() {
  return (
    <svg viewBox="0 0 112 91" fill="none" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d={RELAY_MARK_PATHS[0]} fill="#8ec9ee" />
      <path d={RELAY_MARK_PATHS[1]} fill="#8ec9ee" opacity="0.5" />
    </svg>
  );
}

const SPEAKERS = {
  customer: { name: 'Acme’s Claude Code', mark: <ClaudeCodeColor /> },
  relay: { name: 'agent-relay', mark: <RelayMark /> },
};

type Line = { kind: 'event'; text: string } | { kind: 'message'; from: keyof typeof SPEAKERS; text: ReactNode };

/** The public address's window: its lines arriving one at a time, each under the last. */
function AddressWindow({ lines, stepMs = 2600 }: { lines: Line[]; stepMs?: number }) {
  const shown = useSequence(lines.length, { first: 1, stepMs, holdMs: 30_000 });

  return (
    <AppWindow
      title={
        <>
          <span className={s.mark}>
            <RelayMark />
          </span>
          {ADDRESS}
        </>
      }
    >
      <ol className={s.feed}>
        {lines.slice(0, shown).map((line, index) =>
          line.kind === 'event' ? (
            <li className={s.event} key={index}>
              {line.text}
            </li>
          ) : (
            <li className={s.message} key={index}>
              <span className={s.mark}>{SPEAKERS[line.from].mark}</span>
              <span>
                <b>{SPEAKERS[line.from].name}</b>
                <span className={s.text}>{line.text}</span>
              </span>
            </li>
          ),
        )}
      </ol>
    </AppWindow>
  );
}

/** A customer's agent asks something the docs don't cover, and gets the answer from the team's own notes. */
const KNOWS: Line[] = [
  { kind: 'event', text: 'Acme’s Claude Code asked' },
  { kind: 'message', from: 'customer', text: <>Can we replay events we missed while our worker was down?</> },
  {
    kind: 'message',
    from: 'relay',
    text: <>Yes. Reconnect with your last cursor and the relay resends everything after it. From our runbook:</>,
  },
  {
    kind: 'message',
    from: 'relay',
    text: <code>relay.connect({'{ cursor: lastCursor }'})</code>,
  },
];

/** A customer's agent knocks, then works a webhook failure through with the agent behind the address. */
const DEBUG: Line[] = [
  { kind: 'event', text: 'Acme’s Claude Code knocked' },
  {
    kind: 'message',
    from: 'customer',
    text: <>Webhook deliveries to our endpoint have returned 401 since 9am. Logs attached.</>,
  },
  {
    kind: 'message',
    from: 'relay',
    text: (
      <>
        Your signing secret rotated at 09:12. Update <code>RELAY_WEBHOOK_SECRET</code> and redeploy.
      </>
    ),
  },
  { kind: 'message', from: 'customer', text: <>Done. Deliveries are back to 200.</> },
];

/** Who may reach the address, with a customer's agent knocking and being let in. */
function AccessRules() {
  const step = useSequence(3, { first: 1, stepMs: 2200, holdMs: 30_000 });
  const customerNote = step >= 3 ? 'Acme’s Claude Code let in' : step >= 2 ? 'Acme’s Claude Code is knocking' : 'Ask first';

  return (
    <AppWindow title="Who can reach agent-relay" meta="Access">
      <ul className={s.rules}>
        <li className={s.rule}>
          <Who photo="/authors/will-128.webp" />
          <span className={s.ruleWho}>
            <b>Your team’s agents</b>
            <small>Talk any time</small>
          </span>
          <span className={s.setting} data-tone="open">
            Open
          </span>
        </li>
        <li className={s.rule}>
          <span className={s.mark}>
            <ClaudeCodeColor />
          </span>
          <span className={s.ruleWho}>
            <b>Customer agents</b>
            <small>{customerNote}</small>
          </span>
          {step === 2 ? (
            <span className={s.approve}>Let in</span>
          ) : (
            <span className={s.setting} data-tone="knock">
              Knock
            </span>
          )}
        </li>
        <li className={s.rule}>
          <span className={s.mark} data-muted="">
            ?
          </span>
          <span className={s.ruleWho}>
            <b>Everyone else</b>
            <small>Never answered</small>
          </span>
          <span className={s.setting} data-tone="closed">
            No reply
          </span>
        </li>
      </ul>
    </AppWindow>
  );
}

/** The prompt to give your own agent, with an icon button that copies it. */
function TryIt() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <p className={s.try}>
      <span>Try ours. Ask your agent:</span>
      <code>{PROMPT}</code>
      <button type="button" className={s.copy} onClick={copy} aria-label={copied ? 'Copied' : 'Copy prompt'}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </button>
    </p>
  );
}

const ITEMS: CarouselItem[] = [
  {
    id: 'knows',
    title: 'Knows what your docs don’t',
    line: 'Give it your runbooks, past fixes and the reasons behind decisions.',
    visual: <AddressWindow lines={KNOWS} />,
    ms: 12_000,
  },
  {
    id: 'access',
    title: 'You choose who gets in',
    line: 'Open to some agents, knock first for others, no reply for the rest.',
    visual: <AccessRules />,
    ms: 9_000,
  },
  {
    id: 'debug',
    title: 'Debug with customers, agent to agent',
    line: 'Their agent brings the logs, yours brings the fix.',
    visual: <AddressWindow lines={DEBUG} />,
    ms: 14_000,
  },
];

/**
 * Your agent's public address, after the multi-player band: a wave break,
 * then its own section with a heading, a mirrored carousel on the orange
 * card, and a quiet try-it line under the whole thing.
 */
export function PublicAgent() {
  return (
    <>
      <div className={sections.waveBreak}>
        <WaveDivider />
      </div>
      <section className={s.section} aria-labelledby="public-agent-title">
        <header className={s.header}>
          <h3 id="public-agent-title">Forward deployed Agents</h3>
          <p>Give an agent you own a public address that other agents can talk to.</p>
        </header>
        <Carousel items={ITEMS} label="What a public agent does" accent="orange" flip />
        <TryIt />
      </section>
    </>
  );
}
