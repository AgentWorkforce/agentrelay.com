import { resolveAgentSettings, type AgentRole, type FlowAgentSettings } from './flow-agent-settings';
import { isCodingAgent } from './flow-agents';

export const WORKFLOWS = [
  { id: 'traditional', label: 'Traditional', description: 'Plan first, challenge the code, and keep the final say.', steps: ['Plan', 'Review plan', 'Implement', 'Run checks', 'Open PR', '2× adversarial review', 'Human gate'] },
  { id: 'prototype', label: 'Prototype and build', description: 'Explore three approaches, then build from the best of each.', steps: ['3 implementations', 'Compare', 'Build', 'Run checks', 'Open PR', 'Review', 'Human gate'] },
  { id: 'simple', label: 'Simple', description: 'One agent takes the ticket straight to implementation.', steps: ['Implement', 'Run checks', 'Open PR', 'Human gate'] },
] as const;

export type WorkflowStep = typeof WORKFLOWS[number]['steps'][number];
export const WORKFLOW_STEP_DETAILS: Record<WorkflowStep, string> = {
  'Plan': 'Read the ticket and repository, then outline the changes to make.',
  'Review plan': 'Challenge the assumptions and fill gaps before any code is written.',
  'Implement': 'Turn the ticket into a working change and add regression tests.',
  '3 implementations': 'Build three different solutions in parallel. Each gets its own isolated workspace.',
  'Compare': 'Compare the code and test results, then identify the strongest ideas from each solution.',
  'Build': 'Use the comparison to combine the strongest ideas into one final implementation.',
  'Run checks': 'Run the repository’s own checks, the way its CI does. Repair missing setup, and compare any failure with the starting commit.',
  'Open PR': 'Push the branch and open a pull request with a summary of the changes.',
  '2× adversarial review': 'Challenge the code in two fresh reviews, fixing and retesting issues between rounds.',
  'Review': 'Check the final code against the ticket and comparison. Stop if issues remain.',
  'Human gate': 'Stop for your review. You decide when to merge the pull request in GitHub.',
};

export type WorkflowId = (typeof WORKFLOWS)[number]['id'];

/** Single-quotes a value for `sh`, so a generated command can carry any text. */
const shq = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

/**
 * Where the check step keeps everything it writes. None of it belongs in the
 * change: FLOW_EXCLUDE_WORKING_FILES_COMMAND hides it from `git add -A`, and
 * FLOW_DROP_WORKING_FILES_COMMAND removes it from the branch if an agent
 * committed it anyway.
 */
export const FLOW_CHECK_SCRIPT = '.relayflow/check.sh';

/**
 * Reads `package.json` with Node, which every sandbox has because it has npm.
 * A missing file, unparseable JSON, or an empty/absent `test` script all exit
 * non-zero so the caller can skip instead of running a package manager.
 */
const HAS_TEST_SCRIPT = 'node -e \'const f=require("fs");let p;try{p=JSON.parse(f.readFileSync("package.json","utf8"))}catch{process.exit(1)}const t=(p.scripts||{}).test;process.exit(t&&String(t).trim()?0:1)\'';

/**
 * The JavaScript default: installs dependencies with the repository's own
 * package manager (chosen by lockfile) and runs its `test` script. Cloud
 * sandboxes ship npm and corepack but not pnpm or Yarn, so a bare `npm test`
 * fails for pnpm/Yarn repositories whose test script calls the package manager
 * (AgentWorkforce/burn#540). Yarn Berry (`.yarnrc.yml`) installs with
 * `--immutable`; Yarn Classic with `--frozen-lockfile`. `npm ci` runs only with
 * a lockfile: the old `npm ci || npm install` chain hid npm ci failures behind
 * a second install.
 */
const NODE_CHECK_LINES = [
  'if [ -f pnpm-lock.yaml ]; then pm=pnpm; elif [ -f yarn.lock ]; then pm=yarn; elif [ -f bun.lock ] || [ -f bun.lockb ]; then pm=bun; else pm=npm; fi',
  'if [ "$pm" = pnpm ] || [ "$pm" = yarn ]; then if ! command -v "$pm" >/dev/null 2>&1; then mkdir -p "$HOME/.local/bin" && { corepack enable --install-directory "$HOME/.local/bin" "$pm" >/dev/null 2>&1 || true; } && PATH="$HOME/.local/bin:$PATH" && export PATH; fi; COREPACK_ENABLE_DOWNLOAD_PROMPT=0 && export COREPACK_ENABLE_DOWNLOAD_PROMPT; fi',
  'if ! command -v "$pm" >/dev/null 2>&1; then echo "relayflow: this repository\'s lockfile requires $pm, which is not installed and could not be provisioned." >&2; exit 1; fi',
  'echo "relayflow: installing dependencies and running tests with $pm"',
  'if [ "$pm" = pnpm ]; then pnpm install --frozen-lockfile && pnpm test; elif [ "$pm" = yarn ]; then { if [ -f .yarnrc.yml ]; then yarn install --immutable; else yarn install --frozen-lockfile; fi; } && yarn test; elif [ "$pm" = bun ]; then bun install --frozen-lockfile && bun run test; else { if [ -f package-lock.json ]; then npm ci; else npm install; fi; } && npm test; fi',
];

const DEFAULT_SCRIPT_HEADER = '# Written by relayflow from the files in this repository. Edit it to match how CI runs the tests.';

