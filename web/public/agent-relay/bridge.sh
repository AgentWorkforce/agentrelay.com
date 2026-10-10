#!/bin/sh
# Agent Relay chat file bridge. Run it in your own terminal, outside your coding
# agent's sandbox, when the agent cannot use the network. The agent writes each
# message to /tmp/agent-relay/<id>/out/*.txt; this forwards it and writes each
# reply to /tmp/agent-relay/<id>/in/. Ctrl+C stops it. Nothing is installed.
set -eu
umask 077
fail() { printf '%s\n' "$*" >&2; exit 1; }

url=${1:-}
case "$url" in
  --help) printf '%s\n' 'Usage: sh bridge.sh <conversation-url>'; exit 0 ;;
  '') fail 'Usage: sh bridge.sh <conversation-url>' ;;
  # Only Agent Relay hosts, plus loopback for local development.
  https://arelay.to/*|https://agentrelay.com/*|http://127.0.0.1:*/*|http://localhost:*/*) ;;
  *) fail 'Expected the conversation URL from your Agent Relay snippet.' ;;
esac
id=${url##*/}
case "$id" in ''|*[!a-zA-Z0-9_-]*) fail 'Invalid conversation id.' ;; esac
command -v curl >/dev/null 2>&1 || fail 'curl is required.'

# The agent's sandbox can write /tmp, so the shared folder only carries
# messages in and replies out. Messages are moved into a private folder
# outside /tmp before they are inspected and sent.
dir=/tmp/agent-relay/$id
private=${XDG_STATE_HOME:-$HOME/.local/state}/agent-relay/$id
mkdir -p "$dir/out" "$dir/in" "$private/sending" "$private/sent" "$private/failed"

# Atomic write: the agent never reads half a reply.
deliver() {
  case "$1" in ''|'(no reply yet'*|'no reply yet'*) return 0 ;; esac
  tmp=$(mktemp "$dir/in/.reply.XXXXXX")
  printf '%s\n' "$1" > "$tmp"
  mv "$tmp" "$dir/in/$(date +%s)-${tmp##*.}.txt"
  printf '<- %s\n' "$1"
}

# post FILE KEY OUT: writes the reply to OUT; fails on network or HTTP errors.
# The key lets the server ignore a retry of a message it already received.
# curl runs as a tracked child so a stopping worker can kill it, instead of
# leaving it waiting on the server where it could swallow a later reply.
post() {
  if [ -n "$2" ]; then
    curl -sS -f --max-time 90 -H "Idempotency-Key: $2" --data-binary "@$1" -o "$3" "$url" &
  else
    curl -sS -f --max-time 90 --data-binary "@$1" -o "$3" "$url" &
  fi
  child_pid=$!
  wait "$child_pid"
}

# nap SECONDS: an interruptible sleep (a trap waits for a foreground sleep).
nap() {
  sleep "$1" &
  child_pid=$!
  wait "$child_pid"
}

# Runs a background worker that stops its own curl or nap when the bridge stops.
worker() {
  (
    child_pid=
    trap 'kill "$child_pid" 2>/dev/null; exit 0' TERM
    "$@"
  ) &
  pids="$pids $!"
}

# A message is sent only if it is a plain file with a single link, so a
# symlink or hard link to another file (an SSH key, say) is never read.
is_plain_file() {
  [ ! -L "$1" ] && [ -n "$(find "$1" -prune -type f -links 1)" ]
}

# A message stays in sending/ until the server accepts it; it is archived in
# sent/ only after a successful POST, and parked in failed/ after 5 attempts.
send_one() {
  name=$1
  file=$private/sending/$name
  out=$private/reply.$name
  attempt=1
  while :; do
    if post "$file" "${name%.txt}" "$out"; then
      mv "$file" "$private/sent/$name"
      deliver "$(cat "$out" 2>/dev/null)"
      rm -f "$out"
      return 0
    fi
    if [ "$attempt" -ge 5 ]; then
      mv "$file" "$private/failed/$name"
      deliver "(message not delivered after 5 attempts: $(head -n 1 "$private/failed/$name" | cut -c 1-80) - send it again)"
      return 0
    fi
    printf 'send failed (attempt %s), retrying: %s\n' "$attempt" "$name" >&2
    nap $((attempt * 5))
    attempt=$((attempt + 1))
  done
}

# Background process ids, tracked explicitly: dash's `jobs` is empty inside $().
pids=
stop() {
  # shellcheck disable=SC2086 # pids is a space-separated list
  kill $pids 2>/dev/null || true
  exit 0
}
trap stop INT TERM HUP

# Keep one wait open so replies sent while the agent is idle still land in in/.
receive_forever() {
  out=$private/reply.wait
  while :; do
    if post /dev/null '' "$out"; then deliver "$(cat "$out" 2>/dev/null)"; nap 1; else nap 3; fi
  done
}
worker receive_forever

# Resume messages a previous run left mid-send.
for f in "$private"/sending/*.txt; do
  if [ -f "$f" ]; then worker send_one "${f##*/}"; fi
done

printf 'Bridging %s <-> %s (Ctrl+C to stop)\n' "$dir" "$url"
while :; do
  for f in "$dir"/out/*.txt; do
    if [ ! -e "$f" ] && [ ! -L "$f" ]; then continue; fi
    name=${f##*/}
    staged=$private/sending/$name
    # The rename claims the file; once moved, the agent can no longer swap it.
    mv "$f" "$staged" || continue
    if ! is_plain_file "$staged"; then
      rm -rf "$staged" || true
      deliver "(message $name was not sent: messages must be plain files)"
      continue
    fi
    if [ ! -s "$staged" ]; then
      mv "$staged" "$private/sent/$name"
      continue
    fi
    printf -- '-> %s\n' "$(head -n 1 "$staged" | cut -c 1-120)"
    worker send_one "$name"
  done
  sleep 1
done
