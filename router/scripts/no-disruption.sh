#!/usr/bin/env bash
# No-disruption proof: replays the request matrix in
# test/no-disruption/harness.ts through the base revision's router and this
# checkout's router with identical production-shaped mocks, and fails on any
# difference on agentrelay.com, www.agentrelay.com, arelay.to or www.arelay.to.
# Then diffs the production `wrangler deploy --dry-run` output (bindings and
# routes; nothing is uploaded) between base and head.
#
#   router/scripts/no-disruption.sh            # base = merge-base with origin/main
#   BASE_REF=<commit> router/scripts/no-disruption.sh
#
# The base revision is checked out as a git worktree next to this repo
# (<repo>-no-disruption-base) and reused/updated on later runs.
set -euo pipefail

router_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo="$(git -C "$router_dir" rev-parse --show-toplevel)"
base_ref="${BASE_REF:-$(git -C "$repo" merge-base HEAD origin/main)}"
base_dir="${NO_DISRUPTION_BASE_DIR:-${repo}-no-disruption-base}"

if [ -d "$base_dir" ]; then
  git -C "$base_dir" checkout -q --detach "$base_ref"
else
  git -C "$repo" worktree add -q --detach "$base_dir" "$base_ref"
fi
echo "base: $(git -C "$base_dir" rev-parse --short HEAD)  head: $(git -C "$repo" rev-parse --short HEAD)"

out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT

cd "$router_dir"
status=0
NO_DISRUPTION_BASE_ROUTER="$base_dir/router/index.ts" NO_DISRUPTION_REPORT="$out/report.txt" \
  npx vitest run test/no-disruption.test.ts || status=$?
echo "--- request matrix: base vs head"
cat "$out/report.txt" 2>/dev/null || echo "(no report written)"

# Production wrangler config, base vs head. `--env=""` targets the top-level
# (production) config explicitly, as the deploy workflows do implicitly.
wrangler="$repo/node_modules/.bin/wrangler"
dry_run() {
  (cd "$1" && "$wrangler" deploy --dry-run --env="" --outdir "$2" 2>&1) \
    | sed -n '/Your Worker has access/,/--dry-run: exiting/p'
}
dry_run "$base_dir/router" "$out/base-bundle" > "$out/base.txt"
dry_run "$router_dir" "$out/head-bundle" > "$out/head.txt"
echo "--- prod dry-run bindings: base vs head"
cat "$out/head.txt"
diff -u "$out/base.txt" "$out/head.txt" && echo "(identical)"
# The dry run prints bindings and vars, not routes, so also diff the fully
# resolved production config (wrangler's own reader, `env: ""`), which
# includes routes, compatibility settings and every binding.
resolved() {
  # Runs from this checkout so `wrangler` resolves from its node_modules.
  (cd "$router_dir" && node --input-type=module - "$1/wrangler.jsonc" <<'NODE'
    import { unstable_readConfig } from "wrangler";
    const config = unstable_readConfig({ config: process.argv[2], env: "" }, { hideWarnings: true });
    // File-location fields differ between checkouts and are not deployed.
    config.main = config.main && config.main.split("/router/").pop();
    for (const key of ["configPath", "userConfigPath", "topLevelName", "definedEnvironments", "targetEnvironment"]) delete config[key];
    console.log(JSON.stringify(config, null, 2));
NODE
  )
}
resolved "$base_dir/router" > "$out/base-config.json"
resolved "$router_dir" > "$out/head-config.json"
echo "--- resolved prod wrangler config: base vs head"
diff -u "$out/base-config.json" "$out/head-config.json" || true
exit "$status"