/**
 * Settles how this repository checks itself, as a script at FLOW_CHECK_SCRIPT,
 * before any code changes.
 *
 * The generated flow used to run one hard-coded recipe — `npm ci && npm test`
 * behind an npm/pnpm/Yarn/Bun detector — and treat its exit code as the whole
 * verdict. That failed both ways in production. AgentWorkforce/cloud run
 * acbe30c1 died at the test step, whatever the ticket: cloud's suite asserts
 * that `@cloud/core` is built (`npm run -w @cloud/core build`), cloud's CI does
 * that before testing, and the recipe did not. A Go, Rust or Python repository
 * got "no package.json; skipping tests" and was never tested at all. No fixed
 * recipe knows a repository's setup, so the script comes from the repository.
 *
 * By the time this runs the script may already exist — the author's
 * `checkCommand`, a `.relayflow/check.sh` the repository commits, or one the
 * discovery agent wrote from its CI configuration — and then it is used as it
 * is (`script`). Otherwise the ecosystem default is written into it
 * (`default`): a Makefile or justfile `test` target first, because that is the
 * repository's own entry point, then Node, Cargo, Go, Python, Ruby, Maven,
 * Gradle, .NET and Mix. Writing the default into the file rather than running
 * it inline is what lets the repair agent add a missing setup step to it, and
 * lets the base-commit comparison run exactly the same recipe. `none` means
 * there is nothing to run, and the pull request says so.
 *
 * One token on stdout, prose on stderr, exit 0 on every path: `f.run` has no
 * retry policy, so a non-zero exit is retried until the run dies with
 * `retries_exhausted`.
 */
export const FLOW_CHECK_RESOLVE_COMMAND = [
  'mkdir -p .relayflow',
  'has_test_target() { for f in GNUmakefile makefile Makefile; do if [ -f "$f" ] && grep -Eq \'^test[[:space:]]*:\' "$f"; then return 0; fi; done; return 1; }',
  'eco=; cmd=',
  `if [ -s ${FLOW_CHECK_SCRIPT} ]; then eco=script`
    + `; elif has_test_target; then eco=make; cmd='make test'`
    + `; elif [ -f justfile ] && grep -Eq '^test([[:space:]]|:)' justfile; then eco=just; cmd='just test'`
    + `; elif [ -f package.json ] && ${HAS_TEST_SCRIPT} >/dev/null 2>&1; then eco=node`
    + `; elif [ -f Cargo.toml ]; then eco=cargo; cmd='cargo test'`
    + `; elif [ -f go.mod ]; then eco=go; cmd='go test ./...'`
    + `; elif [ -f pyproject.toml ] || [ -f setup.py ] || [ -f setup.cfg ] || [ -f requirements.txt ] || [ -f pytest.ini ] || [ -f tox.ini ]; then eco=python; if [ -f uv.lock ]; then cmd='uv run pytest'; elif [ -f poetry.lock ]; then cmd='poetry install --no-interaction && poetry run pytest'; elif [ -f requirements.txt ]; then cmd='python3 -m pip install -r requirements.txt && python3 -m pytest'; else cmd='python3 -m pytest'; fi`
    + `; elif [ -f Gemfile ]; then eco=ruby; if [ -d spec ]; then cmd='bundle install && bundle exec rspec'; else cmd='bundle install && bundle exec rake test'; fi`
    + `; elif [ -f pom.xml ]; then eco=maven; if [ -x mvnw ]; then cmd='./mvnw -B test'; else cmd='mvn -B test'; fi`
    + `; elif [ -f build.gradle ] || [ -f build.gradle.kts ]; then eco=gradle; if [ -x gradlew ]; then cmd='./gradlew test'; else cmd='gradle test'; fi`
    + `; elif [ -n "$(find . -maxdepth 1 \\( -name '*.sln' -o -name '*.csproj' -o -name '*.fsproj' \\) -print 2>/dev/null | head -n 1)" ]; then eco=dotnet; cmd='dotnet test'`
    + `; elif [ -f mix.exs ]; then eco=elixir; cmd='mix deps.get && mix test'`
    + '; fi',
  `if [ "$eco" = script ]; then echo "relayflow: checking with the repository's own ${FLOW_CHECK_SCRIPT}." >&2; echo script`
    + `; elif [ -z "$eco" ]; then echo "relayflow: found no way to run this repository's tests: no check command, no test target and no recognised project file." >&2; echo none`
    + `; elif [ "$eco" = node ]; then printf '%s\\n' ${[DEFAULT_SCRIPT_HEADER, 'set -e', ...NODE_CHECK_LINES].map(shq).join(' ')} > ${FLOW_CHECK_SCRIPT}; echo "relayflow: wrote the Node default to ${FLOW_CHECK_SCRIPT}." >&2; echo default`
    + `; else printf '%s\\n' ${shq(DEFAULT_SCRIPT_HEADER)} 'set -e' "$cmd" > ${FLOW_CHECK_SCRIPT}; echo "relayflow: wrote the $eco default ($cmd) to ${FLOW_CHECK_SCRIPT}." >&2; echo default`
    + '; fi',
].join('; ');

/** Runs its arguments in their own process group and stops the group after `$1` seconds, exiting 124. */
const PERL_LIMITER =
  "my $l = shift; my $p = fork; defined $p or exit 127; if (!$p) { setpgrp(0, 0); exec @ARGV or exit 127 } $SIG{ALRM} = sub { kill 'TERM', -$p; sleep 2; kill 'KILL', -$p; exit 124 }; alarm $l; waitpid($p, 0); exit($? & 127 ? 128 + ($? & 127) : $? >> 8)";

