#!/usr/bin/env bash
#
# Vendor the integration provider logos into public/integration-logos/ so the
# /agents gallery and the Relayfile integrations page serve them as static
# assets instead of hotlinking Nango on every render.
#
# Source of truth: Nango's template logos, the same convention pear uses to
# resolve a provider icon (see pear/src/main/integrations.ts nangoTemplateLogoUrl).
#
# Three things this script has to defend against:
#
#   1. Nango answers 200 with its SPA HTML shell for slugs it has no logo for,
#      so a status check is not enough — we sniff the body for an SVG root and
#      skip anything else. Providers with no logo fall through to a text chip
#      in the UI; nothing here needs to change when that happens.
#   2. Our provider id is not always Nango's slug (gmail → google-mail, x →
#      twitter, teams → microsoft-teams, …). Those are mapped in NANGO_SLUG.
#   3. granola's logo is a ~525KB SVG wrapping a base64 PNG — absurd for a 16px
#      mark — so it is unwrapped and downscaled to a small PNG instead.
#
# Re-running is safe and idempotent.
#
# NOTE: destination is public/integration-logos, NOT public/integrations —
# top-level public/ folders become CloudFront → S3 behaviors under SST/OpenNext
# and would shadow any same-named page route (see sync-agent-assets.sh).
#
# Usage: web/scripts/sync-integration-logos.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST="$WEB_DIR/public/integration-logos"
BASE="https://app.nango.dev/images/template-logos"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Every relayfile adapter (packages/* in AgentWorkforce/relayfile-adapters),
# plus the extra providers the agents gallery references.
SLUGS=(
  airtable asana azure-blob box calendly clickup cloudflare confluence daytona
  docker-hub dropbox fathom gcp gcs github gitlab gmail google-calendar
  google-drive granola hacker-news hubspot intercom jira linear mailgun mixpanel
  neon notion npm onedrive pipedrive postgres recall reddit redis s3 salesforce
  segment sendgrid sharepoint shopify slack spotify stripe teams telegram x
  zendesk
)

# provider id -> Nango template-logo slug, where they differ.
nango_slug() {
  case "$1" in
    azure-blob) echo 'azure-blob-storage' ;;
    gmail)      echo 'google-mail' ;;
    onedrive)   echo 'one-drive' ;;
    recall)     echo 'recall-ai' ;;
    sharepoint) echo 'sharepoint-online' ;;
    teams)      echo 'microsoft-teams' ;;
    x)          echo 'twitter' ;;
    *)          echo "$1" ;;
  esac
}

mkdir -p "$DEST"
echo "Syncing integration logos from $BASE -> $DEST"
missing=()

for slug in "${SLUGS[@]}"; do
  remote="$(nango_slug "$slug")"
  raw="$TMP/$slug.svg"

  if ! curl -sfL "$BASE/$remote.svg" -o "$raw"; then
    missing+=("$slug")
    rm -f "$DEST/$slug.svg"
    continue
  fi

  # Nango serves its app shell for unknown slugs — only keep real SVGs.
  if ! head -c 512 "$raw" | grep -qi '<svg\|<?xml'; then
    missing+=("$slug")
    rm -f "$DEST/$slug.svg"
    continue
  fi

  # granola: unwrap the embedded raster rather than shipping a 525KB SVG.
  if [ "$slug" = 'granola' ]; then
    if python3 - "$raw" "$TMP/granola.png" <<'PY'
import base64, re, sys
svg = open(sys.argv[1], encoding='utf-8').read()
m = re.search(r'data:image/png;base64,([A-Za-z0-9+/=]+)', svg)
if not m:
    sys.exit(1)
open(sys.argv[2], 'wb').write(base64.b64decode(m.group(1)))
PY
    then
      sips -Z 160 "$TMP/granola.png" --out "$DEST/granola.png" >/dev/null 2>&1
      rm -f "$DEST/granola.svg"
      echo "  granola.png (unwrapped from svg)"
      continue
    fi
    echo "  WARN: granola svg had no embedded raster; keeping svg as-is" >&2
  fi

  cp "$raw" "$DEST/$slug.svg"
  echo "  $slug.svg"
done

if [ ${#missing[@]} -gt 0 ]; then
  echo
  echo "No logo at source (these render as text chips): ${missing[*]}"
fi
echo "Done."
