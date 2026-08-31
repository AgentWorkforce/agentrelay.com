import type { ReactNode } from 'react';
import { DocsNav } from 'web';

/**
 * `usePathname()` is shimmed and steerable. Writing `window.__dsPathname`
 * during render — immediately before the nav renders — puts DocsNav on a real
 * route, which is what selects the nav tree (relay / product / archived) and
 * the active item.
 */
function AtPath({ pathname, children }: { pathname: string; children: ReactNode }) {
  (window as { __dsPathname?: string }).__dsPathname = pathname;
  return <>{children}</>;
}

/** Mirrors `docs.module.css .sidebarCol` — the scrolling rail the nav lives in. */
function SidebarRail({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 260,
        // `.sidebarCol` is `height: calc(100vh - 88px)`; maxHeight lets a short
        // product nav close up instead of stranding empty rail.
        maxHeight: 812,
        overflowY: 'auto',
        padding: '1.5rem 1.25rem 2rem',
        borderRight: '1px solid var(--line)',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--font-geist-sans), sans-serif',
      }}
    >
      {children}
    </div>
  );
}

export function RelayDocsSidebar() {
  return (
    <AtPath pathname="/docs/channels">
      <SidebarRail>
        <DocsNav />
      </SidebarRail>
    </AtPath>
  );
}

export function ProductDocsSidebar() {
  return (
    <AtPath pathname="/docs/agents/build">
      <SidebarRail>
        <DocsNav />
      </SidebarRail>
    </AtPath>
  );
}

export function ArchivedVersion() {
  return (
    <AtPath pathname="/docs/7.1.1/permissions">
      <SidebarRail>
        <DocsNav />
      </SidebarRail>
    </AtPath>
  );
}

export function MobileMenu() {
  return (
    <AtPath pathname="/docs/threads">
      <div
        style={{
          width: 360,
          // `.mobileMenu` is `max-height: min(72vh, calc(100vh - 88px))`.
          maxHeight: 648,
          overflowY: 'auto',
          padding: '6px 14px 16px',
          borderRadius: 14,
          border: '1px solid var(--nav-border)',
          background: 'var(--nav-solid-bg)',
          color: 'var(--nav-fg)',
          boxShadow: '0 8px 24px var(--nav-shadow)',
          fontFamily: 'var(--font-geist-sans), sans-serif',
        }}
      >
        <DocsNav variant="mobileMenu" />
      </div>
    </AtPath>
  );
}