/**
 * Runs FLOW_CHECK_SCRIPT and reports `pass`, `fail`, `timeout` or `none`.
 *
 * The full output goes to a log file, not to stdout: the flow reads one token
 * back from `f.run`, and the report and the repair agent read the log. The last
 * lines are echoed to stderr so the run journal still shows why a check failed
 * — the old step's journal kept a stdout tail that Cloud never surfaced, so a
 * failed run said only `retries_exhausted`.
 *
 * The script runs without the Git configuration Cloud's executor installs for
 * its own clone and push (`GIT_CONFIG_COUNT`/`KEY_n`/`VALUE_n` with
 * `protocol.allow=never`, `GIT_CONFIG_GLOBAL=/dev/null`). Those reached the
 * user's tests: AgentWorkforce/relay run 139d1a46 failed 18 tests, among them
 * `sandbox-repo.test.ts` with `fatal: transport 'file' not allowed`, while the
 * same branch passed all 3,227 in a clean shell of the same sandbox. A
 * repository's tests must see the machine a fresh CI runner would.
 *
 * `f.run` leases a command for at most 15 minutes and dies past it, so the
 * check stops itself first (14 minutes by default) and reports `timeout`
 * instead of taking the run down. It uses `timeout` or `gtimeout` when one is
 * installed and otherwise a small Perl limiter: macOS, the local kit's main
 * platform, ships neither `timeout` nor `gtimeout`, and without a limiter a
 * hung check ran into the lease and failed the run before anything was pushed.
 * Every limiter stops the check's whole process group and exits 124. The
 * caller may set `check_dir` (where to run, default here) and `check_out`
 * (the log).
 */
export const FLOW_CHECK_RUN_COMMAND = [
  'root="$PWD"',
  `script="$root/${FLOW_CHECK_SCRIPT}"`,
  'check_dir="${check_dir:-$root}"',
  'check_out="${check_out:-$root/.relayflow/check.log}"',
  'mkdir -p "$(dirname "$check_out")"',
  'if [ ! -s "$script" ]; then echo "relayflow: there is no check script, so no checks ran." > "$check_out"; echo "relayflow: there is no check script, so no checks ran." >&2; echo none'
    + '; else limit="${RELAYFLOW_CHECK_TIMEOUT:-840}"; limiter='
    + '; if command -v timeout >/dev/null 2>&1; then limiter=timeout; elif command -v gtimeout >/dev/null 2>&1; then limiter=gtimeout; elif command -v perl >/dev/null 2>&1; then limiter=perl; fi'
    + `; run_limited() { case "$limiter" in (timeout|gtimeout) "$limiter" "$limit" "$@" ;; (perl) perl -e ${shq(PERL_LIMITER)} "$limit" "$@" ;; (*) "$@" ;; esac; }`
    + '; echo "relayflow: running $script in $check_dir" >&2'
    + '; ( cd "$check_dir" && unset GIT_CONFIG_COUNT GIT_CONFIG_GLOBAL GIT_CONFIG_NOSYSTEM && run_limited sh "$script" ) > "$check_out" 2>&1 < /dev/null; status=$?'
    + '; tail -n 40 "$check_out" >&2'
    + '; if [ "$status" -eq 0 ]; then echo "relayflow: the checks passed." >&2; echo pass'
    + '; elif [ -n "$limiter" ] && [ "$status" -eq 124 ]; then echo "relayflow: the checks did not finish within ${limit}s." >&2; echo timeout'
    + '; else echo "relayflow: the checks failed with exit $status; the full output is in $check_out." >&2; echo fail; fi'
    + '; fi',
].join('; ');

/**
 * Runs the same check against the commit the branch started from, in a
 * throwaway worktree, and reports its token — or `unknown` when the base
 * commit cannot be checked out.
 *
 * It runs only after the branch has failed and the repair agent could not fix
 * it, because it answers the one question an exit code cannot: did this change
 * break the checks, or were they failing already? Both production failures
 * were the second kind (acbe30c1: a build step the recipe never ran; 139d1a46:
 * Cloud's Git configuration leaking into the tests), and both runs died with
 * the agents' finished work still in the sandbox. A failure the base commit
 * shares is a problem for a person, not a reason to throw the work away.
 *
 * The base commit is checked in the same working tree when it can be: the
 * branch's checks ran in a tree the implementer had already built in, and a
 * default such as `make test` or `python3 -m pytest` does not install or
 * generate anything, so a fresh worktree of the base could fail for missing
 * setup while the branch failed on a real test — and a regression would read
 * as pre-existing. Ignored build products (dependencies, generated files) stay
 * where they are across the checkout. The branch is restored afterwards, by
 * name, and anything the base run changed in tracked files is discarded. A
 * tree with uncommitted changes to tracked files is never switched; it falls
 * back to a throwaway worktree.
 */
