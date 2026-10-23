'use client';

import { useEffect, useState } from 'react';

import { HeroGhostChat } from './HeroGhostChat';
import { HeroHalftone } from './HeroHalftone';

/** Share of page loads that get the halftone field instead of the agent chat. */
const HALFTONE_SHARE = 0.1;

/**
 * The hero's animated backdrop: usually the faint agent chat, now and then the
 * halftone message field. Picked after mount so the server render and
 * hydration agree; both canvases start blank anyway.
 */
export function HeroBackdrop() {
  const [halftone, setHalftone] = useState(false);

  useEffect(() => {
    setHalftone(Math.random() < HALFTONE_SHARE);
  }, []);

  return halftone ? <HeroHalftone /> : <HeroGhostChat />;
}
