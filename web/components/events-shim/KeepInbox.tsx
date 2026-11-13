'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { teamsCloudUrl } from '../../lib/teams-cloud';
import s from './events-shim.module.css';

/** The page's own path, so sign-up comes back here and keeps the inbox. */
const RETURN_PATH = '/mcp-events-shim?keep=1';

type State =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'sign-in' }
  | { kind: 'kept'; message: string }
  | { kind: 'error'; message: string };

export type KeepResult = Exclude<State, { kind: 'idle' } | { kind: 'busy' }>;

/**
 * Asks Cloud to keep the inbox in the signed-in person's account.
 *
 * @param manageToken - The inbox's manage token, kept in this browser since it made the inbox.
 * @returns What to show: kept, sign in first, or an error.
 */
export async function requestKeep(
  manageToken: string,
  fetchImpl: typeof fetch = (input, init) => globalThis.fetch(input, init),
): Promise<KeepResult> {
  try {
    const response = await fetchImpl(teamsCloudUrl('/api/v1/events-shim/shims/current/claim'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ manage_token: manageToken }),
    });
    const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
    const message = typeof body?.message === 'string' ? body.message : '';
    if (response.status === 401) return { kind: 'sign-in' };
    if (response.ok) return { kind: 'kept', message: message || 'The inbox is now in your account.' };
    if (response.status === 409) return { kind: 'error', message: 'This inbox already belongs to another account.' };
    return { kind: 'error', message: message || 'Could not keep the inbox. Try again in a minute.' };
  } catch {
    return { kind: 'error', message: 'Could not reach Agent Relay. Try again in a minute.' };
  }
}

/** Google sign-up that returns to this page, where the inbox is then kept. */
export function keepInboxSignInHref(): string {
  const params = new URLSearchParams({ source: 'teams', next: RETURN_PATH, utm_content: 'events-shim-keep' });
  return teamsCloudUrl(`/api/auth/google/start?${params.toString()}`);
}

/**
 * Keeps a temporary webhook inbox in the person's Agent Relay account
 * (`POST …/events-shim/shims/current/claim`, Cloud session + manage token).
 * A new account takes over the inbox's Agent Relay workspace too, so agents
 * already set up keep working; an existing account gets the inbox moved in.
 */
export function KeepInbox({ manageToken }: { manageToken: string }) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const autoTried = useRef(false);

  const keep = useCallback(async () => {
    setState({ kind: 'busy' });
    setState(await requestKeep(manageToken));
  }, [manageToken]);

  // Back from sign-up: keep it straight away.
  useEffect(() => {
    if (autoTried.current) return;
    autoTried.current = true;
    if (new URLSearchParams(window.location.search).get('keep') === '1') void keep();
  }, [keep]);

  return (
    <section className={s.section} aria-live="polite">
      <h2 className={s.sectionTitle}>Keep this inbox</h2>
      {state.kind === 'kept' ? (
        <p className={s.note}>{state.message}</p>
      ) : (
        <>
          <p className={s.note}>
            This inbox is temporary. It and the Agent Relay workspace your agents are woken through are deleted after 7
            days without posts. Keep them in your Agent Relay account; agents you already set up keep working.
          </p>
          {state.kind === 'sign-in' ? (
            <a className={s.primary} href={keepInboxSignInHref()}>
              Sign up or sign in to keep it
            </a>
          ) : (
            <button type="button" className={s.primary} onClick={() => void keep()} disabled={state.kind === 'busy'}>
              {state.kind === 'busy' ? 'Keeping…' : 'Keep it'}
            </button>
          )}
          {state.kind === 'error' && <p className={s.error}>{state.message}</p>}
        </>
      )}
    </section>
  );
}
