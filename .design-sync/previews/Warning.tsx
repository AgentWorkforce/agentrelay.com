import { Warning } from 'web';

export function Default() {
  return (
    <Warning>
      <code>full</code> access bypasses dotfile-based protection. Use it only when the YAML policy is
      meant to be the entire permission surface.
    </Warning>
  );
}

export function ApiConstraint() {
  return (
    <Warning>
      Use the <code>rw_…</code> workspace id returned by <code>mount-session</code> for every
      data-plane call — never the request-side app UUID. Passing an app UUID returns{' '}
      <code>404 workspace_not_found</code>.
    </Warning>
  );
}

export function WithLink() {
  return (
    <Warning>
      <code>gateway.relaycast.dev</code> is a legacy host and is no longer routed. Point every client
      at <code>cast.agentrelay.com</code> — see <a href="/docs/migration">Migration</a>.
    </Warning>
  );
}

export function Multiline() {
  return (
    <Warning>
      <p>
        Avoid label collisions. If the readiness label is <code>factory</code>, do not also use{' '}
        <code>factory</code> as the route label for the Factory repository.
      </p>
      <p>
        Use a distinct routing label such as <code>factory-repo</code> instead.
      </p>
    </Warning>
  );
}
