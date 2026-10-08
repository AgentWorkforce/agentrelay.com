import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import {
  FLOW_BASE_CHECK_COMMAND,
  FLOW_CHECK_RUN_COMMAND,
  FLOW_FREE_DISK_COMMAND,
  FLOW_OPEN_CHANGE_COMMAND,
  FLOW_PUBLISH_CHECK_COMMAND,
  FLOW_PUSH_COMMAND,
  FLOW_REVIEW_BLOCKED_COMMAND,
  FLOW_TIME,
  FLOW_TIME_STOP_COMMAND,
  FLOW_VALIDATE_CHANGE_METADATA_COMMAND,
} from '../flow-workflows';
import { factorySource, type FactoryDraft } from '../flow-onboarding';

// AgentWorkforce/cloud#4108: Garden runs died on their own 2h budget before
// they could publish (bda21b91: 120.2m used before step "run-15", with the
// checks passing at step 14), because one check run takes 11-14 min on that
// repository and two repair passes took 57 min. AgentWorkforce/cloud#4235 then
// capped every hosted run at 60 minutes, the lifetime of an E2B sandbox, while
// measured Garden runs took 1.5-2h (agentrelay.com#155). AgentWorkforce/cloud#4270
// raised the cap to 180 minutes; the plan keeps its 60-minute length and the
// rest is recovery room.

/** Cloud's most for a hosted run's declared wallclock (AgentWorkforce/cloud#4270). */
const CLOUD_CAP_MINUTES = 180;

/**
 * The happy path's planned allowances under the 60-minute plan (ceb3900): the
 * build done by minute 34 of its 52m body, one 14m check, 17m of publishing
 * and a 20m review. 85m.
 */
const SIXTY_MINUTE_PLAN_MINUTES = 34 + 14 + 17 + 20;
/**
 * What the plan may plan now: 109m. Only waits on work outside the agents
 * grew: one check may run 30m (flows#626) and publishing 25m (slow pushes).
 * The agents' own allowances, the build window and the review, did not.
 */
const PLANNED_CEILING_MINUTES = 34 + 30 + 25 + 20;

const issue = { source: 'github', title: 'Fix login', body: 'Login fails', labels: ['ready'], repository: 'acme/app', identifier: '#507', url: 'https://github.com/acme/app/issues/507' };
const draft: FactoryDraft = { version: 4, sources: ['github'], sourceSettings: { github: { repository: 'acme/app', labels: 'ready' } }, agents: ['claude', 'codex'], otherAgent: '', task: 'Add a test', workflow: 'traditional', step: 3 };

const MINUTE = 60_000;
const UNITS: Record<string, number> = { ms: 1, s: 1000, m: MINUTE, h: 60 * MINUTE };

/** The wallclock the generated header declares, in ms. */
function declaredWallclockMs(source: string): number {
  const match = /budget: \{ wallclock: "(\d+)(ms|s|m|h)" \}/.exec(source);
  if (!match) throw new Error('no wallclock budget in the generated header');
  return Number(match[1]) * UNITS[match[2]!]!;
}

type Timing = {
  /** Minutes each named agent step wants (prefix match: "check-repair" matches "check-repair"). */
  agents: Record<string, number>;
  /** Minutes and verdict of each check run, in order; later runs repeat the last. */
  checks: { minutes: number; verdict: string }[];
  baseline?: { minutes: number; verdict: string };
  /**
   * Charge every command its full limit (agentrelay.com#135): the timeout it
   * states, or the kernel's 30s default.
   */
  fullTimeouts?: boolean;
  /** Whether a finished reviewer leaves review.clean (default: it does not). */
  reviewClean?: boolean;
};

/** A duration as the runtime reads it ("45m"), in ms; undefined when absent. */
function durationMs(value: string | undefined): number | undefined {
  const match = /^(\d+)(ms|s|m|h)$/.exec(value ?? '');
  return match ? Number(match[1]) * UNITS[match[2]!]! : undefined;
}

/** The limit, in minutes, a check command sets for itself (RELAYFLOW_CHECK_TIMEOUT, in seconds). */
function checkLimitMinutes(command: string): number {
  const match = /RELAYFLOW_CHECK_TIMEOUT=(\d+);/.exec(command);
  return match ? Number(match[1]) / 60 : FLOW_TIME.checkLimitMinutes;
}

/**
 * Runs the generated flow against a simulated clock and the kernel's budget
 * rule (flows `AuthoredBudget`): every step's wallclock is charged, and a step
 * is refused once the charged total exceeds the header's wallclock. Every
 * other command takes 5 seconds, or its whole limit with `fullTimeouts`. An
 * agent that would run past its `timeout` is stopped there, as relayflows
 * 2.0.40 does (agentrelay.com#138): it is charged exactly its limit and its
 * step resolves with `completionReason: "timeout"`. A check that would run
 * past the limit the flow gives it stops there and reports `timeout`, as
 * FLOW_CHECK_RUN_COMMAND does.
 */
