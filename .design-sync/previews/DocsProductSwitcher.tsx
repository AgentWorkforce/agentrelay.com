import { useEffect, useRef, type ReactNode } from 'react';
import { DocsProductSwitcher } from 'web';

/** Mirrors the top of `docs.module.css .sidebarCol`, where the switcher sits. */
function SidebarRail({ children, height }: { children: ReactNode; height?: number }) {
  return (
    <div
      style={{
        width: 260,
        height,
        padding: '1.5rem 1.25rem',
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

export function RelayDocs() {
  return (
    <SidebarRail>
      <DocsProductSwitcher activeId={null} />
    </SidebarRail>
  );
}

export function RelayfileDocs() {
  return (
    <SidebarRail>
      <DocsProductSwitcher activeId="file" />
    </SidebarRail>
  );
}

export function FactoryDocs() {
  return (
    <SidebarRail>
      <DocsProductSwitcher activeId="factory" />
    </SidebarRail>
  );
}

export function OpenMenu() {
  const ref = useRef<HTMLDivElement | null>(null);

  // The switcher is a native <details> with no `open` prop — the menu state
  // lives in the DOM, so the open list is only reachable by opening it.
  useEffect(() => {
    const details = ref.current?.querySelector('details');
    if (details) details.open = true;
  }, []);

  return (
    <SidebarRail height={490}>
      <div ref={ref}>
        <DocsProductSwitcher activeId="file" />
      </div>
    </SidebarRail>
  );
}
