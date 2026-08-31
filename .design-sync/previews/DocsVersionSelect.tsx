import type { ReactNode } from 'react';
import { DocsVersionSelect } from 'web';

/**
 * `usePathname()` is shimmed and steerable — the route decides which version
 * the select resolves to, so each cell renders on the route it describes.
 */
function AtPath({ pathname, children }: { pathname: string; children: ReactNode }) {
  (window as { __dsPathname?: string }).__dsPathname = pathname;
  return <>{children}</>;
}

function Rail({ width, children }: { width: number; children: ReactNode }) {
  return (
    <div
      style={{
        width,
        padding: '1.5rem 1.25rem',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--font-geist-sans), sans-serif',
      }}
    >
      {children}
    </div>
  );
}

export function LatestVersion() {
  return (
    <AtPath pathname="/docs/messaging">
      <Rail width={260}>
        <DocsVersionSelect />
      </Rail>
    </AtPath>
  );
}

export function ArchivedVersion() {
  return (
    <AtPath pathname="/docs/7.1.1/spawning-an-agent">
      <Rail width={260}>
        <DocsVersionSelect />
      </Rail>
    </AtPath>
  );
}

/** The table-of-contents column is 200px wide — the select fills whatever it gets. */
export function TableOfContentsRail() {
  return (
    <AtPath pathname="/docs/quickstart">
      <Rail width={200}>
        <DocsVersionSelect />
      </Rail>
    </AtPath>
  );
}