export const FLOW_BASE_CHECK_COMMAND = [
  'root="$PWD"',
  'tmp=',
  'if [ -z "$base" ] || ! git rev-parse --verify --quiet "$base^{commit}" >/dev/null 2>&1; then echo "relayflow: could not check out the base commit to compare against." >&2; echo unknown'
    + '; elif git diff --quiet HEAD -- >/dev/null 2>&1 && git diff --cached --quiet >/dev/null 2>&1 && head=$(git rev-parse HEAD) && orig=$(git symbolic-ref -q --short HEAD || git rev-parse HEAD) && git checkout -q --detach "$base" >/dev/null 2>&1; then '
    + 'check_dir="$root"; check_out="$root/.relayflow/base-check.log"'
    + '; token=$( ' + FLOW_CHECK_RUN_COMMAND + ' )'
    + '; git checkout -q -f "$orig" >/dev/null 2>&1 || git checkout -q -f "$head" >/dev/null 2>&1'
    + '; if [ "$(git rev-parse HEAD 2>/dev/null)" = "$head" ]; then echo "$token"; else echo "relayflow: could not return to $orig after checking the base commit." >&2; echo unknown; fi'
    + '; elif tmp=$(mktemp -d "${TMPDIR:-/tmp}/relayflow-base.XXXXXX") && git worktree add --detach -q "$tmp/base" "$base" >/dev/null 2>&1; then '
    + 'check_dir="$tmp/base"; check_out="$root/.relayflow/base-check.log"; '
    + FLOW_CHECK_RUN_COMMAND
    + '; git worktree remove --force "$tmp/base" >/dev/null 2>&1; git worktree prune >/dev/null 2>&1; rm -rf "$tmp"'
    + '; else echo "relayflow: could not check out the base commit to compare against." >&2; if [ -n "$tmp" ]; then rm -rf "$tmp"; fi; echo unknown; fi',
].join('; ');

/**
 * Writes what the checks found to `.relayflow/check-report.md`, and the pull
 * request body — summary.md followed by that report — to `.relayflow/pr-body.md`.
 *
 * The caller sets `check` (the branch's token) and `baseline` (the base
 * commit's token, empty when it was not needed, or `revision` when a fixer's
 * revision broke checks that had passed). A reviewer reads the verdict, the
 * script that ran and the tail of each log on the pull request itself, without
 * opening the run journal.
 */
export const FLOW_CHECK_REPORT_COMMAND = [
  'mkdir -p .relayflow',
  'report=.relayflow/check-report.md',
  '{ printf \'## Checks\\n\\n\''
    + '; case "$check" in'
    + ` pass) printf '%s\\n' "Relayflow ran this repository's checks (${FLOW_CHECK_SCRIPT}) and they passed." ;;`
    + ` none) printf '%s\\n' "Relayflow found no way to run this repository's tests — no check command, no CI test job it could follow, no test target and no recognised project file — so no checks ran. Review the change with that in mind." ;;`
    + ' *) case "$baseline" in'
    + ` fail|timeout) printf '%s\\n' "**The checks fail on the base commit too**, so these failures were not introduced by this change: they come from the repository itself or from the environment the checks ran in. This pull request is a draft until someone looks." ;;`
    + ` pass) printf '%s\\n' "**This change breaks checks that pass on the base commit.** The flow tried to repair it and could not. The pull request is a draft so the work is not lost; it is not ready to merge." ;;`
    + ` new) printf '%s\\n' "**The checks this change adds fail.** The repository had no checks before this change, so there is no base commit to compare with; the flow tried to repair them and could not. The pull request is a draft so the work is not lost; it is not ready to merge." ;;`
    + ` revision) printf '%s\\n' "**The latest revision breaks checks that passed before it.** It was pushed so the work is not lost, and the pull request is now a draft; it is not ready to merge." ;;`
    + ` *) printf '%s\\n' "**The checks failed**, and the base commit could not be checked for comparison, so it is not known whether this change caused them. This pull request is a draft until someone looks." ;;`
    + ' esac ;;'
    + ' esac'
    + `; if [ -s ${FLOW_CHECK_SCRIPT} ]; then printf '\\n<details><summary>What ran (${FLOW_CHECK_SCRIPT})</summary>\\n\\n\`\`\`sh\\n'; cat ${FLOW_CHECK_SCRIPT}; printf '\`\`\`\\n</details>\\n'; fi`
    + `; if [ "$check" != pass ] && [ "$check" != none ] && [ -s .relayflow/check.log ]; then printf '\\n<details><summary>Output on this branch (last 80 lines)</summary>\\n\\n\`\`\`\\n'; tail -n 80 .relayflow/check.log; printf '\`\`\`\\n</details>\\n'; fi`
    + `; if [ "$baseline" = fail ] || [ "$baseline" = timeout ]; then if [ -s .relayflow/base-check.log ]; then printf '\\n<details><summary>Output on the base commit (last 80 lines)</summary>\\n\\n\`\`\`\\n'; tail -n 80 .relayflow/base-check.log; printf '\`\`\`\\n</details>\\n'; fi; fi`
    + `; if [ -s .relayflow/repair-notes.md ]; then printf '\\n### What the repair agent found\\n\\n'; cat .relayflow/repair-notes.md; fi`
    + '; } > "$report"',
  '{ if [ -s summary.md ]; then cat summary.md; printf \'\\n\\n\'; fi; cat "$report"; } > .relayflow/pr-body.md',
  'echo "relayflow: wrote the check report to $report." >&2',
  'echo written',
].join('; ');

/**
 * Marks the pull request as not ready when a revision breaks the checks, and
 * posts the check report to it. Every branch exits 0, like
 * FLOW_REVIEW_BLOCKED_COMMAND, and for the same reason.
 */
export const FLOW_CHECK_BLOCKED_COMMAND = [
  'if gh pr ready --undo >/dev/null 2>&1; then echo "relayflow: converted the pull request to a draft."; else echo "relayflow: could not convert the pull request to a draft." >&2; fi',
  'if gh pr comment --body-file .relayflow/check-report.md >/dev/null 2>&1; then echo "relayflow: posted the check report to the pull request."; else echo "relayflow: could not comment on the pull request; .relayflow/check-report.md still holds the report." >&2; fi',
].join('; ');

