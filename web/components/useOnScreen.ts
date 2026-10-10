'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * Whether the element is in (or near) the viewport. Timer-driven previews use
 * it to stop re-rendering while scrolled away and pick up where they left off
 * when they come back, which is indistinguishable on screen but keeps the main
 * thread quiet. Starts `true` so nothing waits on the first observer callback,
 * and stays `true` where IntersectionObserver is unavailable.
 */
export function useOnScreen(ref: RefObject<Element | null>, rootMargin = '200px 0px') {
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return onScreen;
}
