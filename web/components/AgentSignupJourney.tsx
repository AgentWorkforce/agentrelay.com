'use client';

import { useEffect, useRef, useState } from 'react';
import { useSignupAnalytics } from './useSignupAnalytics';
import type { SignupAnalyticsContext } from '../lib/agent-signup-analytics';
import Link from 'next/link';
import Grok from '@lobehub/icons/es/Grok';
import { ArrowLeft, ArrowUpRight, Check, Copy, RefreshCw } from 'lucide-react';
import { AgentToolLogo } from './AgentToolLogos';
import { SignupAtmosphere } from './SignupAtmosphere';
import type { AgentSignupProduct } from '../lib/agent-signup';
import { isSignupProgress, signupSteps, trackedSignupPrompt, type SignupProgress, type SignupSession } from '../lib/agent-signup-progress';
import { teamsCloudUrl } from '../lib/teams-cloud';
import s from './agent-signup-journey.module.css';

const apiPath = teamsCloudUrl('/api/v1/signup/agent/sessions');
const storageKey = (product: string) => `agent-relay-signup:${product}`;

class ProgressError extends Error {
  constructor(message: string, readonly retryAfterMs = 6000, readonly expired = false) { super(message); }
}

async function readProgress(id: string, signal?: AbortSignal): Promise<SignupProgress> {
  const response = await fetch(`${apiPath}/${encodeURIComponent(id)}`, { cache: 'no-store', signal });
  if (response.status === 404) throw new ProgressError('This setup session has expired. Start a new session to continue.', 0, true);
  if (!response.ok) {
    const retry = response.headers.get('retry-after');
    const seconds = Number(retry);
    const delay = retry ? (Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retry) - Date.now()) : 6000;
    throw new ProgressError('Updates are temporarily unavailable. Your agent can keep working.', Number.isFinite(delay) ? Math.max(3000, delay) : 6000);
  }
  const data: unknown = await response.json();
  if (!isSignupProgress(data)) throw new Error('Could not read setup progress. Retrying shortly.');
  return data;
}

async function startSession(product: AgentSignupProduct, analytics?: SignupAnalyticsContext): Promise<{ progress: SignupProgress; token?: string }> {
  const requestedId = new URL(window.location.href).searchParams.get('session');
  let saved: SignupSession | undefined;
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey(product)) || 'null');
    if (isSignupProgress(value) && value.product === product && 'writeToken' in value &&
        typeof value.writeToken === 'string' && /^[a-f0-9]{64}$/.test(value.writeToken)) saved = value as SignupSession;
  } catch { /* Storage may be disabled; the current tab can still run setup. */ }
  const id = requestedId || saved?.id;
  if (id) {
    const progress = await readProgress(id, AbortSignal.timeout(10_000));
    if (progress.product !== product) throw new Error('This session belongs to a different product. Start a new session below.');
    return { progress, token: saved?.id === id ? saved.writeToken : undefined };
  }
  const response = await fetch(apiPath, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product, ...(analytics ? { analytics } : {}) }), signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('Could not start a setup session. Please try again.');
  const session: unknown = await response.json();
  if (!isSignupProgress(session) || session.product !== product || !('writeToken' in session) ||
      typeof session.writeToken !== 'string' || !/^[a-f0-9]{64}$/.test(session.writeToken)) throw new Error('Could not start a setup session. Please try again.');
  try { sessionStorage.setItem(storageKey(product), JSON.stringify(session)); } catch { /* Best effort reload recovery. */ }
  return { progress: session, token: session.writeToken };
}