/**
 * Files the flow and its agents write for each other, which are never part of
 * the change. Paths are relative to the repository root.
 */
export const FLOW_WORKING_FILES = [
  'summary.md', 'plan.md', 'reviewed-plan.md', 'review.md', 'review.clean', 'review-blocked.md',
  'comparison.md', 'prototype-notes.md', '.relayflow',
  // The local kit's own files, extracted into the repository root.
  'START-HERE.txt', 'flow-input.json', 'relay-preflight.mjs', 'software-factory.flow.mts',
] as const;

/**
 * Hides the working files from `git add -A` for the rest of the run, through
 * the clone's own `.git/info/exclude` — nothing in the repository changes.
 *
 * Patterns are anchored to the root (`/summary.md`), so a `docs/summary.md` the
 * change legitimately adds is still committed, and tracked files are never
 * affected: exclusion applies only to untracked paths. The block carries a
 * header so it is written once and a person can find and delete it. This is
 * prevention only; FLOW_DROP_WORKING_FILES_COMMAND is what guarantees it.
 */
export const FLOW_EXCLUDE_WORKING_FILES_COMMAND = [
  'x=$(git rev-parse --git-path info/exclude 2>/dev/null)',
  `if [ -n "$x" ]; then mkdir -p "$(dirname "$x")" 2>/dev/null; if ! grep -qxF '# relayflow working files' "$x" 2>/dev/null; then printf '%s\\n' '' '# relayflow working files' ${FLOW_WORKING_FILES.map(file => shq(`/${file}${file === '.relayflow' ? '/' : ''}`)).join(' ')} '/.relayflowd/' >> "$x"; fi; echo "relayflow: working files are excluded from commits." >&2; else echo "relayflow: not a git repository, so nothing was excluded." >&2; fi`,
  'echo done',
].join('; ');

/**
 * Removes working files from the branch before it is pushed, when an agent
 * committed them.
 *
 * Both production runs did: Codex committed summary.md into
 * AgentWorkforce/cloud (acbe30c1) and AgentWorkforce/relay (139d1a46), so the
 * pull-request body would have shipped as a file at the repository root, as it
 * did in AgentWorkforce/flows#454. Only paths absent from the base commit are
 * removed, so a repository's own summary.md, and any change the agents made to
 * it, survives.
 *
 * The removal is one new commit built from a private index (`read-tree HEAD`,
 * `update-index --force-remove`, `write-tree`, `commit-tree`), not
 * `git commit`: the real index may hold changes an agent staged and never
 * committed, and they must not be swept into this commit. The files stay in
 * the working tree, where the pull-request body is read from. It falls back to
 * a Relayflow identity only when the clone has none, and exits 0 on every
 * path: a branch that keeps a stray file is better than a run that dies here.
 */
export const FLOW_DROP_WORKING_FILES_COMMAND = [
  `paths=${shq(FLOW_WORKING_FILES.join(' '))}`,
  'if [ -z "$base" ] || ! git rev-parse --verify --quiet "$base^{commit}" >/dev/null 2>&1; then echo "relayflow: the base commit is unknown, so working files were left as committed." >&2'
    + '; else drop=$(git ls-files -- $paths | while IFS= read -r p; do git cat-file -e "$base:$p" 2>/dev/null || printf \'%s\\n\' "$p"; done)'
    + '; if [ -z "$drop" ]; then echo "relayflow: no working files were committed." >&2'
    + '; else tmp=$(mktemp -d); msg="Keep relayflow working files out of the change"'
    + '; if GIT_INDEX_FILE="$tmp/index" git read-tree HEAD && printf \'%s\\n\' "$drop" | GIT_INDEX_FILE="$tmp/index" git update-index --force-remove --stdin && tree=$(GIT_INDEX_FILE="$tmp/index" git write-tree) && { commit=$(git commit-tree "$tree" -p HEAD -m "$msg" 2>/dev/null) || commit=$(git -c user.name=Relayflow -c user.email=noreply@agentrelay.com commit-tree "$tree" -p HEAD -m "$msg"); } && git update-ref -m "relayflow: drop working files" HEAD "$commit"'
    + '; then printf \'%s\\n\' "$drop" | git update-index --force-remove --stdin 2>/dev/null; echo "relayflow: removed working files from the branch: $(printf \'%s \' $drop)" >&2'
    + '; else echo "relayflow: could not remove the working files from the branch." >&2; fi'
    + '; rm -rf "$tmp"; fi; fi',
  'echo done',
].join('; ');

/**
 * Decides whether there is anything to publish, before the branch is pushed and
 * before `gh pr create` runs.
 *
 * The generated flow published unconditionally. An agent that correctly does no
 * work — nothing in the target repository to act on — writes no summary.md, so
 * `gh pr create --body-file summary.md` died with `open summary.md: no such
 * file or directory`, and an operator saw a bare `protocol_error` at the end of
 * a run whose agent step had SUCCEEDED and had said, accurately, that it made
 * no changes. The push step had already pushed the unchanged base commit. The
 * hand-written example on /flows has always gated its pull request on
 * `artifacts.includes("summary.md")`; the generated flow dropped that guard.
 *
 * The caller prefixes `base=<commit>`, the commit this branch started from.
 * Exactly one token goes to stdout, because the flow compares that token;
 * everything human-readable goes to stderr:
 *
 *   publish     new commits and a non-empty summary.md
 *   no-summary  commits worth pushing, but no pull-request body to open with
 *   no-commits  nothing committed, so there is nothing to push either
 *
 * Uncommitted changes are deliberately `no-commits`: a push would carry none of
 * them. When the base commit cannot be resolved the check does not guess — it
 * publishes only on the strength of a summary.md that is actually there, and
 * otherwise declines to push.
 *
 * Like the check commands above, every path exits 0. `f.run` has no retry policy, so a
 * non-zero exit is retried until the run dies with `retries_exhausted`; a check
 * that cannot tell must never be the thing that kills the run.
 */
