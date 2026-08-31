import type { ReactNode } from 'react';
import { CopyInstructionsButton } from 'web';

/**
 * The component ships behaviour, not skin: it renders a bare <button> plus an
 * unsized copy glyph and takes `className` as its entire styling surface. So
 * every call site brings its own class — these mirror the treatments the site
 * uses, written against the brand tokens.
 */
const css = `
.ds-copy-btn {
  min-height: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0 0.9rem;
  border: none;
  border-radius: 0.55rem;
  font-family: var(--font-geist-sans), sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  background: var(--primary);
  color: var(--bg);
}
.ds-copy-btn svg { width: 0.95rem; height: 0.95rem; flex: 0 0 auto; }
.ds-copy-btn-subtle {
  background: transparent;
  color: var(--fg-muted);
  border: 1px solid var(--line);
}
.ds-copy-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: 520px;
  padding: 0.45rem 0.45rem 0.45rem 1rem;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  background: var(--code-bg);
}
.ds-copy-strip code {
  font-family: var(--font-geist-mono), monospace;
  font-size: 0.85rem;
  color: var(--fg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`;

function Styled({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <style>{css}</style>
      {children}
    </div>
  );
}

/** The openclaw page's share strip: the link to copy, and the button that copies it. */
export function InInstructionStrip() {
  return (
    <Styled>
      <div className="ds-copy-strip">
        <code>https://agentrelay.com/openclaw/skill</code>
        <CopyInstructionsButton className="ds-copy-btn" />
      </div>
    </Styled>
  );
}

export function PrimaryButton() {
  return (
    <Styled>
      <CopyInstructionsButton className="ds-copy-btn" />
    </Styled>
  );
}

export function SubtleButton() {
  return (
    <Styled>
      <CopyInstructionsButton className="ds-copy-btn ds-copy-btn-subtle" />
    </Styled>
  );
}
