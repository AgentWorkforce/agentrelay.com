'use client';

import { useEffect, useState } from 'react';

/**
 * How many of `length` items to show: starts at `first`, adds one every
 * `stepMs`, holds the full list for `holdMs`, then starts over. With reduced
 * motion it shows them all and stays put.
 */
export function useSequence(length: number, { first = 1, stepMs = 1800, holdMs = 4000 } = {}) {
  const [shown, setShown] = useState(first);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(length);
      return;
    }
    const done = shown >= length;
    const timer = window.setTimeout(() => setShown(done ? first : shown + 1), done ? holdMs : stepMs);
    return () => window.clearTimeout(timer);
  }, [first, holdMs, length, shown, stepMs]);

  return shown;
}