export const FLOW_PUBLISH_CHECK_COMMAND = [
  'if [ -s summary.md ]; then summary=yes; else summary=no; fi',
  'changed=unknown',
  'if [ -n "$base" ] && git rev-parse --verify --quiet "$base^{commit}" >/dev/null 2>&1; then if git diff --quiet "$base" HEAD 2>/dev/null; then changed=no; else changed=yes; fi; fi',
  'if [ "$changed" != no ] && [ "$summary" = yes ]; then echo "relayflow: new commits and a summary.md are present; opening the pull request." >&2 && echo publish && exit 0; fi',
  'if [ "$changed" = yes ]; then echo "relayflow: there are commits but summary.md is missing or empty, so there is no pull-request body." >&2 && echo no-summary && exit 0; fi',
  'echo "relayflow: no commits were made on this branch, so there is nothing to push or publish." >&2 && echo no-commits && exit 0',
].join('; ');

const REVIEW_BLOCKED_HEADING ='**Relayflow: the adversarial review did not pass.** This branch is not approved: the flow stopped here and did not mark it ready to merge.';

/**
 * Puts the failed review where an operator acts on it: on the pull request.
 *
 * `done("step_failed")` is the honest end for a review that found problems, and
 * as of the 2.0.15 pin the runtime lowers it (AgentWorkforce/flows#436), so the
 * flow reports it. Up to 2.0.14 it did not: the authored executor lowered only
 * `success` and `needs_human` and threw `the initial authored executor cannot
 * lower done("step_failed")`, and a real run paid for it — 15 agent steps, a
 * pushed branch and AgentWorkforce/cloud-e2e-sandbox#25, then
 * `FAILED [protocol_error]` as the only verdict.
 *
 * The exit code says a review failed; it cannot say what the reviewer found.
 * That is what this step is for, and why it outlived the stopgap: the pull
 * request is converted to a draft so it cannot be merged by accident, and the
 * unresolved review is posted to it. A reader of the pull request learns the
 * verdict without opening the run journal.
 *
 * Every branch exits 0 deliberately. `f.run` has no retry policy, so a non-zero
 * exit is retried until the run dies with `retries_exhausted`: a missing
 * review.md, an older `gh` without `pr ready --undo`, or a repository that
 * refuses drafts must not cost the run the report it is trying to leave behind.
 * Each branch prints which way it went, so the journal records the outcome.
 */
export const FLOW_REVIEW_BLOCKED_COMMAND = [
  'set -e',
  `{ printf '%s\\n\\n' "${REVIEW_BLOCKED_HEADING}"; if [ -s review.md ]; then cat review.md; else printf '%s\\n' "_The reviewer left no review.md; see the review step in the run journal._"; fi; } > review-blocked.md || true`,
  'echo "relayflow: the adversarial review did not pass; wrote review-blocked.md."',
  'if gh pr ready --undo >/dev/null 2>&1; then echo "relayflow: converted the pull request to a draft."; else echo "relayflow: could not convert the pull request to a draft; review-blocked.md still holds the findings." >&2; fi',
  'if gh pr comment --body-file review-blocked.md >/dev/null 2>&1; then echo "relayflow: posted the unresolved review to the pull request."; else echo "relayflow: could not comment on the pull request; review-blocked.md still holds the findings." >&2; fi',
].join('; ');

export function workflowAgents(selected: readonly string[]) {
  const builder = selected.filter(isCodingAgent)[0] ?? 'claude';
  const reviewer = selected.filter(isCodingAgent).find(id => id !== builder) ?? builder;
  return { builder, reviewer, prototypes: [builder, reviewer, builder] };
}