export function AgentSignupJourney({ product }: { product: AgentSignupProduct }) {
  const analytics = useSignupAnalytics(product);
  const viewed = useRef(false);
  const lifecycle = useRef(0);
  const trackedExpired = useRef(false);
  const latest = useRef({ step: 0, owner: false });
  const [progress, setProgress] = useState<SignupProgress>();
  const [token, setToken] = useState<string>();
  const [origin, setOrigin] = useState('');
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [expired, setExpired] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [answerValue, setAnswerValue] = useState('');
  const [answerError, setAnswerError] = useState('');
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const boot = useRef<ReturnType<typeof startSession> | null>(null);
  const steps = signupSteps[product];
  const complete = progress?.state === 'complete';
  const active = progress?.step || 0;
  const paused = progress?.state === 'waiting' && active > 0;
  const failed = progress?.state === 'failed';
  const endpoint = origin ? new URL(apiPath, origin).href : '';
  const prompt = progress && token ? trackedSignupPrompt(product, origin, endpoint, { id: progress.id, writeToken: token }) : '';
  const inputRequest = product === 'flows' ? progress?.inputRequest : undefined;

  useEffect(() => { setAnswerValue(''); setAnswerError(''); }, [inputRequest?.id]);

  latest.current = { step: active, owner: Boolean(token) };
  useEffect(() => {
    const generation = ++lifecycle.current;
    const leave = () => { if (latest.current.owner) analytics.leave(latest.current.step); };
    const show = () => analytics.resume();
    window.addEventListener('pagehide', leave);
    window.addEventListener('pageshow', show);
    return () => {
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('pageshow', show);
      // Ignore StrictMode's cleanup/setup probe, but include SPA Back exits.
      queueMicrotask(() => { if (lifecycle.current === generation) leave(); });
    };
  }, [analytics]);
  useEffect(() => {
    if (expired && token && !trackedExpired.current) { trackedExpired.current = true; analytics.track('expired', active); }
  }, [expired, token, active, analytics]);

  useEffect(() => {
    let cancelled = false;
    setOrigin(window.location.origin);
    // Keep a single creation request through React StrictMode's effect replay.
    // Watcher links must not create a second funnel or inherit the owner's identity.
    const requested = new URL(window.location.href).searchParams.get('session');
    let owner = !requested;
    try { owner ||= JSON.parse(sessionStorage.getItem(storageKey(product)) || 'null')?.id === requested; } catch { /* Read-only until proven otherwise. */ }
    if (owner && !viewed.current) viewed.current = true;
    boot.current ||= (async () => {
      // Wait briefly for PostHog so page_viewed, the session POST, and later
      // events share one journey_id; never block setup on telemetry.
      const context = owner ? await analytics.contextWhenReady() : undefined;
      if (owner) analytics.track('page_viewed');
      return startSession(product, context);
    })();
    void boot.current.then(({ progress: initial, token: writeToken }) => {
      if (cancelled) return;
      setProgress(initial); setToken(writeToken); setError('');
      const url = new URL(window.location.href);
      url.searchParams.set('session', initial.id);
      window.history.replaceState(window.history.state, '', url);
    }).catch((cause) => {
      if (!cancelled) {
        if (owner) analytics.track('session_error');
        setError(cause instanceof Error && cause.name !== 'TimeoutError' ? cause.message : 'We couldn’t start live setup. Check your connection and try again.');
        if (cause instanceof ProgressError && cause.expired) setExpired(true);
      }
    });
    return () => { cancelled = true; };
  }, [product, attempt, analytics]);

  useEffect(() => {
    if (!progress || complete) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const poll = async () => {
      let delay = 3000;
      if (Date.now() >= Date.parse(progress.expiresAt)) { setExpired(true); return; }
      try {
        const next = await readProgress(progress.id, AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]));
        if (cancelled) return;
        if (next.product !== product) throw new Error('This session belongs to another product.');
        setProgress(previous => !previous || next.revision >= previous.revision ? next : previous);
        setError('');
        if (next.state === 'complete') return;
      } catch (cause) {
        if (cancelled) return;
        if (cause instanceof ProgressError && cause.expired) { setExpired(true); return; }
        delay = cause instanceof ProgressError ? cause.retryAfterMs : 6000;
        setError(cause instanceof Error && cause.name !== 'TimeoutError' ? cause.message : 'Updates are temporarily unavailable. Retrying shortly.');
      }
      if (!cancelled) timer = setTimeout(() => void poll(), Math.min(delay, Math.max(0, Date.parse(progress.expiresAt) - Date.now())));
    };
    timer = setTimeout(() => void poll(), 1500);
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [progress?.id, progress?.expiresAt, complete, product]);

  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setCopyMessage('Copied. Paste it into your agent.'); analytics.track('prompt_copied'); }
    catch { analytics.track('manual_copy_shown'); setShowPrompt(true); setCopyMessage('Select and copy the prompt below.'); requestAnimationFrame(() => { textarea.current?.focus(); textarea.current?.select(); }); }
  }
  async function submitAnswer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!progress || !token || !inputRequest || inputRequest.status !== 'pending' || !answerValue.trim() || answerSubmitting) return;
    setAnswerSubmitting(true); setAnswerError('');
    try {
      const response = await fetch(`${apiPath}/${encodeURIComponent(progress.id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId: inputRequest.id, answer: answerValue.trim() }), signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(response.status === 409 ? 'This question changed. Wait for the latest request.' : 'Could not send your answer. Please try again.');
      const next: unknown = await response.json();
      if (!isSignupProgress(next)) throw new Error('Could not confirm your answer. Please refresh the page.');
      setProgress(previous => !previous || next.revision >= previous.revision ? next : previous);
      setAnswerValue('');
    } catch (cause) { setAnswerError(cause instanceof Error ? cause.message : 'Could not send your answer. Please try again.'); }
    finally { setAnswerSubmitting(false); }
  }
  function restart() {
    analytics.restart(Boolean(token));
    try { sessionStorage.removeItem(storageKey(product)); } catch { /* Best effort. */ }
    window.location.assign(window.location.pathname);
  }
  const notice = product === 'flows' && inputRequest?.type === 'notice' && inputRequest.status === 'pending' ? inputRequest : undefined;
  const title = expired ? 'Session expired' : complete ? 'You’re all set.' : notice ? 'Your Flow preview is saved.' : failed ? 'Your agent needs a hand.' : paused ? (product === 'flows' && inputRequest?.status === 'answered' ? 'Answer received.' : 'A quick approval from you.') : active ? steps[active - 1].title : 'Waiting for your agent';
  const detail = expired ? 'Start a new session to keep watching setup.' : complete ? 'Your agent has verified setup. You’re ready to go.' : notice ? 'Review the inactive draft below. Internal model routing must be configured before live activation.' : failed ? (product === 'flows' ? 'Your agent will report what needs attention here.' : 'Check your agent’s conversation to resolve the issue. Progress will resume here.') : inputRequest?.status === 'pending' ? 'Answer on this page and your agent will keep going.' : paused ? (product === 'flows' ? inputRequest?.status === 'answered' ? 'Your answer is in. Your agent is moving to the next step.' : 'Complete the sign-in or connection approval page your agent opened. Setup will resume here.' : 'Follow the approval request in your agent’s conversation. We’ll pick up right here.') : active ? steps[active - 1].detail : 'The show starts when you paste the prompt into your agent.';
  const mode = expired || error ? 'offline' : complete ? 'complete' : failed ? 'failed' : paused ? 'paused' : active ? 'working' : 'waiting';

  const heading = expired ? 'Session expired' : complete ? 'All yours.' : notice ? 'Preview saved.' : inputRequest?.status === 'pending' ? 'Your input is needed.' : failed || active ? title : 'Leave it to your agent.';

  return (
    <div className={`${s.page} ph-sensitive ph-no-capture`} data-mode={mode}>
      <SignupAtmosphere className={s.atmosphere} step={complete ? 6 : active} mode={mode} />
      <Link href={`/${product}`} className={s.back} aria-label={`Back to ${product}`}><ArrowLeft size={18} /></Link>
      <main className={s.main}>
        <div className={s.content}>
          <h1>{heading}</h1>
          <p className={s.subtitle}>{complete ? 'Your agent has verified setup. You’re ready to go.' : expired || failed || inputRequest?.status === 'pending' || active ? detail : 'Give this prompt to your coding agent and hang out here to watch it sign you up.'}</p>
          {!complete && !active && !expired && !failed && inputRequest?.status !== 'pending' && (
            <div className={s.agents} role="img" aria-label="Codex, Claude Code, Grok, and OpenCode">
              <span title="Codex"><AgentToolLogo provider="codex" className={s.agentLogo} /></span>
              <span title="Claude Code"><AgentToolLogo provider="claude" className={s.agentLogo} /></span>
              <span title="Grok"><Grok size={28} /></span>
              <span title="OpenCode"><AgentToolLogo provider="opencode" className={s.agentLogo} /></span>
            </div>
          )}
          {complete ? <a onClick={() => { if (token) analytics.track('dashboard_opened', active); }} className={s.primary} href={teamsCloudUrl(product === 'teams' ? '/dashboard/sessions' : '/dashboard')}>Open {product === 'teams' ? 'your workspace' : 'dashboard'} <ArrowUpRight size={17} /></a>
            : !active && !expired && inputRequest?.status !== 'pending' ? <button type="button" className={s.primary} disabled={!prompt} onClick={() => void copy()}>{copyMessage.startsWith('Copied') ? <Check size={17} /> : <Copy size={17} />}{copyMessage.startsWith('Copied') ? 'Prompt copied' : 'Copy setup prompt'}</button> : null}
          <p className={s.copyStatus} role="status">{complete ? '' : expired ? '' : notice ? 'No action is required to keep this draft saved.' : inputRequest?.status === 'pending' ? 'Your answer goes straight to your agent.' : active ? (paused ? (product === 'flows' && inputRequest?.status === 'answered' ? 'Your agent is processing your answer.' : 'Your agent will continue after you approve.') : 'You can leave this page open.') : copyMessage || (progress && !token ? 'Watching this session. The prompt is in the original browser tab.' : product === 'teams' ? 'Paste into a coding agent on your Mac.' : 'Paste into a coding agent with terminal access.')}</p>
          {inputRequest && !expired && !complete && (inputRequest.status === 'pending' || paused) && <section className={s.inputCard} aria-label={notice ? 'Flow preview status' : 'Question from your agent'}>
            {notice ? <>
              <p className={s.inputEyebrow}>INACTIVE PREVIEW</p>
              <h2>{notice.label}</h2>
              {notice.actionHref && <a className={s.inputAction} href={teamsCloudUrl(notice.actionHref)}>Open saved preview <ArrowUpRight size={16} /></a>}
            </> : inputRequest.status === 'pending' ? <>
              <p className={s.inputEyebrow}>YOUR AGENT IS ASKING</p>
              <h2>{inputRequest.label}</h2>
              {token ? <form onSubmit={event => void submitAnswer(event)}>
                {inputRequest.type === 'select' ? <select aria-label={inputRequest.label} value={answerValue} onChange={event => setAnswerValue(event.target.value)} required>
                  <option value="">Choose an option</option>
                  {inputRequest.options?.map(option => <option key={option} value={option}>{option}</option>)}
                </select> : <input aria-label={inputRequest.label} type="text" maxLength={300} value={answerValue} onChange={event => setAnswerValue(event.target.value)} placeholder={inputRequest.key === 'approver' ? '@username' : inputRequest.key === 'repository' ? 'owner/repository' : 'Type your answer'} required />}
                <button type="submit" disabled={answerSubmitting || !answerValue.trim()}>{answerSubmitting ? 'Sending…' : 'Continue'}</button>
              </form> : <p>Open the original signup tab to answer this question.</p>}
              {answerError && <p className={s.inputError} role="alert">{answerError}</p>}
            </> : <p className={s.inputSent} role="status">Answer sent. Your agent will continue setup here.</p>}
          </section>}
          <div className={s.progress} role="status" aria-live="polite">
            <div className={s.progressDots} aria-hidden="true">{steps.map((step, index) => <i key={step.title} data-done={complete || active > index + 1} data-current={!complete && active === index + 1} />)}</div>
            <span>{expired ? 'Session expired' : error ? 'Waiting for a connection' : complete ? 'Setup complete' : notice ? `${active} of 5 · Preview saved; activation pending` : inputRequest?.status === 'pending' ? 'Waiting for your answer' : active ? `${active} of 5 · ${paused ? (product === 'flows' && inputRequest?.status === 'answered' ? 'Answer received' : 'Waiting for your approval') : failed ? 'Needs your attention' : steps[active - 1].title}` : progress ? 'Ready when your agent is' : 'Preparing your session…'}</span>
          </div>
          {error && <div className={s.error} role="alert"><p>{error}</p>{!progress && <button type="button" onClick={() => {
            boot.current = null; setError(''); setExpired(false); trackedExpired.current = false;
            try { sessionStorage.removeItem(storageKey(product)); } catch { /* Storage is optional. */ }
            const url = new URL(window.location.href);
            url.searchParams.delete('session');
            window.history.replaceState(window.history.state, '', url);
            setAttempt(value => value + 1);
          }}>Try again <RefreshCw size={12} /></button>}</div>}
          <details className={s.details} onToggle={event => { if (event.currentTarget.open && token) analytics.track('details_opened', active); }}>
            <summary>Setup details</summary>
            <div className={s.detailBody}>
              <ol className={s.steps}>{[...steps, { title: 'Ready to go' }].map((step, index) => {
                const done = complete || active > index + 1;
                const current = complete ? index === 5 : active === index + 1;
                return <li key={step.title} data-done={done} aria-current={current ? 'step' : undefined}>
                  <span className={s.stepCircle}>{done ? <Check size={13} aria-label="Complete" /> : index + 1}</span>
                  <span className={s.stepLabel}>{step.title}</span>
                </li>;
              })}</ol>
              {progress && <p className={s.session}>Session <code>{progress.id}</code></p>}
              <p>Live updates are reported by your agent.</p>
              <a href={`/signup/agent/${product}`}>Agent instructions <ArrowUpRight size={12} /></a>
              <button type="button" onClick={() => setShowPrompt(value => !value)} disabled={!prompt}>{showPrompt ? 'Hide prompt' : 'View prompt'}</button>
              <button type="button" onClick={restart}>Start a new session</button>
            </div>
          </details>
          {showPrompt && prompt && <textarea data-ph-no-capture className={s.prompt} ref={textarea} aria-label="Agent signup prompt" value={prompt} readOnly spellCheck={false} rows={12} />}
          {expired && <button type="button" className={s.restart} onClick={restart}>Start a new session <RefreshCw size={13} /></button>}
        </div>
      </main>
    </div>
  );
}