async function runTimed(timing: Timing, workflow: FactoryDraft['workflow'] = 'traditional', options: { parallel?: string[]; target?: 'cloud' | 'local' } = {}) {
  const source = factorySource({ ...draft, workflow }, options.target ?? 'cloud');
  // Cloud spends the setup before the body starts, out of the same budget.
  const budgetMs = declaredWallclockMs(source) - FLOW_TIME.setupMinutes * MINUTE;
  const compiled = ts.transpileModule(source.replace('import { flow } from "@relayflows/surface";', ''), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const exports: { default?: (ctx: unknown, input: unknown) => Promise<void> } = {};
  new Function('exports', 'flow', compiled.outputText)(exports, (_n: string, _o: unknown, body: unknown) => body);
  const epoch = 1_759_000_000;
  // Two clocks: `charged` is what the kernel bills (every step's own time),
  // `wallMs` is what `date` reads. They differ only for parallel agents.
  let charged = 0;
  let wallMs = 0;
  let groupStart: number | null = null;
  let checkIndex = 0;
  const calls: { name: string; atMinute: number; minutes: number; command?: string; timedOut?: boolean; limit?: number }[] = [];
  const errors: string[] = [];
  const leases: { name: string; limit: number; lease?: number }[] = [];
  let finish = '';
  let refused: string | null = null;
  const step = (name: string, ms: number, parallel = false, command?: string) => {
    // Strictly greater, as the kernel compares (flows authored-budget.ts,
    // machine/budget.rs): a step is refused once the charged time exceeds the limit.
    if (charged > budgetMs) {
      refused = name;
      throw new Error(`Flow budget exceeded before step "${name}"`);
    }
    calls.push({ name, atMinute: charged / MINUTE, minutes: ms / MINUTE, ...(command === undefined ? {} : { command }) });
    charged += ms;
    if (parallel) {
      groupStart ??= wallMs;
      wallMs = Math.max(wallMs, groupStart + ms);
    } else {
      groupStart = null;
      wallMs += ms;
    }
  };
  const agentMinutes = (name: string) => {
    const key = Object.keys(timing.agents).find(prefix => name.startsWith(prefix));
    return key === undefined ? 5 : timing.agents[key]!;
  };
  const checked = (name: string, command: string, run: { minutes: number; verdict: string }, lease?: string) => {
    const limit = checkLimitMinutes(command);
    const leaseMinutes = durationMs(lease) === undefined ? undefined : durationMs(lease)! / MINUTE;
    leases.push({ name, limit, lease: leaseMinutes });
    const stopped = run.minutes > limit;
    // At every step's limit, the setup around the script (the base check's
    // checkouts and return) also takes all the slack its f.run lease leaves.
    const minutes = (stopped ? limit : run.minutes) + (timing.fullTimeouts && leaseMinutes !== undefined ? leaseMinutes - limit : 0);
    step(name, minutes * MINUTE, false, command);
    calls[calls.length - 1]!.limit = limit;
    return stopped ? 'timeout' : run.verdict;
  };
  // A detached branch check (RELAYFLOW_CHECK_WAIT): each call waits at most
  // its wait, and the check runs until it finishes or reaches its total.
  const spans = new Map<string, { run: { minutes: number; verdict: string }; ran: number }>();
  const polled = (command: string, lease?: string) => {
    const id = /RELAYFLOW_CHECK_ID=([^;]+);/.exec(command)![1]!;
    const wait = Number(/RELAYFLOW_CHECK_WAIT=(\d+);/.exec(command)![1]) / 60;
    const limit = checkLimitMinutes(command);
    const leaseMinutes = durationMs(lease)! / MINUTE;
    leases.push({ name: 'check', limit: wait, lease: leaseMinutes });
    if (!spans.has(id)) spans.set(id, { run: timing.checks[Math.min(checkIndex++, timing.checks.length - 1)]!, ran: 0 });
    const span = spans.get(id)!;
    const end = Math.min(span.run.minutes, limit);
    const minutes = Math.min(wait, end - span.ran);
    span.ran += minutes;
    // With fullTimeouts each wait also holds its lease's minute of slack.
    step('check', (minutes + (timing.fullTimeouts ? leaseMinutes - wait : 0)) * MINUTE, false, command);
    calls[calls.length - 1]!.limit = limit;
    if (span.ran < end) return 'running';
    return span.run.minutes > limit ? 'timeout' : span.run.verdict;
  };
  const originalError = console.error;
  console.error = (message: string) => { errors.push(String(message)); };
  try {
    await exports.default!({
      agent: async (name: string, agentOptions?: { timeout?: string }) => {
        // Agents started together (prototypes) run at once: each is charged
        // in full, but the wall clock moves once for the whole group.
        const limit = durationMs(agentOptions?.timeout);
        const wanted = agentMinutes(name) * MINUTE;
        const timedOut = limit !== undefined && wanted > limit;
        step(name, timedOut ? limit : wanted, options.parallel?.some(prefix => name.startsWith(prefix)) ?? false);
        calls[calls.length - 1]!.limit = limit === undefined ? undefined : limit / MINUTE;
        if (timedOut) calls[calls.length - 1]!.timedOut = true;
        return { completionReason: timedOut ? 'timeout' : 'success', summary: '', artifacts: [] };
      },
      run: async (command: string, runOptions?: { timeout?: string }) => {
        if (command.endsWith(FLOW_BASE_CHECK_COMMAND)) {
          return checked('base-check', command, timing.baseline ?? { minutes: FLOW_TIME.checkLimitMinutes, verdict: 'fail' }, runOptions?.timeout);
        }
        if (command.endsWith(FLOW_CHECK_RUN_COMMAND) && command.includes('RELAYFLOW_CHECK_WAIT=')) return polled(command, runOptions?.timeout);
        if (command.endsWith(FLOW_CHECK_RUN_COMMAND)) {
          return checked('check', command, timing.checks[Math.min(checkIndex++, timing.checks.length - 1)]!, runOptions?.timeout);
        }
        const ms = !timing.fullTimeouts ? 5000 : durationMs(runOptions?.timeout) ?? FLOW_TIME.defaultStepMinutes * MINUTE;
        step(command.startsWith(FLOW_OPEN_CHANGE_COMMAND) ? 'open-change'
          : command.includes(FLOW_PUSH_COMMAND) ? 'push'
            : command === FLOW_TIME_STOP_COMMAND ? 'time-stop'
              : command.endsWith(FLOW_REVIEW_BLOCKED_COMMAND) ? 'review-blocked'
                : command.endsWith(FLOW_FREE_DISK_COMMAND) ? 'free-disk'
                  : 'run', ms, false, command);
        // The flow reads the clock through a journaled step.
        if (command === 'date +%s') return String(epoch + Math.floor(wallMs / 1000));
        if (command.endsWith(FLOW_PUBLISH_CHECK_COMMAND)) return 'publish';
        if (command.endsWith(FLOW_VALIDATE_CHANGE_METADATA_COMMAND)) return 'valid';
        if (command === 'git rev-parse HEAD') return 'abc123';
        if (command.startsWith('test -f review.clean')) return timing.reviewClean ? 'yes' : 'no';
        // No committed check script, so check-discovery runs (and is charged).
        if (command.startsWith('test -s .relayflow/check.sh')) return 'no';
        if (command.startsWith('test -s')) return 'yes';
        return '';
      },
      human: async () => { throw new Error('unsupported'); },
      done: (reason: string) => { finish = reason; },
    }, { issue, approver: 'owner' });
  } catch (error) {
    if (refused === null) throw error;
  } finally {
    console.error = originalError;
  }
  const opened = calls.find(call => call.name === 'open-change');
  const names = calls.map(call => call.name);
  return { calls, names, errors, leases, finish, refused, budgetMs, chargedMinutes: charged / MINUTE, opened };
}

type Run = Awaited<ReturnType<typeof runTimed>>;
const errorsOf = (run: Run) => run.errors.join('\n');
const after = (run: Run, name: string) => run.calls.slice(run.calls.findIndex(call => call.name === name) + 1);
const named = (run: Run, prefix: string) => run.calls.filter(call => call.name.startsWith(prefix));

describe('Garden flow time plan (cloud#4235, cloud#4270, agentrelay.com#155)', () => {
  it('plans within Cloud\'s 180-minute run cap', () => {
    const t = FLOW_TIME;
    // Cloud honours a header of up to 180 minutes, and that budget also pays
    // for the sandbox setup before the body starts. 120 leaves an hour spare.
    expect(t.headerMinutes).toBe(120);
    expect(t.headerMinutes).toBeLessThanOrEqual(CLOUD_CAP_MINUTES);
    expect(t.bodyMinutes).toBe(t.headerMinutes - t.setupMinutes);
    expect(t.setupMinutes).toBeGreaterThanOrEqual(5);
    // At most two repair rounds of 20 minutes, one review of at most 20.
    expect(t.repairMinutes).toBe(20);
    expect(t.repairRounds).toBe(2);
    expect(t.reviewMinutes).toBe(20);
    // A check stops itself before its 15-minute f.run lease.
    expect(t.checkLimitMinutes).toBeLessThan(t.checkMinutes);
    expect(t.checkMinutes).toBeLessThanOrEqual(15);
    // Publishing at every step's limit (agentrelay.com#135): drop working
    // files and open the change request at forgeMinutes, the push at
    // pushMinutes (its workflow-edit fallback pushes twice and may comment),
    // four local steps at the kernel's default, then closing: one
    // draft-and-comment follow-up and the review-findings report.
    expect(t.pushMinutes).toBeGreaterThanOrEqual(2 * t.forgeMinutes + t.followUpMinutes);
    expect(t.closeMinutes).toBeGreaterThanOrEqual(t.followUpMinutes + t.defaultStepMinutes);
    expect(t.publishMinutes).toBeGreaterThanOrEqual(t.forgeMinutes + t.pushMinutes + t.forgeMinutes + 4 * t.defaultStepMinutes + t.closeMinutes);
    expect(t.publishReserveMinutes).toBeGreaterThan(t.publishMinutes);
    // Every agent limit is one relayflows accepts (AgentWorkforce/flows#606).
    expect(t.agentLimitMaxMinutes).toBe(60);
    for (const minutes of [t.discoveryMinutes, t.repairMinutes, t.reviewMinutes, t.prototypeMinutes, t.comparatorMinutes]) {
      expect(minutes).toBeGreaterThan(0);
      expect(minutes).toBeLessThanOrEqual(t.agentLimitMaxMinutes);
    }
    // The steps before the implementer, at their limits, still leave it its
    // floor by the end of the build: the mandatory path fits by construction.
    expect(1 + t.discoveryMinutes + 3 + t.implementerFloorMinutes).toBeLessThanOrEqual(t.buildByMinutes);
    expect(t.buildReserveMinutes).toBe(t.bodyMinutes - t.buildByMinutes);
    // What follows the build always holds a check at its whole budget,
    // publishing and the review's floor.
    expect(2 + t.checkTotalMinutes + t.publishReserveMinutes + t.reviewFloorMinutes + t.reviewReserveMinutes).toBeLessThanOrEqual(t.buildReserveMinutes);
    // A check may span leases, each within f.run's 15 minutes.
    expect(t.checkTotalMinutes).toBe(30);
    expect(t.checkLimitMinutes + 1).toBeLessThanOrEqual(t.checkMinutes);
  });

  it('keeps the happy path\'s planned allowances at 109m, with the agents\' share where the 60-minute plan had it', () => {
    // The extra time is margin, not a longer plan: the build ends where it
    // did, and a clean run plans one check, publishing and one review. The
    // check budget (14m to 30m, flows#626) and publishing's limits (17m to
    // 25m) grew: 85m to 109m, +28%. Both are waits on a suite or a forge, and
    // a clean run uses only what they take. The agents' allowances, the build
    // window and the review, are pinned at the 60-minute plan's 54m. A change
    // that lengthens the plan has to change this test.
    const t = FLOW_TIME;
    const planned = t.buildByMinutes + t.checkTotalMinutes + t.publishMinutes + t.reviewMinutes;
    expect(planned).toBeLessThanOrEqual(PLANNED_CEILING_MINUTES);
    expect(PLANNED_CEILING_MINUTES).toBe(109);
    expect(SIXTY_MINUTE_PLAN_MINUTES).toBe(85);
    expect(t.buildByMinutes + t.reviewMinutes).toBeLessThanOrEqual(34 + 20);
  });

  it('runs a 20-minute check across several leases and honours its verdict (flows#626)', async () => {
    for (const verdict of ['pass', 'fail'] as const) {
      const run = await runTimed({
        agents: { 'check-discovery': 6, 'implementer': 10, 'check-repair': 100, 'adversary': 8 },
        // A failing suite's re-check after the repair fails again, quickly.
        checks: [{ minutes: 20, verdict }, { minutes: 2, verdict }],
        baseline: { minutes: 2, verdict: 'fail' },
        reviewClean: true,
      });
      const first = named(run, 'check').filter(call => call.name === 'check');
      const id = /RELAYFLOW_CHECK_ID=([^;]+);/.exec(first[0]!.command!)![1];
      const polls = first.filter(call => call.command!.includes(`RELAYFLOW_CHECK_ID=${id};`));
      // One check, waited on in more than one lease, each within f.run's 15
      // minutes, and run to the end: 20 minutes in all, not stopped at 14.
      expect(polls.length, verdict).toBeGreaterThan(1);
      expect(polls.reduce((sum, call) => sum + call.minutes, 0), verdict).toBeCloseTo(20);
      for (const lease of run.leases.filter(lease => lease.name === 'check')) expect(lease.lease!).toBeLessThanOrEqual(FLOW_TIME.checkMinutes);
      const report = run.calls.find(call => call.command?.includes('.relayflow/check-report.md'))!;
      expect(report.command, verdict).toMatch(new RegExp(`^check=${verdict}; `));
      if (verdict === 'pass') expect(run.opened?.command).not.toContain(' --draft');
      else expect(run.opened?.command).toContain(' --draft');
      expect(run.refused, verdict).toBeNull();
    }
  });

  it('gives every branch check its ID, total and wait, and the base check only its limit', async () => {
    const run = await runTimed({
      agents: { 'check-discovery': 1, 'implementer': 1, 'check-repair': 1 },
      checks: [{ minutes: 20, verdict: 'fail' }, { minutes: 2, verdict: 'fail' }],
      baseline: { minutes: 2, verdict: 'fail' },
    }, 'simple');
    const checks = run.calls.filter(call => call.name === 'check');
    expect(checks.length).toBeGreaterThan(2);
    const ids = new Set<string>();
    for (const call of checks) {
      const match = /^RELAYFLOW_CHECK_ID=(\d+-\d+); RELAYFLOW_CHECK_TIMEOUT=(\d+); RELAYFLOW_CHECK_WAIT=(\d+); /.exec(call.command!);
      expect(match, call.command).not.toBeNull();
      ids.add(match![1]!);
      expect(Number(match![2]) / 60).toBeLessThanOrEqual(FLOW_TIME.checkTotalMinutes);
      expect(Number(match![3]) / 60).toBeLessThanOrEqual(FLOW_TIME.checkLimitMinutes);
    }
    // The first check and the re-checks after the two repairs: one ID each.
    expect(ids.size).toBe(3);
    const base = run.calls.find(call => call.name === 'base-check')!;
    expect(base.command).toMatch(/^base=abc123; RELAYFLOW_CHECK_TIMEOUT=\d+; /);
    expect(base.command).not.toContain('RELAYFLOW_CHECK_WAIT=');
  });

  it('keeps a local run\'s single 15-minute repair, with no second round', async () => {
    const run = await runTimed({
      agents: { 'check-repair': 5 },
      checks: [{ minutes: 2, verdict: 'fail' }],
      baseline: { minutes: 2, verdict: 'fail' },
    }, 'traditional', { target: 'local' });
    expect(named(run, 'check-repair').map(call => call.name)).toEqual(['check-repair']);
    expect(factorySource({ ...draft, workflow: 'simple' }, 'local')).toContain('round <= 1 &&');
    expect(factorySource({ ...draft, workflow: 'simple' }, 'cloud')).toContain('round <= 2 &&');
    expect(FLOW_TIME.localRepairMinutes).toBe(15);
    expect(FLOW_TIME.localRepairRounds).toBe(1);
  });

  it('reports a check that runs past its whole budget as a timeout, not a failure', async () => {
    const run = await runTimed({
      agents: { 'check-discovery': 6, 'implementer': 10, 'check-repair': 100 },
      checks: [{ minutes: 45, verdict: 'pass' }],
    }, 'simple');
    const first = run.calls.filter(call => call.name === 'check').slice(0, 1)[0]!;
    expect(first.limit).toBe(FLOW_TIME.checkTotalMinutes);
    const report = run.calls.find(call => call.command?.includes('.relayflow/check-report.md'))!;
    expect(report.command).toMatch(/^check=timeout; /);
    expect(errorsOf(run)).toMatch(/The checks timed out \(stopped at their time budget, not a test failure\)/);
    expect(errorsOf(run)).not.toMatch(/The checks fail\b/);
    expect(run.opened?.command).toContain(' --draft');
    expect(run.refused).toBeNull();
  });

  it('declares the 2h wallclock in the cloud header, and keeps 3h for a local run', () => {
    for (const workflow of ['traditional', 'prototype', 'simple'] as const) {
      const source = factorySource({ ...draft, workflow });
      expect(source).toContain('{ budget: { wallclock: "2h" } }');
      expect(declaredWallclockMs(source)).toBeLessThanOrEqual(CLOUD_CAP_MINUTES * MINUTE);
    }
    // A local run has no sandbox lifetime, and its pinned runtime cannot stop
    // an agent at a limit, so it keeps the longer budget.
    expect(factorySource(draft, 'local')).toContain('{ budget: { wallclock: "3h" } }');
  });

  it('runs the traditional workflow as discover, implement, check, publish, review', async () => {
    const run = await runTimed({ agents: {}, checks: [{ minutes: 5, verdict: 'pass' }], reviewClean: true });
    const agents = run.names.filter(name => !['run', 'check', 'push', 'open-change', 'free-disk', 'review-blocked', 'time-stop', 'base-check'].includes(name));
    // No separate planner or plan reviewer: the implementer plans. One review,
    // and no fix round after it.
    expect(agents).toEqual(['check-discovery', 'implementer', 'adversary']);
    expect(run.names.indexOf('check')).toBeGreaterThan(run.names.indexOf('implementer'));
    expect(run.names.indexOf('open-change')).toBeGreaterThan(run.names.indexOf('check'));
    expect(run.names.indexOf('adversary')).toBeGreaterThan(run.names.indexOf('open-change'));
    expect(run.finish).toBe('needs_human');
  });

  it('fits a typical run, with a Rust-sized check suite, into 30-45 minutes', async () => {
    // Measured shapes from Garden runs: discovery ~6m, a focused implementer
    // ~10m, an 11m24s check (bda21b91), and a reviewer ~8m.
    const run = await runTimed({
      agents: { 'check-discovery': 6, 'implementer': 10, 'adversary': 8 },
      checks: [{ minutes: 11.4, verdict: 'pass' }],
      reviewClean: true,
    });
    expect(run.refused).toBeNull();
    expect(run.opened?.command).not.toContain(' --draft');
    expect(run.names).toContain('adversary');
    expect(run.names).not.toContain('time-stop');
    expect(FLOW_TIME.setupMinutes + run.chargedMinutes).toBeGreaterThanOrEqual(30);
    expect(FLOW_TIME.setupMinutes + run.chargedMinutes).toBeLessThanOrEqual(45);
  });

  it('publishes run bda21b91 (measured step times) within the cap', async () => {
    // bda21b91: discovery 5m57s, implementer 6m22s, checks 11m30s fail,
    // 11m21s fail, 14m00s pass, repairs 19m27s and 37m18s. With one repair
    // round and no base check time left, it still opens its pull request.
    const run = await runTimed({
      agents: { 'check-discovery': 6, 'implementer': 6.4, 'check-repair': 19.5, 'adversary': 8 },
      checks: [{ minutes: 11.5, verdict: 'fail' }, { minutes: 11.4, verdict: 'fail' }, { minutes: 14, verdict: 'pass' }],
    });
    expect(run.refused).toBeNull();
    expect(run.opened).toBeDefined();
    expect(run.chargedMinutes).toBeLessThanOrEqual(run.budgetMs / MINUTE);
  });

  it('never runs out of budget when every step takes its full limit, at the edge of every guard (agentrelay.com#135)', async () => {
    // Every step is charged its whole timeout or the 30s default, and every
    // agent wants far more than it is given, so each is stopped at, and
    // charged exactly, its limit (agentrelay.com#138). Sweeping the
    // implementer moves the run across each guard's edge: wherever a check,
    // repair, base check or review only just starts, what follows it must
    // still fit, and the worst case stays inside the header's 120 minutes.
    const seen: Record<string, Set<string>> = { traditional: new Set(), prototype: new Set(), simple: new Set() };
    let checked = 0;
    let timedOut = 0;
    for (const workflow of ['traditional', 'prototype', 'simple'] as const) {
      // [check verdict, discovery minutes, check minutes]: slow and fast suites.
      for (const [verdict, early, checkMinutes] of [['timeout', FLOW_TIME.discoveryMinutes, 100], ['fail', FLOW_TIME.discoveryMinutes, FLOW_TIME.checkLimitMinutes], ['fail', 1, 3], ['pass', 1, 3]] as const) {
        for (let implementer = 0; implementer <= 60; implementer += 0.5) {
          const run = await runTimed({
            // Prototypes that run to their limit take everything above the
            // implementer's floor, so with a fast suite they (and the
            // comparator) finish early, which leaves the base check something
            // to guard. A repair that finishes before its limit, on a fast
            // suite that still fails, leads to the second round.
            agents: { 'check-discovery': early, 'prototype': checkMinutes === 3 ? 2 : 100, 'comparator': checkMinutes === 3 ? 1 : 100, 'implementer': implementer, 'check-repair': checkMinutes === 3 ? 2 : 100, 'adversary': 100 },
            checks: [{ minutes: checkMinutes, verdict }],
            baseline: { minutes: 100, verdict: 'fail' },
            fullTimeouts: true,
          }, workflow, { parallel: ['prototype'] });
          const where = `${workflow}, ${verdict} after ${checkMinutes}m, discovery ${early}m, implementer ${implementer}m`;
          checked++;
          expect(run.refused, where).toBeNull();
          expect(run.opened, where).toBeDefined();
          // The kernel refuses only a step that would start past the budget,
          // so the last step may end past it. The guards keep that to the two
          // steps before the flow first reads its clock (the working-file
          // exclude and that read), charged here at 30s each.
          expect(run.chargedMinutes, where).toBeLessThanOrEqual(FLOW_TIME.bodyMinutes + 2 * FLOW_TIME.defaultStepMinutes);
          expect(FLOW_TIME.setupMinutes + run.chargedMinutes, where).toBeLessThanOrEqual(FLOW_TIME.headerMinutes + 2 * FLOW_TIME.defaultStepMinutes);
          for (const call of run.calls) {
            // Every agent states a limit on the cloud target, within the runtime's ceiling.
            if (call.name === 'run' || call.name === 'check' || call.name === 'base-check' || call.command !== undefined) continue;
            expect(call.limit, `${where}: ${call.name}`).toBeDefined();
            expect(call.limit!, `${where}: ${call.name}`).toBeGreaterThanOrEqual(1);
            expect(call.limit!, `${where}: ${call.name}`).toBeLessThanOrEqual(FLOW_TIME.agentLimitMaxMinutes);
            if (call.timedOut) timedOut++;
          }
          for (const name of run.names) seen[workflow]!.add(name.startsWith('prototype') ? 'prototype' : name);
          if (run.errors.some(error => /skipped the checks/i.test(error))) seen[workflow]!.add('skipped-checks');
        }
      }
    }
    // Not vacuous: every workflow reaches each guarded optional step somewhere
    // in the sweep. The build ends by buildByMinutes, so the checks always run
    // on Cloud now: the fail-fast path that skips them is never taken.
    expect(checked).toBeGreaterThan(1000);
    expect(timedOut).toBeGreaterThan(1000);
    for (const workflow of ['traditional', 'prototype', 'simple']) {
      for (const name of ['check', 'check-repair', 'check-repair-2', 'base-check', 'free-disk']) {
        expect(seen[workflow], `${workflow} reaches ${name}`).toContain(name);
      }
      expect(seen[workflow], `${workflow} never skips the checks`).not.toContain('skipped-checks');
      // Every step after the build leaves the review its floor, so a review
      // is never stopped for time on Cloud: the time-stop path stays only as
      // a guard.
      expect(seen[workflow], `${workflow} never stops for time before the review`).not.toContain('time-stop');
    }
    expect(seen.traditional).toContain('adversary');
    expect(seen.prototype).toContain('adversary');
  }, 60_000); // About a thousand simulated runs.

  it('runs at most two repair rounds, the second only when the re-check still fails', async () => {
    const failing = await runTimed({
      agents: {},
      checks: [{ minutes: 2, verdict: 'fail' }],
      baseline: { minutes: 2, verdict: 'fail' },
    }, 'simple');
    expect(named(failing, 'check-repair').map(call => call.name)).toEqual(['check-repair', 'check-repair-2']);
    for (const repair of named(failing, 'check-repair')) expect(repair.limit).toBeLessThanOrEqual(FLOW_TIME.repairMinutes);
    // The first check, a re-check after each repair, and the base commit.
    expect(failing.names.filter(name => name === 'check')).toHaveLength(3);
    expect(failing.names).toContain('base-check');
    expect(failing.opened?.command).toContain(' --draft');
    // A first repair that passes the re-check ends the repairs.
    const fixed = await runTimed({
      agents: {},
      checks: [{ minutes: 2, verdict: 'fail' }, { minutes: 2, verdict: 'pass' }],
    }, 'simple');
    expect(named(fixed, 'check-repair')).toHaveLength(1);
    // A clean run repairs nothing: the second round is never planned.
    const clean = await runTimed({ agents: {}, checks: [{ minutes: 2, verdict: 'pass' }], reviewClean: true });
    expect(named(clean, 'check-repair')).toHaveLength(0);
  });

  it('gives a failed check the extra repair room, so a slow repair finishes instead of being stopped', async () => {
    // bda21b91's first repair took 19m27s against an 11m suite: stopped at 15
    // under the 60-minute plan, it now finishes, and the pull request is ready.
    const slow = await runTimed({
      agents: { 'check-discovery': 6, 'implementer': 10, 'check-repair': 19.5, 'adversary': 8 },
      checks: [{ minutes: 11.5, verdict: 'fail' }, { minutes: 11.4, verdict: 'pass' }],
      reviewClean: true,
    });
    expect(named(slow, 'check-repair')).toHaveLength(1);
    expect(named(slow, 'check-repair')[0]!.timedOut).toBeUndefined();
    expect(slow.opened?.command).not.toContain(' --draft');
    expect(slow.names).toContain('adversary');
    expect(slow.refused).toBeNull();
    // With a faster suite, checks that still fail get a second round, and
    // the review still runs after it: the second round leaves it its floor,
    // and the base check its time.
    const twice = await runTimed({
      agents: { 'check-discovery': 6, 'implementer': 10, 'check-repair-2': 6, 'check-repair': 19.5, 'adversary': 8 },
      checks: [{ minutes: 3, verdict: 'fail' }, { minutes: 3, verdict: 'fail' }, { minutes: 3, verdict: 'pass' }],
      reviewClean: true,
    });
    const repairs = named(twice, 'check-repair');
    expect(repairs.map(call => call.name)).toEqual(['check-repair', 'check-repair-2']);
    for (const repair of repairs) expect(repair.timedOut).toBeUndefined();
    expect(twice.opened?.command).not.toContain(' --draft');
    expect(twice.names).toContain('adversary');
    expect(twice.names).not.toContain('time-stop');
    expect(twice.refused).toBeNull();
    expect(FLOW_TIME.setupMinutes + twice.chargedMinutes).toBeLessThanOrEqual(FLOW_TIME.headerMinutes);
  });

  it('never runs a second repair after one that was stopped at its limit', async () => {
    // Another repair of the same failures would most likely run out too.
    const run = await runTimed({
      agents: { 'implementer': 100, 'check-repair': 100 },
      checks: [{ minutes: FLOW_TIME.checkLimitMinutes, verdict: 'fail' }],
      baseline: { minutes: 2, verdict: 'fail' },
    });
    expect(run.refused).toBeNull();
    expect(named(run, 'check-repair')).toHaveLength(1);
    expect(named(run, 'check-repair')[0]!.timedOut).toBe(true);
    expect(errorsOf(run)).toContain('no further repair is tried');
    expect(run.opened?.command).toContain(' --draft');
    expect(run.names).toContain('adversary');
  });

  it('skips a second repair that would cost the review its floor, and still publishes and reviews', async () => {
    // A 14m suite after a 20m implementer leaves too little for another round
    // that still leaves the review its floor.
    const run = await runTimed({
      agents: { 'implementer': 20, 'check-repair': 12 },
      checks: [{ minutes: FLOW_TIME.checkLimitMinutes, verdict: 'fail' }],
      baseline: { minutes: 2, verdict: 'fail' },
    });
    expect(named(run, 'check-repair')).toHaveLength(1);
    expect(errorsOf(run)).toMatch(/skipped the second repair/i);
    expect(run.names).toContain('adversary');
    expect(run.refused).toBeNull();
  });

  it('expects the re-check to take about as long as the first check, not a fresh full run', async () => {
    // A 3m suite leaves room to repair after a long implementer; a 14m one
    // would not. The re-check reuses the first run's build.
    const run = await runTimed({
      agents: { 'implementer': 8 },
      checks: [{ minutes: 3, verdict: 'fail' }, { minutes: 3, verdict: 'pass' }],
    }, 'simple');
    expect(named(run, 'check-repair')).toHaveLength(1);
    expect(run.opened?.command).not.toContain(' --draft');
  });

  it('frees disk the run no longer needs before every check after the first', async () => {
    const run = await runTimed({
      agents: {},
      checks: [{ minutes: 2, verdict: 'fail' }],
      baseline: { minutes: 2, verdict: 'fail' },
    }, 'simple');
    const checks = run.calls.map((call, index) => ({ call, index })).filter(({ call }) => call.name === 'check' || call.name === 'base-check');
    expect(checks).toHaveLength(4);
    expect(run.calls[checks[0]!.index - 1]?.name).not.toBe('free-disk');
    for (const { index } of checks.slice(1)) expect(run.calls.slice(checks[0]!.index, index).map(call => call.name)).toContain('free-disk');
  });

  it('skips the base-commit check rather than run out of time before publishing, and says the base was not checked', async () => {
    const run = await runTimed({
      agents: { 'implementer': 20 },
      checks: [{ minutes: FLOW_TIME.checkLimitMinutes, verdict: 'fail' }],
      baseline: { minutes: FLOW_TIME.checkLimitMinutes, verdict: 'fail' },
    }, 'simple');
    expect(run.refused).toBeNull();
    expect(run.names).not.toContain('base-check');
    expect(run.opened).toBeDefined();
    const report = run.calls.find(call => call.command?.includes('.relayflow/check-report.md'));
    expect(report?.command).toMatch(/baseline=skipped; /);
    // Nothing was checked, so the run must not claim the base commit fails too.
    expect(errorsOf(run)).toMatch(/base not checked/);
    expect(errorsOf(run)).not.toMatch(/as far as the base commit shows/);
  });

  it('leases the base check enough beyond its limit to check out the base commit and come back', async () => {
    // The limit stops only the check script; the checkout, the worktree and the
    // way back to the branch run inside the same f.run lease, and a lease that
    // runs out throws and takes the run down.
    for (const minutes of [2, 12]) {
      const run = await runTimed({
        agents: { 'check-discovery': 1, 'implementer': 1, 'check-repair': 1 },
        checks: [{ minutes, verdict: 'fail' }],
        baseline: { minutes, verdict: 'fail' },
      }, 'simple');
      const base = run.leases.find(lease => lease.name === 'base-check');
      expect(base, `${minutes}m checks`).toBeDefined();
      expect(base!.lease! - base!.limit).toBeGreaterThanOrEqual(2);
      // f.run refuses a lease above 15 minutes.
      for (const lease of run.leases) expect(lease.lease!).toBeLessThanOrEqual(FLOW_TIME.checkMinutes);
    }
  });

  it('never checks the base commit with less time than the branch\'s check took', async () => {
    // A 14-minute branch check cannot be compared with a base check limited
    // to 13: the base would time out and read as failing too.
    const run = await runTimed({
      agents: { 'check-discovery': 1, 'implementer': 1, 'check-repair': 1 },
      checks: [{ minutes: FLOW_TIME.checkLimitMinutes, verdict: 'fail' }],
      baseline: { minutes: 1, verdict: 'fail' },
    }, 'simple');
    expect(run.names).not.toContain('base-check');
    expect(run.calls.find(call => call.command?.includes('.relayflow/check-report.md'))?.command).toMatch(/baseline=skipped; /);
  });

  it('reports a base check that timed out as unknown, not as failing too, when the branch failed outright', async () => {
    const run = await runTimed({
      agents: { 'check-discovery': 1, 'implementer': 1, 'check-repair': 1 },
      checks: [{ minutes: 3, verdict: 'fail' }],
      baseline: { minutes: 100, verdict: 'fail' },
    }, 'simple');
    expect(run.names).toContain('base-check');
    expect(run.calls.find(call => call.command?.includes('.relayflow/check-report.md'))?.command).toMatch(/baseline=unknown; /);
    expect(errorsOf(run)).not.toMatch(/as far as the base commit shows/);
  });

  it('stops a slow implementer where the 60-minute plan did, and still checks, publishes and reviews', async () => {
    // The implementer spends everything it is given: it is stopped by minute
    // buildByMinutes, and what follows has room for the checks, publishing at
    // every step's limit, and the review, instead of skipping the checks.
    const run = await runTimed({ agents: { 'implementer': 100 }, checks: [{ minutes: 5, verdict: 'pass' }], fullTimeouts: true });
    const implementer = run.calls.find(call => call.name === 'implementer')!;
    expect(implementer.timedOut).toBe(true);
    // The clock starts after the two steps before its first read.
    expect(implementer.atMinute + implementer.minutes).toBeLessThanOrEqual(FLOW_TIME.buildByMinutes + 2 * FLOW_TIME.defaultStepMinutes);
    expect(errorsOf(run)).toMatch(/implementer was stopped at its \d+m limit/);
    expect(errorsOf(run)).not.toMatch(/skipped the checks/i);
    const report = run.calls.find(call => call.command?.includes('.relayflow/check-report.md'));
    expect(report?.command).toMatch(/^check=pass; .*implementer_timeout=yes; /);
    expect(run.opened?.command).toContain(' --draft');
    expect(run.names).toContain('adversary');
    expect(run.names).not.toContain('time-stop');
    expect(run.refused).toBeNull();
  });

  it('counts parallel prototypes as the budget does, three charges for one stretch of clock', async () => {
    const run = await runTimed({
      agents: { 'prototype': 100, 'comparator': 100, 'implementer': 100, 'check-repair': 100, 'adversary': 100 },
      checks: [{ minutes: FLOW_TIME.checkLimitMinutes, verdict: 'fail' }],
    }, 'prototype', { parallel: ['prototype'] });
    const prototypes = named(run, 'prototype');
    expect(prototypes).toHaveLength(3);
    // Each prototype gets a third of what is left after the later steps' floors.
    expect(new Set(prototypes.map(call => call.limit)).size).toBe(1);
    expect(prototypes[0]!.limit!).toBeLessThanOrEqual(FLOW_TIME.prototypeMinutes);
    expect(run.refused).toBeNull();
    expect(run.opened).toBeDefined();
    expect(run.chargedMinutes).toBeLessThanOrEqual(FLOW_TIME.bodyMinutes + 2 * FLOW_TIME.defaultStepMinutes);
  });
});

describe('timed-out agent steps (agentrelay.com#138)', () => {
  it('counts a timed-out repair as a failed attempt: re-check, then the draft and its report', async () => {
    const run = await runTimed({
      agents: { 'check-discovery': 1, 'implementer': 1, 'check-repair': 200 },
      checks: [{ minutes: 2, verdict: 'fail' }],
      baseline: { minutes: 2, verdict: 'fail' },
    }, 'simple');
    const repairs = named(run, 'check-repair');
    // Stopped at its allowance and charged exactly that; not tried again.
    expect(repairs).toHaveLength(1);
    expect(repairs[0]).toMatchObject({ minutes: FLOW_TIME.repairMinutes, timedOut: true });
    expect(after(run, 'check-repair').map(call => call.name)).toContain('check');
    expect(errorsOf(run)).toContain(`check-repair was stopped at its ${FLOW_TIME.repairMinutes}m limit`);
    // The existing path for checks that still fail: the base commit is
    // compared and the pull request opens as a draft.
    expect(run.names).toContain('base-check');
    expect(run.opened?.command).toContain(' --draft');
    expect(run.refused).toBeNull();
  });

  it('keeps a repair that passes the re-check despite its time-out', async () => {
    const run = await runTimed({
      agents: { 'check-repair': 200 },
      checks: [{ minutes: 2, verdict: 'fail' }, { minutes: 2, verdict: 'pass' }],
    }, 'simple');
    expect(named(run, 'check-repair')).toHaveLength(1);
    expect(run.names).not.toContain('base-check');
    expect(run.opened?.command).not.toContain(' --draft');
  });

  it('never reads a timed-out review as clean: the pull request goes to draft with the report', async () => {
    // Even a review.clean the stopped reviewer left behind does not count.
    for (const workflow of ['traditional', 'prototype'] as const) {
      const run = await runTimed({
        agents: { 'check-discovery': 1, 'prototype': 1, 'comparator': 1, 'implementer': 1, 'adversary': 200 },
        checks: [{ minutes: 2, verdict: 'pass' }],
        reviewClean: true,
      }, workflow, { parallel: ['prototype'] });
      const review = run.calls.find(call => call.name === 'adversary')!;
      expect(review).toMatchObject({ minutes: FLOW_TIME.reviewMinutes, timedOut: true });
      expect(after(run, 'adversary').some(call => call.command?.startsWith('test -f review.clean'))).toBe(false);
      // The reviewer starts without an earlier review.md, so a stopped one can
      // never pass off older findings as its own.
      expect(run.calls[run.calls.indexOf(review) - 1]?.command).toBe('rm -f review.clean review.md');
      const blocked = run.calls.find(call => call.name === 'review-blocked');
      expect(blocked?.command).toMatch(/^review_timeout=yes; /);
      expect(errorsOf(run)).toContain(`adversary was stopped at its ${FLOW_TIME.reviewMinutes}m limit`);
      expect(run.finish).toBe('step_failed');
    }
  });

  it('runs no fix round after an unresolved review: the findings go on the draft', async () => {
    const run = await runTimed({ agents: {}, checks: [{ minutes: 2, verdict: 'pass' }] });
    expect(named(run, 'adversary')).toHaveLength(1);
    expect(run.names).not.toContain('fixer');
    expect(run.names).toContain('review-blocked');
    // Pushed once: nothing is revised after the pull request opens.
    expect(run.names.filter(name => name === 'push')).toHaveLength(1);
    expect(run.finish).toBe('step_failed');
  });

  it('falls back to the ecosystem default when check discovery times out', async () => {
    const run = await runTimed({ agents: { 'check-discovery': 200 }, checks: [{ minutes: 2, verdict: 'pass' }] }, 'simple');
    expect(run.calls.find(call => call.name === 'check-discovery')).toMatchObject({ minutes: FLOW_TIME.discoveryMinutes, timedOut: true });
    // What it left half-written is not a recipe; the resolver writes the default.
    expect(after(run, 'check-discovery')[0]!.command).toBe('rm -f .relayflow/check.sh');
    expect(errorsOf(run)).toContain(`check-discovery was stopped at its ${FLOW_TIME.discoveryMinutes}m limit`);
  });

  it('states no agent limits for a local run, so an older runtime still runs it', async () => {
    const run = await runTimed({
      agents: { 'check-repair': 50, 'adversary': 25, 'implementer': 40 },
      checks: [{ minutes: 5, verdict: 'fail' }, { minutes: 5, verdict: 'pass' }],
    }, 'traditional', { target: 'local' });
    expect(run.calls.some(call => call.timedOut)).toBe(false);
    expect(run.calls.filter(call => call.command === undefined && call.limit !== undefined)).toEqual([]);
    expect(run.calls.find(call => call.name === 'check-repair')?.minutes).toBe(50);
    expect(errorsOf(run)).not.toMatch(/was stopped at its/);
    expect(run.opened).toBeDefined();
  });
});
