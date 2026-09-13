'use client';

import Image from 'next/image';
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useRef,
  useState,
} from 'react';

const WAITLIST_ENDPOINT =
  process.env.NEXT_PUBLIC_WAITLIST_API_URL?.trim() || 'https://agentrelay.com/cloud/api/waitlist';

type WaitlistContextValue = {
  openWaitlist: () => void;
};

type SubmissionState = 'idle' | 'loading' | 'success' | 'error';

const WaitlistContext = createContext<WaitlistContextValue | null>(null);

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<SubmissionState>('idle');
  const [error, setError] = useState('');

  function openWaitlist() {
    setEmail('');
    setStatus('idle');
    setError('');
    dialogRef.current?.showModal();
    window.requestAnimationFrame(() => emailRef.current?.focus());
  }

  function closeWaitlist() {
    dialogRef.current?.close();
  }

  async function submitWaitlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.reportValidity()) return;

    setStatus('loading');
    setError('');

    try {
      const response = await fetch(WAITLIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), source: 'skip-web' }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || 'We could not add you right now. Please try again.');
      }

      setStatus('success');
    } catch (submissionError) {
      setStatus('error');
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'We could not add you right now. Please try again.',
      );
    }
  }

  return (
    <WaitlistContext.Provider value={{ openWaitlist }}>
      {children}
      <dialog
        className="waitlist-dialog"
        ref={dialogRef}
        aria-labelledby="waitlist-title"
        onClick={(event) => {
          if (event.target === dialogRef.current) closeWaitlist();
        }}
      >
        <div className="waitlist-panel">
          <button className="waitlist-close" type="button" onClick={closeWaitlist} aria-label="Close waitlist form">
            <span aria-hidden="true">×</span>
          </button>

          {status === 'success' ? (
            <div className="waitlist-success" role="status">
              <Image src="/skip-assets/skip-avatar-hover.png" alt="" width={74} height={74} />
              <h2 id="waitlist-title">You&apos;re on the list.</h2>
              <p>We&apos;ll send Skip updates to <strong>{email.trim().toLowerCase()}</strong>.</p>
              <button className="button button-primary" type="button" onClick={closeWaitlist}>Done</button>
            </div>
          ) : (
            <>
              <div className="waitlist-heading">
                <Image src="/skip-assets/skip-avatar.png" alt="" width={68} height={68} />
                <div>
                  <h2 id="waitlist-title">Join the Skip waitlist.</h2>
                  <p>Be first to know when Skip is ready to manage your coding agents.</p>
                </div>
              </div>

              <form className="waitlist-form" onSubmit={submitWaitlist} noValidate>
                <div className="waitlist-field">
                  <label htmlFor="waitlist-email">Work email</label>
                  <input
                    id="waitlist-email"
                    ref={emailRef}
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    maxLength={320}
                    aria-describedby={error ? 'waitlist-error' : 'waitlist-helper'}
                    aria-invalid={status === 'error'}
                  />
                  <p id="waitlist-helper">No noise. Just launch updates from Skip.</p>
                  {error ? <p id="waitlist-error" className="waitlist-error" role="alert">{error}</p> : null}
                </div>

                <div className="waitlist-honeypot" aria-hidden="true">
                  <label htmlFor="waitlist-company">Company website</label>
                  <input id="waitlist-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
                </div>

                <button className="button button-primary waitlist-submit" type="submit" disabled={status === 'loading'}>
                  {status === 'loading' ? 'Joining...' : 'Join waitlist'}
                </button>
              </form>
            </>
          )}
        </div>
      </dialog>
    </WaitlistContext.Provider>
  );
}

export function WaitlistButton({ children, className }: { children: ReactNode; className: string }) {
  const context = useContext(WaitlistContext);

  if (!context) throw new Error('WaitlistButton must be rendered inside WaitlistProvider');

  return (
    <button className={className} type="button" onClick={context.openWaitlist}>
      {children}
    </button>
  );
}
