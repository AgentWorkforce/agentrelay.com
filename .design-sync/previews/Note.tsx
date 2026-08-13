import { Note } from 'web';

export function Default() {
  return (
    <Note>
      Agents reconnect automatically. Messages sent while a node is offline are queued and
      delivered once it comes back.
    </Note>
  );
}

export function WithInlineCode() {
  return (
    <Note>
      The workspace key (<code>rk_live_…</code>) is not a super-admin key. Observer streams need an
      observer token (<code>ot_live_…</code>) instead.
    </Note>
  );
}

export function WithLink() {
  return (
    <Note>
      Every message is durable by default. See <a href="/docs/delivery">Delivery guarantees</a> for
      how retries and acknowledgements interact.
    </Note>
  );
}

export function Multiline() {
  return (
    <Note>
      <p>
        A node id is derived from the machine id and a hash of the working directory, so two
        checkouts of the same repo never collide.
      </p>
      <p>
        Changing the working directory produces a new node id. Re-enrol the node if you move a
        workspace on disk.
      </p>
    </Note>
  );
}
