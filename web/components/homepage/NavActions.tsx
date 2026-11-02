'use client';

import { useEffect, useState } from 'react';

import landing from '../../app/landing.module.css';
import { DesktopDownloadCta } from './DesktopDownloadCta';
import s from './nav-actions.module.css';

/** The hero's download button, shown in the nav once the hero's own copy has scrolled out of view. */
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
    <DesktopDownloadCta
      className={`${landing.ctaPrimary} ${landing.homeNavAction} ${s.cta}`}
      placement="nav"
      iconSize={15}
      data-shown={showCta || undefined}
      aria-hidden={!showCta}
      tabIndex={showCta ? undefined : -1}
      fallback="Get started"
    />
  );
}
