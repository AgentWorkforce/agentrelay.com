#!/bin/sh
# Native Relay Connect bootstrap. Downloads only; create/join starts the relay.
set -eu
umask 077
fail() { printf '%s\n' "$*" >&2; exit 1; }
case "${1:-}" in
  --help) printf '%s\n' 'Install native Relay Connect without Node, npm, sudo or the desktop GUI.' 'Usage: sh install.sh'; exit 0 ;;
  '') ;;
  *) fail 'Usage: sh install.sh' ;;
esac
for tool in curl uname mktemp tar mkdir chmod mv awk cat rm; do
  command -v "$tool" >/dev/null 2>&1 || fail "Missing prerequisite: $tool"
done
case "$(uname -s)" in Darwin) platform=macOS;; Linux) platform=Linux;; *) fail 'Relay Connect supports macOS and Linux.';; esac
case "$(uname -m)" in arm64|aarch64) arch=arm64;; x86_64|amd64) arch=x64;; *) fail 'Unsupported CPU architecture.';; esac
if command -v sha256sum >/dev/null 2>&1; then hash_tool=sha256sum
elif command -v shasum >/dev/null 2>&1; then hash_tool=shasum
else fail 'A SHA-256 utility (sha256sum or shasum) is required.'; fi
if [ "$platform" = macOS ]; then command -v codesign >/dev/null 2>&1 || fail 'codesign is required.'; fi
# latest is resolved to one immutable release by curl's effective URL. Never
# download the archive and checksum from independently moving latest aliases.
release=https://github.com/AgentWorkforce/relay-desktop-releases/releases/latest
resolved=$(curl --proto '=https' --proto-redir '=https' -fsSL --max-time 30 -o /dev/null -w '%{url_effective}' "$release")
case "$resolved" in https://github.com/AgentWorkforce/relay-desktop-releases/releases/tag/v*) version=${resolved##*/};; *) fail 'Could not resolve the official probe release.';; esac
case "$version" in *[!a-zA-Z0-9._-]*) fail 'Invalid release version.';; esac
asset="AgentRelay-$platform-$arch-probe.tar.gz"
base="https://github.com/AgentWorkforce/relay-desktop-releases/releases/download/$version"
# Stage beside the install so the probe's checks run on a filesystem that must
# allow execution anyway; a noexec $TMPDIR would otherwise abort the install.
root="$HOME/.local/lib/agent-relay/connect"
mkdir -p "$root"
tmp=$(mktemp -d "$root/.install.XXXXXX")
staged=
cleanup() {
  rm -rf "$tmp"
  if [ -n "$staged" ]; then rm -f "$staged"; fi
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
curl --proto '=https' --proto-redir '=https' -fsSL --max-time 120 --max-filesize 104857600 "$base/$asset" -o "$tmp/probe.tar.gz"
curl --proto '=https' --proto-redir '=https' -fsSL --max-time 30 --max-filesize 1024 "$base/$asset.sha256" -o "$tmp/checksum"
expected=$(awk 'NR == 1 { print $1 }' "$tmp/checksum")
case "$expected" in ''|*[!a-fA-F0-9]*) fail 'Invalid probe checksum.';; esac
[ "${#expected}" = 64 ] || fail 'Invalid probe checksum.'
if [ "$hash_tool" = sha256sum ]; then actual=$(sha256sum "$tmp/probe.tar.gz" | awk '{print $1}')
else actual=$(shasum -a 256 "$tmp/probe.tar.gz" | awk '{print $1}'); fi
[ "$actual" = "$expected" ] || fail 'Checksum mismatch; existing installation was not changed.'
# Extract only the expected helper, never arbitrary archive paths or symlinks.
tar -xOf "$tmp/probe.tar.gz" agent_relay/helpers/agent-relay-probe > "$tmp/probe"
chmod 755 "$tmp/probe"
if [ "$platform" = macOS ]; then
  codesign --verify --strict '-R=anchor apple generic and certificate 1[field.1.2.840.113635.100.6.2.6] exists and certificate leaf[field.1.2.840.113635.100.6.1.13] exists and certificate leaf[subject.OU] = "QUJ7SA6X8X"' "$tmp/probe" || fail 'Probe signature verification failed.'
fi
# Older releases predate the native commands. Fail before changing any install.
"$tmp/probe" --version >/dev/null 2>&1 || fail 'Could not execute the probe on this system. Check OS, architecture and Linux libc compatibility.'
for command in create join send status leave end; do
  "$tmp/probe" connect "$command" --help >/dev/null 2>&1 || fail "This release does not support native Connect command: $command. Retry after a compatible probe is published."
done
# Keep Connect private: relay/agent-relay belong to the orchestration CLI,
# and ~/.local/bin/agent-relay-probe belongs to the desktop-managed copy.
target="$root/agent-relay-probe"
[ ! -d "$target" ] || fail 'The probe installation target is a directory; existing installation was not changed.'
# Stage on the destination filesystem; rename never alters a running executable.
staged=$(mktemp "$root/.agent-relay-probe.XXXXXX")
if ! cat "$tmp/probe" > "$staged" || ! chmod 755 "$staged"; then
  rm -f "$staged"; fail 'Could not stage the probe.'
fi
mv -f "$staged" "$target"
staged=
printf '%s\n' 'Relay Connect installed. No relay process has been started.' \
  'Create: ~/.local/lib/agent-relay/connect/agent-relay-probe connect create --task "Work with another agent"' \
  'Join:   ~/.local/lib/agent-relay/connect/agent-relay-probe connect join https://agentrelay.com/connect/INVITE'
