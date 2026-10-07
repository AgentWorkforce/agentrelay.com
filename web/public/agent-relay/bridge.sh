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
  https://*/*|http://127.0.0.1:*/*|http://localhost:*/*) ;;
  *) fail 'Expected the conversation URL from your Agent Relay snippet.' ;;
esac
id=${url##*/}
case "$id" in ''|*[!a-zA-Z0-9_-]*) fail 'Invalid conversation id.' ;; esac
command -v curl >/dev/null 2>&1 || fail 'curl is required.'

dir=/tmp/agent-relay/$id
mkdir -p "$dir/out" "$dir/in" "$dir/sent"

# Atomic write: the agent never reads half a reply.
deliver() {
  case "$1" in ''|'(no reply yet'*) return 0 ;; esac
  tmp=$(mktemp "$dir/in/.reply.XXXXXX")
  printf '%s\n' "$1" > "$tmp"
  mv "$tmp" "$dir/in/$(date +%s)-${tmp##*.}.txt"
  printf '<- %s\n' "$1"
}

post() { curl -sS --max-time 90 --data-binary "@$1" "$url" || true; }

# Keep one wait open so replies sent while the agent is idle still land in in/.
(
  while :; do
    reply=$(post /dev/null)
    [ -n "$reply" ] || sleep 3
    deliver "$reply"
  done
) &
receiver=$!
trap 'kill "$receiver" 2>/dev/null; exit 0' INT TERM HUP

printf 'Bridging %s <-> %s (Ctrl+C to stop)\n' "$dir" "$url"
while :; do
  for f in "$dir"/out/*.txt; do
    [ -f "$f" ] || continue
    sent=$dir/sent/${f##*/}
    mv "$f" "$sent"
    [ -s "$sent" ] || continue
    printf -- '-> %s\n' "$(cat "$sent")"
    ( deliver "$(post "$sent")" ) &
  done
  sleep 1
done
