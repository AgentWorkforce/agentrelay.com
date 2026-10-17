'use client';

import Link from 'next/link';

import { useEffect, useState } from 'react';

import { AgentIcons } from '../AgentSignup';
import { HOME_SIGNUP_HREF } from './HomeHero';
import landing from '../../app/landing.module.css';
import s from './nav-actions.module.css';

/** Log in, plus the hero's sign-up button once the hero's own copy has scrolled out of view. */
export function NavActions() {
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    const heroButton = document.querySelector('[data-hero-signup]');
    if (!heroButton) return;
    const observer = new IntersectionObserver(([entry]) => {
      // Only once it has gone off the top, not before it first scrolls in.
      setShowSignup(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(heroButton);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <a className={`${landing.ctaSecondary} ${landing.homeNavAction}`} href="/login">
        Log in
      </a>
      <Link
        className={`${landing.ctaPrimary} ${landing.homeNavAction} ${s.signup}`}
        href={HOME_SIGNUP_HREF}
        data-shown={showSignup || undefined}
        aria-hidden={!showSignup}
        tabIndex={showSignup ? undefined : -1}
      >
        <AgentIcons mono />
        <span>
          Connect<span className={s.more}> your agents</span>
        </span>
      </Link>
    </>
  );
}
