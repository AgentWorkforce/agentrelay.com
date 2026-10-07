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

dir=/tmp/agent-relay/$id
mkdir -p "$dir/out" "$dir/sending" "$dir/in" "$dir/sent" "$dir/failed"

# Atomic write: the agent never reads half a reply.
deliver() {
  case "$1" in ''|'(no reply yet'*) return 0 ;; esac
  tmp=$(mktemp "$dir/in/.reply.XXXXXX")
  printf '%s\n' "$1" > "$tmp"
  mv "$tmp" "$dir/in/$(date +%s)-${tmp##*.}.txt"
  printf '<- %s\n' "$1"
}

# post FILE [KEY]: prints the reply; fails on network or HTTP errors. The key
# lets the server ignore a retry of a message it already received.
post() {
  if [ -n "${2:-}" ]; then
    curl -sS -f --max-time 90 -H "Idempotency-Key: $2" --data-binary "@$1" "$url"
  else
    curl -sS -f --max-time 90 --data-binary "@$1" "$url"
  fi
}

# A message stays in sending/ until the server accepts it; it is archived in
# sent/ only after a successful POST, and parked in failed/ after 5 attempts.
send_one() {
  name=$1
  file=$dir/sending/$name
  attempt=1
  while :; do
    if reply=$(post "$file" "${name%.txt}"); then
      mv "$file" "$dir/sent/$name"
      deliver "$reply"
      return 0
    fi
    if [ "$attempt" -ge 5 ]; then
      mv "$file" "$dir/failed/$name"
      deliver "(message not delivered after 5 attempts: $(head -c 80 "$dir/failed/$name") - send it again)"
      return 0
    fi
    printf 'send failed (attempt %s), retrying: %s\n' "$attempt" "$name" >&2
    sleep $((attempt * 5))
    attempt=$((attempt + 1))
  done
}

# Resume messages a previous run left mid-send.
for f in "$dir"/sending/*.txt; do
  if [ -f "$f" ]; then mv "$f" "$dir/out/"; fi
done

# Keep one wait open so replies sent while the agent is idle still land in in/.
(
  while :; do
    if reply=$(post /dev/null); then deliver "$reply"; else sleep 3; fi
  done
) &
receiver=$!
trap 'kill "$receiver" 2>/dev/null; exit 0' INT TERM HUP

printf 'Bridging %s <-> %s (Ctrl+C to stop)\n' "$dir" "$url"
while :; do
  for f in "$dir"/out/*.txt; do
    [ -f "$f" ] || continue
    name=${f##*/}
    if [ ! -s "$f" ]; then
      mv "$f" "$dir/sent/$name"
      continue
    fi
    # The rename claims the file, so each message has exactly one sender.
    mv "$f" "$dir/sending/$name" || continue
    printf -- '-> %s\n' "$(cat "$dir/sending/$name")"
    send_one "$name" &
  done
  sleep 1
done
