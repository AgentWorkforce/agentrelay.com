'use client';

import type { ComponentProps, ReactNode } from 'react';

import { DESKTOP_OS_NAMES, desktopStartHref, primaryDesktopAsset } from '../../lib/desktop-downloads';
import { useDesktopPlatform } from '../../lib/use-desktop-platform';
import { DESKTOP_OS_ICONS } from '../home/icons';

type DesktopDownloadCtaProps = Omit<ComponentProps<'a'>, 'href' | 'children'> & {
  iconSize?: number;
  /** What the link says on the server and on devices without a desktop build; it opens the getting-started guide. */
  fallback: ReactNode;
};

/**
 * "Download for macOS / Windows / Linux" with that OS’s logo, opening the
 * download page for the visitor’s build. Phones, tablets and unknown systems keep the
 * getting-started link.
 */
export function DesktopDownloadCta({ iconSize = 18, fallback, ...anchor }: DesktopDownloadCtaProps) {
  const platform = useDesktopPlatform();

  if (!platform) {
    return (
      <a {...anchor} href="/docs/getting-started">
        {fallback}
      </a>
    );
  }

  const Icon = DESKTOP_OS_ICONS[platform.os];
  return (
    <a {...anchor} href={desktopStartHref(primaryDesktopAsset(platform).file)}>
      Download for {DESKTOP_OS_NAMES[platform.os]}
      <Icon size={iconSize} />
    </a>
  );
}
