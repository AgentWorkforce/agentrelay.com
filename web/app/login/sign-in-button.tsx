'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { LoaderCircle } from 'lucide-react';
import { signInProviderLabel, type SignInProvider } from '../../lib/login';
import { GoogleIcon } from './google-icon';
import { MicrosoftIcon } from './microsoft-icon';
import { RELAY_RUSH_EVENT } from './relay-events';
import s from './login.module.css';

const ICONS: Record<SignInProvider, ComponentType> = {
  google: GoogleIcon,
  microsoft: MicrosoftIcon,
};

/**
 * A plain link to the OAuth start route, so sign-in works before hydration.
 * Once hydrated it shows progress and swallows repeat clicks, which would
 * otherwise start competing OAuth states and fail the first callback. Browsers
 * report no event for a cancelled navigation, so the guard releases after
 * `HANDOFF_MS` and the button can be retried.
 */
const HANDOFF_MS = 8000;

export function SignInButton({
  provider,
  href,
  hidden = false,
}: {
  provider: SignInProvider;
  href: string;
  /** Render with `display: none`, keeping the markup in place. */
  hidden?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const label = signInProviderLabel(provider);
  const Icon = ICONS[provider];

  useEffect(() => {
    // Back-navigation restores this page from bfcache with pending still set.
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(RELAY_RUSH_EVENT, { detail: pending }));
    if (!pending) return;
    const release = setTimeout(() => setPending(false), HANDOFF_MS);
    return () => clearTimeout(release);
  }, [pending]);

  return (
    <a
      href={href}
      className={hidden ? `${s.provider} ${s.hidden}` : s.provider}
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
      }}
    >
      {pending ? <LoaderCircle className={s.spin} aria-hidden="true" /> : <Icon />}
      {pending ? `Redirecting to ${label}…` : `Continue with ${label}`}
    </a>
  );
}
