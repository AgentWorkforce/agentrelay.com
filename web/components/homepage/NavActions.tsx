'use client';

import { useEffect, useState } from 'react';

import { Github } from '../brand-icons';
import landing from '../../app/landing.module.css';
import s from './nav-actions.module.css';

/** Log in, plus the hero's getting-started button once the hero's own copy has scrolled out of view. */
export function NavActions() {
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    const heroButton = document.querySelector('[data-hero-cta]');
    if (!heroButton) return;
    const observer = new IntersectionObserver(([entry]) => {
      // Only once it has gone off the top, not before it first scrolls in.
      setShowCta(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(heroButton);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <a className={`${landing.ctaSecondary} ${landing.homeNavAction}`} href="/login">
        Log in
      </a>
      <a
        className={`${landing.ctaPrimary} ${landing.homeNavAction} ${s.cta}`}
        href="/docs/getting-started"
        data-shown={showCta || undefined}
        aria-hidden={!showCta}
        tabIndex={showCta ? undefined : -1}
      >
        <Github aria-hidden="true" size={18} />
        Get started
      </a>
    </>
  );
}
