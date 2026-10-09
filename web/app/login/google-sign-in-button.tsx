'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { GoogleIcon } from './google-icon';
import { RELAY_RUSH_EVENT } from './relay-events';
import s from './login.module.css';

/**
 * A plain link to the OAuth start route, so sign-in works before hydration.
 * Once hydrated it shows progress and swallows repeat clicks, which would
 * otherwise start competing OAuth states and fail the first callback.
 */
export function GoogleSignInButton({ href }: { href: string }) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // Back-navigation restores this page from bfcache with pending still set.
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  return (
    <a
      href={href}
      className={s.google}
      aria-busy={pending || undefined}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
          return;
        }
        if (pending) {
          event.preventDefault();
          return;
        }
        setPending(true);
        window.dispatchEvent(new Event(RELAY_RUSH_EVENT));
      }}
    >
      {pending ? <LoaderCircle className={s.spin} aria-hidden="true" /> : <GoogleIcon />}
      {pending ? 'Redirecting to Google…' : 'Continue with Google'}
    </a>
  );
}