export function workflowCode(workflow: WorkflowId, agents: ReturnType<typeof workflowAgents>, instructions: string, _target: 'cloud' | 'local' = 'cloud', settings: FlowAgentSettings = {}, selected: readonly string[] = [agents.builder, agents.reviewer]) {
  const config = (role: AgentRole) => resolveAgentSettings(workflow, role, selected, settings);
  const options = (role: AgentRole, fallback: string, context = '') => {
    const value = config(role);
    const cli = value.agent === agents.builder && fallback === 'builder' ? 'builder' : JSON.stringify(value.agent);
    return `cli: ${cli},${value.model ? `\n    model: ${JSON.stringify(value.model)},` : ''}\n    task: task + "\\n" + ${JSON.stringify(value.prompt)}${context},`;
  };
  const prototypeConfigs = (['prototype-1', 'prototype-2', 'prototype-3'] as const).map(config);
  const sections = [{ id: 'task', code: `  const task = issue.title + "\\n" + issue.body + "\\n" +
    ${JSON.stringify(instructions.trim() || 'Follow existing patterns. Keep changes focused and add regression tests.')};
  // Files the agents write for each other (summary.md, plans, reviews, and
  // .relayflow/) are never part of the change; keep them out of every commit.
  await f.run(${JSON.stringify(FLOW_EXCLUDE_WORKING_FILES_COMMAND)});` }];
  if (workflow === 'traditional') sections.push({ id: 'plan', code: `  // Read the ticket and agree on a plan before changing code.
  await f.agent("planner", {
    ${options('planner', 'builder')}
  });
  await f.agent("plan-reviewer", {
    ${options('plan-reviewer', 'reviewer')}
  });
  await f.run("test -s reviewed-plan.md");` });
  if (workflow === 'prototype') sections.push({ id: 'prototypes', code: `  // Each prototype starts from the same commit in its own worktree.
  const prototypeRoot = (await f.run("mktemp -d /tmp/relay-prototypes.XXXXXX")).trim();
  const quote = (value: string) => "'" + value.replace(/'/g, "'\\\\''") + "'";
  const prototypeAgents = ${JSON.stringify(prototypeConfigs.map(value => value.agent))};
  const prototypeSettings: { model?: string; prompt: string }[] = ${JSON.stringify(prototypeConfigs.map(({ model, prompt }) => ({ ...(model ? { model } : {}), prompt })))};
  const approaches = ["the smallest change", "a maintainable design", "a different approach"];
  const paths = approaches.map((_, index) => prototypeRoot + "/" + (index + 1));
  const base = (await f.run("git rev-parse HEAD")).trim();
  for (const path of paths) {
    await f.run("git worktree add --detach " + quote(path) + " " + quote(base));
  }
  await Promise.all(paths.map((cwd, index) => f.agent("prototype-" + (index + 1), {
    cli: prototypeAgents[index],
    cwd,
    ...(prototypeSettings[index].model ? { model: prototypeSettings[index].model } : {}),
    task: task + "\\n" + prototypeSettings[index].prompt + " Assigned approach: " + approaches[index],
  })));
  // All three implementations are finished before comparison begins.
  await f.agent("comparator", {
    ${options('comparator', 'reviewer', ' + " Prototype worktrees: " + paths.join(", ")')}
  });
  await f.run("test -s comparison.md");
  // Keep the prototype worktrees available for inspection.` });
  sections.push({ id: 'implement', code: `  // Work out how this repository checks itself, before any code changes, so
  // the change and the commit it started from are checked the same way.
  // To use your own command instead, set checkCommand, for example
  // "npm run build && npm test" or "make ci".
  const checkCommand = "";
  const shellQuote = (value: string) => "'" + value.replace(/'/g, "'\\\\''") + "'";
  const checkScript = ${JSON.stringify(FLOW_CHECK_SCRIPT)};
  if (checkCommand.trim()) {
    await f.run("mkdir -p .relayflow && printf '%s\\\\n' 'set -e' " + shellQuote(checkCommand) + " > " + checkScript);
  } else if ((await f.run("test -s " + checkScript + " && echo yes || echo no")).trim() !== "yes") {
    // No command of yours and none committed to the repository: read how its
    // CI tests it. Anything this cannot settle falls back to a default below.
    await f.agent("check-discovery", {
      ${options('check-discovery', 'builder')}
    });
  }
  const resolveChecks = ${JSON.stringify(FLOW_CHECK_RESOLVE_COMMAND)};
  const checkPlan = (await f.run(resolveChecks)).trim();

  // Build and test the change, then open a pull request.
  // Where this branch started, so the publish step below can tell whether the
  // agents actually committed anything.
  const baseCommit = (await f.run("git rev-parse HEAD")).trim();
  await f.agent("implementer", {
    ${options('implementer', 'builder')}
  });
  // A repository with no way to test itself may have gained one in this
  // change (a first package.json with a test script). Resolving only before
  // the change reported "no checks ran" on a pull request that added tests
  // (cloud-e2e-sandbox#31), so a "none" is looked at again.
  if (checkPlan === "none") await f.run(resolveChecks);` });
  sections.push({ id: 'checks', code: `  // Run the checks. A failure is not the end of the run: the tests are
  // how this flow learns what is wrong, so the repair agent reads the output
  // and fixes what it can, and whatever still fails is compared against the
  // commit this branch started from. Every check step prints one word and
  // exits 0; the full output stays in .relayflow/ for the report.
  const verdict = (value: string) => ["pass", "fail", "timeout", "none"].includes(value.trim()) ? value.trim() : "fail";
  const verdictOf = (value: string) => /^[a-z]*$/.test(value) ? value : "unknown";
  const broken = (value: string) => value === "fail" || value === "timeout";
  const runChecks = ${JSON.stringify(FLOW_CHECK_RUN_COMMAND)};
  let repairs = 0;
  const checkAndRepair = async () => {
    let result = verdict(await f.run(runChecks, { timeout: "15m" }));
    for (let attempt = 0; attempt < 2 && broken(result); attempt++) {
      await f.agent("check-repair-" + (++repairs), {
        ${options('check-repair', 'builder')}
      });
      result = verdict(await f.run(runChecks, { timeout: "15m" }));
    }
    return result;
  };
  const check = await checkAndRepair();
  // Only a failure pays for the comparison: pass, fail, timeout or unknown.
  // Checks this change introduced (nothing to run before it) have no base to
  // compare with: the base lacks the files they need and would always fail,
  // which read as "pre-existing". Their failure is this change's own.
  const baseline = !broken(check)
    ? ""
    : checkPlan === "none"
      ? "new"
      : (await f.run("base=" + baseCommit + "; " + ${JSON.stringify(FLOW_BASE_CHECK_COMMAND)}, { timeout: "15m" })).trim();` });
  sections.push({ id: 'pull-request', code: `  // Publish the branch and open the pull request without an agent.
  // Doing no work is a legitimate outcome: a repository with nothing to act on
  // leaves no commits and no summary.md. Pushing a branch at the base commit
  // and failing inside "gh pr create" is not the report such a run should
  // leave, so the check below decides, and anything it cannot vouch for is
  // treated as nothing to publish. Working files an agent committed are taken
  // out of the branch first, so they are neither published nor counted.
  const dropWorkingFiles = ${JSON.stringify(FLOW_DROP_WORKING_FILES_COMMAND)};
  await f.run("base=" + baseCommit + "; " + dropWorkingFiles);
  const publishCheck = ${JSON.stringify(FLOW_PUBLISH_CHECK_COMMAND)};
  const publish = (await f.run("base=" + baseCommit + "; " + publishCheck)).trim();
  if (publish !== "publish" && publish !== "no-summary") {
    console.error("Stopped: the agents made no commits on this branch, so there is nothing to publish. No branch was pushed and no pull request was opened.");
    return f.done("needs_human");
  }
  await f.run("git push --set-upstream origin HEAD");
  if (publish !== "publish") {
    console.error("Stopped: the branch was pushed, but no summary.md was written, so there is no pull-request body. Open the pull request by hand, or run again.");
    return f.done("needs_human");
  }
  // Failing checks never throw the work away: the pull request opens as a
  // draft, with the verdict, the script and the output in its body.
  const checkReport = ${JSON.stringify(FLOW_CHECK_REPORT_COMMAND)};
  await f.run("check=" + check + "; baseline=" + verdictOf(baseline) + "; " + checkReport);
  await f.run('gh pr create --title "Software factory change" --body-file .relayflow/pr-body.md' + (broken(check) ? " --draft" : ""));
  if (broken(check) && (baseline === "pass" || baseline === "new")) {
    // The base commit passes and this branch does not, or the checks are the
    // change's own and fail: the change broke them and repair could not fix
    // it. That is this flow's verdict on its own work, the same as a failed
    // review, so it reports step_failed.
    console.error(baseline === "new"
      ? "Stopped: the checks this change adds fail, and repair could not fix them. The pull request is a draft with the output."
      : "Stopped: this change breaks checks that pass on the base commit, and repair could not fix it. The pull request is a draft with the output.");
    return f.done("step_failed");
  }
  if (broken(check)) {
    // The base commit fails too, or could not be checked: nothing here says the
    // change is at fault, so the reviews still run and a person decides.
    console.error("The checks fail, but not because of this change as far as the base commit shows. The pull request is a draft with the output of both.");
  }` });
  if (workflow !== 'simple') sections.push({ id: 'review', code: `  // ${workflow === 'traditional' ? 'Always run two independent adversarial reviews, even if the first passes.' : 'Review the final implementation against the ticket and comparison findings.'}
  // A review that found problems is this flow's verdict on its own work, so it
  // reports done("step_failed"). The pinned 2.0.15 runtime lowers that reason
  // (AgentWorkforce/flows#436) and the CLI gives it exit 1, distinct from the
  // exit 3 a clean run parks with. An exit code cannot carry what the reviewer
  // found, so the step below still drafts the pull request and posts the
  // findings to it.
  const reviewBlockedCommand = ${JSON.stringify(FLOW_REVIEW_BLOCKED_COMMAND)};
  let clean = false;
  for (let round = 0; round < ${workflow === 'traditional' ? 2 : 1}; round++) {
    await f.run("rm -f review.clean");
    await f.agent("adversary-" + (round + 1), {
      ${options('adversary', 'reviewer')}
    });
    clean = (await f.run("test -f review.clean && echo yes || echo no")).trim() === "yes";
    ${workflow === 'traditional' ? `if (!clean && round === 0) {
      await f.agent("fixer", {
        ${options('fixer', 'builder')}
      });
      // The revision is checked and repaired like the first version, and it
      // is pushed either way: work is never thrown away. If it breaks checks
      // that passed before it, the pull request goes back to draft with the
      // report and the flow stops.
      const revised = await checkAndRepair();
      await f.run("base=" + baseCommit + "; " + dropWorkingFiles);
      await f.run("git push");
      if (broken(revised) && !broken(check)) {
        await f.run("check=" + revised + "; baseline=revision; " + checkReport);
        await f.run(${JSON.stringify(FLOW_CHECK_BLOCKED_COMMAND)});
        console.error("Stopped: the review fixes broke checks that passed before them. The revision is pushed, the pull request is a draft, and the report is on it.");
        return f.done("step_failed");
      }
    }` : ''}
  }
  // Unresolved feedback stops the flow short of approval.
  if (!clean) {
    await f.run(reviewBlockedCommand);
    // Says only what is certain: the step above reports per branch whether it
    // could draft the pull request or comment on it.
    console.error("The adversarial review did not pass. The findings are in review-blocked.md, and on the pull request if it could be reached. This branch is not approved.");
    return f.done("step_failed");
  }` });
  sections.push({ id: 'gate', code: `  // Require approving reviews and passing CI checks in GitHub branch rules.
  // Stop for human review. This flow never merges the pull request.
  // Review and merge in GitHub; approval happens outside the runner.
  return f.done("needs_human");` });
  return sections;
}
