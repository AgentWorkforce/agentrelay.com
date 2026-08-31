import { BuildYourOwn } from 'web';

// The closing section of /agents: the persona-skill install commands, the
// collapsed build-an-agent prompt with its copy control, and the two source
// links. Self-contained — framing is all a caller supplies.
export function Default() {
  return <BuildYourOwn />;
}

export function InPageColumn() {
  return (
    <div style={{ maxWidth: 720 }}>
      <BuildYourOwn />
    </div>
  );
}

export function Trimmed() {
  // The section carries 80px of its own top padding for a full page; pulling
  // that back fits the whole flow — install commands, prompt, source links —
  // into one frame.
  return (
    <div style={{ marginTop: -72, overflow: 'hidden' }}>
      <BuildYourOwn />
    </div>
  );
}

export function OnShowcaseSurface() {
  return (
    <div style={{ background: 'var(--showcase-bg)', borderRadius: 20, padding: 8 }}>
      <BuildYourOwn />
    </div>
  );
}
