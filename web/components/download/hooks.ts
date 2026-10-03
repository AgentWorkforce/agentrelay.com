'use client';

import { useEffect, useState } from 'react';
import {
  DESKTOP_LATEST_RELEASE_API,
  detectPlatform,
  getBuild,
  parseLatestRelease,
  recommendedBuild,
  type DesktopBuild,
  type DesktopBuildId,
  type DetectedPlatform,
  type LatestRelease,
  type PlatformSignals,
} from '../../lib/desktop-downloads';

type NavigatorWithUAData = Navigator & {
  userAgentData?: { getHighEntropyValues(hints: string[]): Promise<{ architecture?: string; platform?: string }> };
};

function readWebgl(): Pick<PlatformSignals, 'webglRenderer' | 'webglExtensions'> {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return {};
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const webglRenderer = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : undefined;
    const webglExtensions = gl.getSupportedExtensions() ?? undefined;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { webglRenderer, webglExtensions };
  } catch {
    return {};
  }
}

async function readSignals(): Promise<PlatformSignals> {
  const nav = navigator as NavigatorWithUAData;
  let uaArchitecture: string | undefined;
  try {
    uaArchitecture = (await nav.userAgentData?.getHighEntropyValues(['architecture']))?.architecture;
  } catch {
    uaArchitecture = undefined;
  }
  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    maxTouchPoints: nav.maxTouchPoints,
    uaArchitecture,
    ...readWebgl(),
  };
}

/** The visitor's OS and CPU architecture; null until detection finishes after hydration. */
export function useDetectedPlatform(): DetectedPlatform | null {
  const [detected, setDetected] = useState<DetectedPlatform | null>(null);
  useEffect(() => {
    let live = true;
    readSignals().then((signals) => {
      if (live) setDetected(detectPlatform(signals));
    });
    return () => {
      live = false;
    };
  }, []);
  return detected;
}

export type DownloadChoice = {
  detected: DetectedPlatform | null;
  build: DesktopBuild;
  choose: (id: DesktopBuildId) => void;
  chosenManually: boolean;
};

/** The build to offer: the detected machine's, until the visitor picks another. */
export function useDownloadChoice(): DownloadChoice {
  const detected = useDetectedPlatform();
  const [chosen, setChosen] = useState<DesktopBuildId | null>(null);
  const build = chosen ? getBuild(chosen) : recommendedBuild(detected ?? { os: 'mac', arch: 'arm64', confident: false });
  return { detected, build, choose: setChosen, chosenManually: chosen !== null };
}

/** Version, date and asset sizes of the newest desktop release; null until loaded or if GitHub is unreachable. */
export function useLatestRelease(): LatestRelease | null {
  const [release, setRelease] = useState<LatestRelease | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(DESKTOP_LATEST_RELEASE_API, { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) setRelease(parseLatestRelease(json));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  return release;
}

export function useCopy(): [string | null, (key: string, text: string) => void] {
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 1600);
    return () => clearTimeout(t);
  }, [copied]);
  return [
    copied,
    (key, text) => {
      navigator.clipboard?.writeText(text).then(() => setCopied(key)).catch(() => undefined);
    },
  ];
}
