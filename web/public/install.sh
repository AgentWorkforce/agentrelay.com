#!/bin/sh
# Installs the native Agent Relay Probe. Node/npm are not used.
set -eu
umask 077
SITE_URL=https://agentrelay.com
ACCOUNT=
WORKSPACE=
IMPORT_CHOICE=
FORCE_LOGIN=
ACK_SCHEDULES=
ONCE=
FOREGROUND=
NO_START=
fail() { printf '%s\n' "$1" >&2; exit 1; }
while [ "$#" -gt 0 ]; do
  case "$1" in
    --site-url|--account|--workspace)
      [ "$#" -ge 2 ] || fail "Missing option value."
      case "$1" in --site-url) SITE_URL=$2;; --account) ACCOUNT=$2;; --workspace) WORKSPACE=$2;; esac
      shift 2 ;;
    --include-existing|--new-sessions-only)
      [ -z "$IMPORT_CHOICE" ] || fail "Choose one session import option."
      IMPORT_CHOICE=$1; shift ;;
    --force-login) FORCE_LOGIN=1; shift ;;
    --acknowledge-uninspected-schedules) ACK_SCHEDULES=1; shift ;;
    --once) ONCE=1; shift ;;
    --foreground) FOREGROUND=1; shift ;;
    --no-start) NO_START=1; shift ;;
    --help)
      printf '%s\n' 'Installs agent-relay-probe, signs in to Cloud, and starts background session collection.' \
        'Options: --site-url URL --workspace ID --account ID --include-existing | --new-sessions-only' \
        '         --force-login --foreground --once --no-start'
      exit 0 ;;
    *) fail "Unknown installer option." ;;
  esac
done
SITE_URL=${SITE_URL%/}
case "$SITE_URL" in
  https://agentrelay.com) CURL_PROTOCOL='=https' ;;
  http://127.0.0.1:*|http://localhost:*|http://\[::1\]:*)
    local_port=${SITE_URL##*:}
    case "$local_port" in ''|*[!0-9]*) fail "Local site URL must use a numeric loopback port.";; esac
    [ "$local_port" -ge 1024 ] && [ "$local_port" -le 65535 ] || fail "Invalid local port."
    CURL_PROTOCOL='=http' ;;
  *) fail "Use https://agentrelay.com or an explicit HTTP loopback development origin." ;;
esac
case "$(uname -s)" in Darwin) platform=darwin;; Linux) platform=linux;; *) fail "The probe installer currently supports macOS and Linux.";; esac
case "$(uname -m)" in arm64|aarch64) platform="$platform-arm64";; x86_64|amd64) platform="$platform-x64";; *) fail "Unsupported processor architecture.";; esac
command -v curl >/dev/null 2>&1 || fail "curl is required."
if command -v sha256sum >/dev/null 2>&1; then hash_tool=sha256sum
elif command -v shasum >/dev/null 2>&1; then hash_tool=shasum
else fail "A SHA-256 tool (sha256sum or shasum) is required."; fi
probe_tmp=$(mktemp -d "${TMPDIR:-/tmp}/agent-relay-probe.XXXXXX")
trap 'rm -rf "$probe_tmp"' EXIT HUP INT TERM
download="$SITE_URL/downloads/agent-relay-probe/$platform/agent-relay-probe"
printf '%s\n' "Downloading Agent Relay Probe for $platform…"
curl --proto "$CURL_PROTOCOL" --max-time 120 --max-filesize 104857600 -fsS "$download" -o "$probe_tmp/agent-relay-probe" || fail "The native probe build is not available on this site for your platform."
curl --proto "$CURL_PROTOCOL" --max-time 30 --max-filesize 1024 -fsS "$download.sha256" -o "$probe_tmp/checksum" || fail "Could not download the probe checksum."
expected=$(awk 'NR == 1 { print $1 }' "$probe_tmp/checksum")
case "$expected" in ''|*[!a-fA-F0-9]*) fail "Invalid probe checksum.";; esac
[ "${#expected}" -eq 64 ] || fail "Invalid probe checksum."
if [ "$hash_tool" = sha256sum ]; then actual=$(sha256sum "$probe_tmp/agent-relay-probe" | awk '{print $1}')
else actual=$(shasum -a 256 "$probe_tmp/agent-relay-probe" | awk '{print $1}'); fi
[ "$actual" = "$expected" ] || fail "Probe checksum verification failed. The existing installation was not changed."
probe_bin_dir=${AGENT_RELAY_PROBE_BIN_DIR:-"$HOME/.local/bin"}
mkdir -p "$probe_bin_dir"
probe_staged=$(mktemp "$probe_bin_dir/.agent-relay-probe.XXXXXX")
if ! cp "$probe_tmp/agent-relay-probe" "$probe_staged" || ! chmod 755 "$probe_staged"; then
  rm -f "$probe_staged"; fail "Could not install the probe."
fi
mv -f "$probe_staged" "$probe_bin_dir/agent-relay-probe"
printf '%s\n' "Installed agent-relay-probe."
[ -z "$NO_START" ] || exit 0
set -- cloud install --site-url "$SITE_URL"
[ -z "$WORKSPACE" ] || set -- "$@" --workspace "$WORKSPACE"
[ -z "$ACCOUNT" ] || set -- "$@" --account "$ACCOUNT"
[ -z "$IMPORT_CHOICE" ] || set -- "$@" "$IMPORT_CHOICE"
[ -z "$FORCE_LOGIN" ] || set -- "$@" --force-login
[ -z "$ACK_SCHEDULES" ] || set -- "$@" --acknowledge-uninspected-schedules
[ -z "$ONCE" ] || set -- "$@" --once
[ -z "$FOREGROUND" ] || set -- "$@" --foreground
rm -rf "$probe_tmp"
trap - EXIT HUP INT TERM
if [ -n "$IMPORT_CHOICE" ]; then exec "$probe_bin_dir/agent-relay-probe" "$@"
elif [ -r /dev/tty ]; then exec "$probe_bin_dir/agent-relay-probe" "$@" </dev/tty
else fail "Run interactively, or choose --include-existing or --new-sessions-only."; fi
