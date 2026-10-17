'use client';

import { useEffect, useRef, useState } from 'react';
import { useSignupAnalytics } from './useSignupAnalytics';
import type { SignupAnalyticsContext } from '../lib/agent-signup-analytics';
import { ArrowUpRight, Copy, RefreshCw } from 'lucide-react';
import { SignupAtmosphere } from './SignupAtmosphere';
import { signupChapters, signupLoading, signupReady } from '../lib/agent-signup-story';
import type { AgentSignupProduct } from '../lib/agent-signup';
import { isSignupProgress, prepareSignupSession, trackedSignupPrompt, type SignupActivation, type SignupProgress, type SignupSession } from '../lib/agent-signup-progress';
import { teamsCloudUrl } from '../lib/teams-cloud';
import landing from '../app/landing.module.css';
import s from './agent-signup-journey.module.css';

const apiPath = teamsCloudUrl('/api/v1/signup/agent/sessions');
const storageKey = (product: string) => `agent-relay-signup:${product}`;

class ProgressError extends Error {
  constructor(message: string, readonly retryAfterMs = 6000, readonly expired = false, readonly missing = false) { super(message); }
}

async function readProgress(id: string, signal?: AbortSignal): Promise<SignupProgress> {
  const response = await fetch(`${apiPath}/${encodeURIComponent(id)}`, { cache: 'no-store', signal });
  if (response.status === 404) throw new ProgressError('This setup session has expired. Start a new session to continue.', 0, true, true);
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

async function startSession(product: AgentSignupProduct, analytics?: SignupAnalyticsContext): Promise<{ progress: SignupProgress; token?: string; activation?: SignupActivation; pending?: boolean; launched?: boolean }> {
  const requestedId = new URL(window.location.href).searchParams.get('session');
  let saved: SignupSession | undefined;
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey(product)) || 'null');
    if (isSignupProgress(value) && value.product === product && 'writeToken' in value &&
        typeof value.writeToken === 'string' && /^[a-f0-9]{64}$/.test(value.writeToken)) saved = value as SignupSession;
  } catch { /* Storage may be disabled; the current tab can still run setup. */ }
  const id = requestedId || saved?.id;
  if (saved?.id === id && saved?.activation) {
    return { progress: saved, token: saved.writeToken, activation: saved.activation, pending: !saved.activated, launched: saved.launched };
  }
  if (id) {
    const expiresAt = new URL(window.location.href).searchParams.get('expires');
    // A shared, not-yet-activated link has no write capability. It may only watch.
    if (expiresAt && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) <= Date.now() + 2 * 60 * 60_000 + 60_000 &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return { progress: { id, product, step: 0, state: 'waiting', revision: 0, updatedAt: new Date().toISOString(), expiresAt }, pending: true };
    }
    const progress = await readProgress(id, AbortSignal.timeout(10_000));
    if (progress.product !== product) throw new Error('This session belongs to a different product. Start a new session below.');
    return { progress, token: saved?.id === id ? saved.writeToken : undefined };
  }
  const session = await prepareSignupSession(product, analytics);
  try { sessionStorage.setItem(storageKey(product), JSON.stringify(session)); } catch { /* Best effort reload recovery. */ }
  return { progress: session, token: session.writeToken, activation: session.activation, pending: true };

}

