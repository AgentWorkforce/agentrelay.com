import { useEffect, useState } from 'react';

import { type DesktopPlatform, detectDesktopPlatform } from './desktop-downloads';

type UADataNavigator = Navigator & {
  userAgentData?: { getHighEntropyValues(hints: string[]): Promise<{ architecture?: string }> };
};

/**
 * The visitor's desktop platform, read after hydration: `undefined` on the
 * server and until detection runs, `null` on phones, tablets and anything else
 * without a desktop build.
 */
export function useDesktopPlatform(): DesktopPlatform | null | undefined {
  const [platform, setPlatform] = useState<DesktopPlatform | null | undefined>(undefined);

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
