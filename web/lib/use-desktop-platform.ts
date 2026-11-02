import { useEffect, useState } from 'react';

import { type DesktopPlatform, detectDesktopPlatform } from './desktop-downloads';

type UADataNavigator = Navigator & {
  userAgentData?: { getHighEntropyValues(hints: string[]): Promise<{ architecture?: string }> };
};

/**
 * The visitor's desktop platform, read after hydration. `null` on the server,
 * before detection, and on phones, tablets and anything else without a desktop build.
 */
export function useDesktopPlatform(): DesktopPlatform | null {
  const [platform, setPlatform] = useState<DesktopPlatform | null>(null);

  useEffect(() => {
    let cancelled = false;
    const nav = navigator as UADataNavigator;
    const detect = (architecture?: string) => {
      if (!cancelled) {
        setPlatform(detectDesktopPlatform(nav.userAgent, { architecture, touchPoints: nav.maxTouchPoints }));
      }
    };
    detect();
    nav.userAgentData
      ?.getHighEntropyValues(['architecture'])
      .then(({ architecture }) => detect(architecture || undefined))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return platform;
}