export function AgentSignupJourney({ product }: { product: AgentSignupProduct }) {
  const analytics = useSignupAnalytics(product);
  const viewed = useRef(false);
  const lifecycle = useRef(0);
  const trackedExpired = useRef(false);
  const latest = useRef({ step: 0, owner: false });
  const [progress, setProgress] = useState<SignupProgress>();
  const [token, setToken] = useState<string>();
  const [activation, setActivation] = useState<SignupActivation>();
  const [pending, setPending] = useState(false);
  const [origin, setOrigin] = useState('');
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [expired, setExpired] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [answerValue, setAnswerValue] = useState('');
  const [answerError, setAnswerError] = useState('');
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const [charge, setCharge] = useState(0);
  const narrative = useRef<HTMLHeadingElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const boot = useRef<ReturnType<typeof startSession> | null>(null);
  const complete = progress?.state === 'complete';
  const active = progress?.step || 0;
  const inputRequest = product === 'flows' ? progress?.inputRequest : undefined;
  // The API stamps the request's progress step, so reloads can distinguish a
  // current answer (including step zero) from one left over after advancement.
  const answeredInput = inputRequest?.status === 'answered' && progress?.state === 'waiting' && inputRequest.step === active;
  const paused = progress?.state === 'waiting' && active > 0;
  const failed = progress?.state === 'failed';
  const endpoint = origin ? new URL(apiPath, origin).href : '';
  const prompt = progress && token ? trackedSignupPrompt(product, origin, endpoint, { id: progress.id, writeToken: token, activation }) : '';

  useEffect(() => { setAnswerValue(''); setAnswerError(''); }, [inputRequest?.id]);
  const dashboardHref = teamsCloudUrl(product === 'teams' ? '/dashboard/sessions' : '/dashboard');
  const openDashboard = () => { if (token) analytics.track('dashboard_opened', active); };

  useEffect(() => { if (launched) narrative.current?.focus({ preventScroll: true }); }, [launched]);

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
    // Keep one local capability through React StrictMode's effect replay.
    // Watcher links must not create a second funnel or inherit the owner's identity.
    const requested = new URL(window.location.href).searchParams.get('session');
    let owner = !requested;
    try { owner ||= JSON.parse(sessionStorage.getItem(storageKey(product)) || 'null')?.id === requested; } catch { /* Read-only until proven otherwise. */ }
    if (owner && !viewed.current) viewed.current = true;
    boot.current ||= (async () => {
      // Use available attribution without making signup wait for telemetry.
      const context = owner ? analytics.context() : undefined;
      if (owner) analytics.track('page_viewed');
      return startSession(product, context);
    })();
    void boot.current.then(({ progress: initial, token: writeToken, activation: initialActivation, pending: initialPending, launched: initialLaunched }) => {
      if (cancelled) return;
      setProgress(initial); setToken(writeToken); setActivation(initialActivation); setPending(Boolean(initialPending)); setLaunched(Boolean(initialLaunched)); setError('');
      setExpired(Date.parse(initial.expiresAt) <= Date.now());
      const url = new URL(window.location.href);
      url.searchParams.set('session', initial.id);
      if (initialPending) url.searchParams.set('expires', initial.expiresAt);
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
    if (!progress || complete || expired || (pending && token && !launched)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const poll = async () => {
      let delay = 3000;
      if (Date.now() >= Date.parse(progress.expiresAt)) { setExpired(true); return; }
      try {
        const next = await readProgress(progress.id, AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]));
        if (cancelled) return;
        if (next.id !== progress.id || next.product !== product) throw new Error('This session belongs to another product.');
        setProgress(previous => !previous || next.revision >= previous.revision ? next : previous);
        setError('');
        setPending(false);
        try {
          if (token) sessionStorage.setItem(storageKey(product), JSON.stringify({ ...next, writeToken: token, activation, activated: true, launched }));
        } catch { /* Storage is optional. */ }
        const url = new URL(window.location.href);
        url.searchParams.delete('expires');
        window.history.replaceState(window.history.state, '', url);
        if (next.state === 'complete') return;
      } catch (cause) {
        if (cancelled) return;
        if (cause instanceof ProgressError && cause.missing && pending) {
          // No row is expected until the agent registers the prompt's capability.
          setError('');
          timer = setTimeout(() => void poll(), 3000);
          return;
        }
        if (cause instanceof ProgressError && cause.expired) { setExpired(true); return; }
        delay = cause instanceof ProgressError ? cause.retryAfterMs : 6000;
        setError(cause instanceof Error && cause.name !== 'TimeoutError' ? cause.message : 'Updates are temporarily unavailable. Retrying shortly.');
      }
      if (!cancelled) timer = setTimeout(() => void poll(), Math.min(delay, Math.max(0, Date.parse(progress.expiresAt) - Date.now())));
    };
    timer = setTimeout(() => void poll(), 1500);
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [progress?.id, progress?.expiresAt, complete, product, pending, token, launched, activation, expired]);

  useEffect(() => {
    if (!progress || complete || expired) return;
    const timer = setTimeout(() => setExpired(true), Math.max(0, Date.parse(progress.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [progress?.expiresAt, complete, expired]);

  function launch() {
    setLaunched(true);
    try {
      if (progress && token) sessionStorage.setItem(storageKey(product), JSON.stringify({ ...progress, writeToken: token, activation, activated: !pending, launched: true }));
    } catch { /* In-memory setup still works when storage is unavailable. */ }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setCopyMessage('Copied. Paste it into your agent.'); analytics.track('prompt_copied'); launch(); }
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
  const ride = !expired && Boolean(progress) && (launched || active > 0 || complete);
  const mode = expired || error ? 'offline' : complete ? 'complete' : failed ? 'failed' : paused || answeredInput ? 'paused' : active ? 'working' : !progress ? 'forming' : 'waiting';
  const scene = expired ? 'expired' : error ? 'offline' : complete ? 'done' : notice ? 'notice' : inputRequest?.status === 'pending' ? 'input' : answeredInput ? 'answered' : failed ? 'failed' : paused ? 'approval' : active ? `step-${active}` : launched ? 'launch' : !progress ? 'forming' : !token ? 'watching' : 'ready';
  const story = scene === 'expired' ? { title: 'Your signup session expired.', detail: 'This session has expired. Start again when you’re ready.' }
    : scene === 'offline' ? { title: 'Setup is temporarily unavailable.', detail: error }
    : scene === 'done' ? { title: 'Your setup is complete.', detail: product === 'teams' ? 'Your desktop app is connected and session sharing is ready.' : 'Your workflow is active and ready to run.' }
    : scene === 'notice' ? { title: 'Your workflow draft is saved.', detail: 'Your flow is saved as a draft. Activation is still ahead.' }
    : scene === 'input' ? { title: 'Your agent needs an answer.', detail: 'Your agent needs one choice before it continues.' }
    : scene === 'answered' ? { title: 'Your answer has been sent.', detail: 'Your answer is with your agent. We’ll continue when it’s ready.' }
    : scene === 'failed' ? { title: 'Setup needs your attention.', detail: 'Check your agent’s conversation. It will tell you what needs attention.' }
    : scene === 'approval' ? (active === 1 ? { title: 'Finish signing in.', detail: 'Sign in with Google on the page your agent opened. Then come back here.' } : { title: 'Your agent needs your approval.', detail: 'Follow your agent’s request to approve access or make a choice. It will continue afterward.' })
    : scene === 'forming' ? signupLoading
    : scene === 'watching' ? { title: 'Waiting for your agent.', detail: 'This window follows your agent’s progress. Copy the prompt from the tab where you began.' }
    : ride ? signupChapters[product][active]
    : signupReady;
  const canCopy = Boolean(prompt) && !ride && !expired && !error && !failed && !notice && !answeredInput && inputRequest?.status !== 'pending';
  const inputCard = inputRequest && !expired && !complete && (inputRequest.status === 'pending' || answeredInput) && <section className={s.inputCard} aria-label={notice ? 'Flow preview status' : 'Question from your agent'}>
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
  </section>;

  return (
    <div className={`${s.page} ph-sensitive ph-no-capture`} data-mode={mode} data-ride={ride} data-scene={scene}>
      <SignupAtmosphere className={s.atmosphere} step={complete ? 6 : active} mode={mode} ride={ride} charge={charge} still={motionPaused} />
      <a className={`${landing.ctaSecondary} ${landing.homeNavAction} ${s.human}`} href="/login">Sign up the human way</a>
      <main className={s.main} aria-label="Agent Relay setup" aria-busy={!progress && !error}>
        <div className={s.content}>
          <div className={s.oracle} aria-live="polite" aria-atomic="true">
            <div key={scene} className={s.speech} data-immediate={scene === 'forming' || scene === 'ready' || scene === 'launch'}>
              <h1 ref={narrative} tabIndex={-1} className={s.title} aria-label={story.title}>
                {story.title.split(' ').map((word, index) => <span key={index} aria-hidden="true" style={{ '--word': index } as React.CSSProperties}>{word}{' '}</span>)}
              </h1>
              {story.detail && <p className={s.subtitle}>{story.detail}</p>}
            </div>
          </div>
          {canCopy && <div><button type="button" className={s.primary} onClick={() => { setCharge(0); void copy(); }}
            onPointerEnter={() => setCharge(1)} onPointerLeave={() => setCharge(0)} onFocus={() => setCharge(1)} onBlur={() => setCharge(0)}
            onPointerDown={() => setCharge(2)} onPointerUp={() => setCharge(1)} onPointerCancel={() => setCharge(0)}><Copy size={15} />Copy setup prompt<ArrowUpRight size={15} /></button></div>}
          {complete && <a onClick={openDashboard} className={s.primary} href={dashboardHref}>Enter the relay <ArrowUpRight size={16} /></a>}
          {copyMessage && !launched && <p className={s.copyStatus} role="status">{copyMessage}</p>}
          {inputCard}
          {showPrompt && prompt && <textarea data-ph-no-capture className={s.prompt} ref={textarea} aria-label="Agent signup prompt" value={prompt} readOnly spellCheck={false} rows={8} onCopy={() => { if (token) launch(); }} />}
          {expired && <button type="button" className={s.secondary} onClick={restart}>Start signup again <RefreshCw size={13} /></button>}
          {error && !progress && !expired && <button type="button" className={s.secondary} onClick={() => { boot.current = null; setError(''); setAttempt(value => value + 1); }}>Try again <RefreshCw size={13} /></button>}
          {scene === 'watching' && <button type="button" className={s.secondary} onClick={restart}>Start your own signup <ArrowUpRight size={13} /></button>}
          {scene === 'launch' && <button type="button" className={s.secondary} onClick={() => void copy()}>Copy the prompt again</button>}
        </div>
      </main>
      <button type="button" className={s.motion} aria-pressed={motionPaused} onClick={() => setMotionPaused(value => !value)}>{motionPaused ? 'Resume motion' : 'Pause motion'}</button>
    </div>
  );
}
