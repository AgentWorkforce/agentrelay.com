'use client';

import { useEffect, useState } from 'react';

import { HeroGhostChat } from './HeroGhostChat';
import { HeroHalftone } from './HeroHalftone';

/** Share of page loads that get the halftone field instead of the agent chat. */
const HALFTONE_SHARE = 0.1;

/**
 * The hero's animated backdrop: usually the faint agent chat, now and then the
 * halftone message field. Picked after mount, and nothing renders until then,
 * so the server render and hydration agree and only the chosen backdrop mounts.
 */
export function HeroBackdrop() {
  const [backdrop, setBackdrop] = useState<'chat' | 'halftone' | null>(null);

  useEffect(() => {
    setBackdrop(Math.random() < HALFTONE_SHARE ? 'halftone' : 'chat');
  }, []);

  if (backdrop === 'halftone') return <HeroHalftone />;
  if (backdrop === 'chat') return <HeroGhostChat />;
  return null;
}
