import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import {
  FLOW_BASE_CHECK_COMMAND,
  FLOW_CHECK_RUN_COMMAND,
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
// repository and two repair passes took 57 min.

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
  /** Minutes each named agent step takes (prefix match: "check-repair-1" matches "check-repair"). */
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

/**
 * Runs the generated flow against a simulated clock and the kernel's budget
 * rule (flows `AuthoredBudget`): every step's wallclock is charged, and a step
 * is refused once the charged total exceeds the header's wallclock. Every
 * other command takes 5 seconds, or its whole limit with `fullTimeouts`. An
 * agent that would run past its `timeout` is stopped there, as relayflows
 * 2.0.40 does (agentrelay.com#138): it is charged exactly its limit and its
 * step resolves with `completionReason: "timeout"`.
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
  const calls: { name: string; atMinute: number; minutes: number; command?: string; timedOut?: boolean }[] = [];
  const errors: string[] = [];
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
        if (timedOut) calls[calls.length - 1]!.timedOut = true;
        return { completionReason: timedOut ? 'timeout' : 'success', summary: '', artifacts: [] };
      },
      run: async (command: string, runOptions?: { timeout?: string }) => {
        if (command === FLOW_CHECK_RUN_COMMAND) {
          const check = timing.checks[Math.min(checkIndex++, timing.checks.length - 1)]!;
          step('check', check.minutes * MINUTE);
          return check.verdict;
        }
        if (command.endsWith(FLOW_BASE_CHECK_COMMAND)) {
          const base = timing.baseline ?? { minutes: 15, verdict: 'fail' };
          step('base-check', base.minutes * MINUTE);
          return base.verdict;
        }
        const ms = !timing.fullTimeouts ? 5000 : durationMs(runOptions?.timeout) ?? FLOW_TIME.defaultStepMinutes * MINUTE;
        step(command.startsWith(FLOW_OPEN_CHANGE_COMMAND) ? 'open-change' : command.includes(FLOW_PUSH_COMMAND) ? 'push' : command === FLOW_TIME_STOP_COMMAND ? 'time-stop' : command.endsWith(FLOW_REVIEW_BLOCKED_COMMAND) ? 'review-blocked' : 'run', ms, false, command);
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
  return { calls, errors, finish, refused, budgetMs, chargedMinutes: charged / MINUTE, opened };
}

describe('Garden flow time budget (cloud#4108)', () => {
  it('states the worst-case arithmetic the generated flow is built on', () => {
    const t = FLOW_TIME;
    // The header's wallclock is the Cloud run-budget maximum (180m), less the
    // setup Cloud spends before the flow body starts.
    expect(t.headerMinutes).toBe(180);
    expect(t.bodyMinutes).toBe(t.headerMinutes - t.setupMinutes);
    // A repair starts only when it, the re-check, the base-commit check that a
    // still-failing check triggers, and publishing all fit.
    expect(t.repairStartMinutes).toBe(t.repairMinutes + t.checkMinutes + t.checkMinutes + t.publishMinutes);
    // A review round starts only when the review, its local steps and closing
    // fit; the pull request is already open.
    expect(t.reviewStartMinutes).toBe(t.reviewMinutes + 4 * t.defaultStepMinutes + t.closeMinutes);
    // A fix round is the fixer, its check, the next review, and publishing.
    expect(t.fixRoundStartMinutes).toBe(t.fixerMinutes + t.checkMinutes + t.reviewMinutes + t.publishMinutes);
    // Publishing at every step's limit (agentrelay.com#135): drop working
    // files and open the change request at forgeMinutes, the push at
    // pushMinutes (its workflow-edit fallback pushes twice and may comment),
    // four local steps at the kernel's default, then closing: one
    // draft-and-comment follow-up and the review-findings report.
    expect(t.pushMinutes).toBeGreaterThanOrEqual(2 * t.forgeMinutes + t.followUpMinutes);
    expect(t.closeMinutes).toBeGreaterThanOrEqual(t.followUpMinutes + t.defaultStepMinutes);
    expect(t.publishMinutes).toBeGreaterThanOrEqual(t.forgeMinutes + t.pushMinutes + t.forgeMinutes + 4 * t.defaultStepMinutes + t.closeMinutes);
    // The allowances cover the longest steps measured on 2026-10-01: a check
    // run of 14m00s (15m lease), repair agents of 37m18s and 44m09s.
    expect(t.checkMinutes).toBeGreaterThanOrEqual(15);
    expect(t.repairMinutes).toBeGreaterThanOrEqual(45);
  });

  it('declares the 3h wallclock in the header, from the same constant', () => {
    expect(factorySource(draft)).toContain('{ budget: { wallclock: "3h" } }');
  });

  it('publishes run bda21b91 (measured step times) instead of dying on the budget', async () => {
    // bda21b91: planning/discovery agents 4m47s / 9m24s / 5m57s / 6m22s,
    // checks 11m30s fail, 11m21s fail, 14m00s pass, repairs 19m27s and 37m18s.
    const run = await runTimed({
      agents: { 'planner': 4.8, 'plan-reviewer': 9.4, 'check-discovery': 6, 'implementer': 6.4, 'check-repair-1': 19.5, 'check-repair-2': 37.3, 'adversary': 8, 'fixer': 15 },
      checks: [{ minutes: 11.5, verdict: 'fail' }, { minutes: 11.4, verdict: 'fail' }, { minutes: 14, verdict: 'pass' }],
    });
    expect(run.refused).toBeNull();
    expect(run.opened).toBeDefined();
    expect(run.chargedMinutes).toBeLessThanOrEqual(run.budgetMs / MINUTE);
  });

  it('still publishes when every check times out and every repair and review takes its full allowance', async () => {
    // The implementer leaves no time to repair or check the base commit, and
    // less than a review round (reviewStartMinutes) once the pull request is
    // open, so the run must stop for time.
    const run = await runTimed({
      agents: { 'planner': 10, 'plan-reviewer': 10, 'check-discovery': 10, 'implementer': 105, 'check-repair': FLOW_TIME.repairMinutes, 'adversary': FLOW_TIME.reviewMinutes, 'fixer': FLOW_TIME.fixerMinutes },
      checks: [{ minutes: FLOW_TIME.checkMinutes, verdict: 'timeout' }],
      baseline: { minutes: FLOW_TIME.checkMinutes, verdict: 'fail' },
    });
    expect(run.refused).toBeNull();
    expect(run.opened).toBeDefined();
    expect(run.chargedMinutes).toBeLessThanOrEqual(FLOW_TIME.bodyMinutes);
    // Out of time, the work is kept as a draft and the run asks for a person.
    expect(run.calls.map(call => call.name)).toContain('time-stop');
    expect(run.finish).toBe('needs_human');
    expect(run.errors.join('\n')).toMatch(/out of time/i);
  });

  it('never runs out of budget when every step takes its full limit, at the edge of every guard (agentrelay.com#135)', async () => {
    // Every step is charged its whole timeout or the 30s default, and every
    // agent its whole allowance. Sweeping the implementer moves the run
    // across each guard's edge: wherever a repair, review or fix round only
    // just starts, what follows it must still fit. Failing checks spend the
    // time on repairs; passing ones after short planning reach a fix round.
    const fixRounds: Record<string, number> = { traditional: 0, prototype: 0, simple: 0 };
    const guarded: Record<string, number> = { traditional: 0, prototype: 0, simple: 0 };
    let checked = 0;
    let timedOut = 0;
    for (const workflow of ['traditional', 'prototype', 'simple'] as const) for (const [verdict, early] of [['timeout', 10], ['pass', 1]] as const) {
      for (let implementer = 0; implementer <= 150; implementer += 0.5) {
        const run = await runTimed({
          // The long agents would run on well past their limits (agentrelay.com#138),
          // so each is stopped at, and charged exactly, its FLOW_TIME allowance.
          agents: { 'planner': early, 'plan-reviewer': early, 'check-discovery': early, 'prototype': 2 * early, 'comparator': early, 'implementer': implementer, 'check-repair': 10 * FLOW_TIME.repairMinutes, 'adversary': 10 * FLOW_TIME.reviewMinutes, 'fixer': 10 * FLOW_TIME.fixerMinutes },
          checks: [{ minutes: FLOW_TIME.checkMinutes, verdict }],
          baseline: { minutes: FLOW_TIME.checkMinutes, verdict: 'fail' },
          fullTimeouts: true,
        }, workflow, { parallel: ['prototype'] });
        // The guards protect publishing from the optional steps; they cannot
        // make room when the mandatory path alone (everything up to the
        // implementer, the implementer, one check, publishing) does not fit.
        const implementerStart = run.calls.find(call => call.name === 'implementer')!.atMinute;
        if (implementerStart + implementer + FLOW_TIME.checkMinutes + FLOW_TIME.publishMinutes + 2 * FLOW_TIME.defaultStepMinutes > FLOW_TIME.bodyMinutes) break;
        checked++;
        expect(run.refused, `${workflow}, ${verdict}, implementer ${implementer}m`).toBeNull();
        expect(run.opened, `${workflow}, ${verdict}, implementer ${implementer}m`).toBeDefined();
        // The kernel refuses only a step that would start past the budget, so
        // the last step may end past it. The guards keep that to the two
        // steps before the flow first reads its clock (the working-file
        // exclude and that read), charged here at 30s each.
        expect(run.chargedMinutes).toBeLessThanOrEqual(FLOW_TIME.bodyMinutes + 2 * FLOW_TIME.defaultStepMinutes);
        const names = run.calls.map(call => call.name);
        for (const call of run.calls) {
          const limit = call.name.startsWith('check-repair') ? FLOW_TIME.repairMinutes : call.name.startsWith('adversary') ? FLOW_TIME.reviewMinutes : call.name === 'fixer' ? FLOW_TIME.fixerMinutes : undefined;
          if (limit === undefined) continue;
          expect(call.timedOut, call.name).toBe(true);
          expect(call.minutes, call.name).toBe(limit);
          timedOut++;
        }
        // The run reached a guard that chose to run its optional step.
        if (names.some(name => name.startsWith('check-repair') || name === 'base-check' || name.startsWith('adversary'))) guarded[workflow]!++;
        if (names.includes('fixer')) {
          fixRounds[workflow]!++;
          // The fix round's re-publish runs after the fixer, and the run still closes.
          expect(names.slice(names.indexOf('fixer')).filter(name => name === 'push')).toHaveLength(1);
          expect(names.some(name => name === 'review-blocked' || name === 'time-stop')).toBe(true);
        }
      }
    }
    // Not vacuous: every workflow runs guarded optional steps (prototypes run
    // in parallel, as the budget charges them), and traditional, the only one
    // with a fixer, reaches a fix round.
    expect(checked).toBeGreaterThan(100);
    expect(timedOut).toBeGreaterThan(100);
    for (const workflow of ['traditional', 'prototype', 'simple']) expect(guarded[workflow], workflow).toBeGreaterThan(0);
    expect(fixRounds.traditional).toBeGreaterThan(0);
  }, 30_000); // About a thousand simulated runs.

  it('skips a repair it cannot afford and publishes the draft with time to spare', async () => {
    const run = await runTimed({
      agents: { 'implementer': 120, 'check-repair': FLOW_TIME.repairMinutes },
      checks: [{ minutes: FLOW_TIME.checkMinutes, verdict: 'fail' }],
      baseline: { minutes: FLOW_TIME.checkMinutes, verdict: 'fail' },
    }, 'simple');
    expect(run.refused).toBeNull();
    expect(run.calls.filter(call => call.name.startsWith('check-repair'))).toHaveLength(0);
    expect(run.opened).toBeDefined();
    expect(run.errors.join('\n')).toMatch(/skipped the repair/i);
  });

  it('changes nothing for a run with time to spare', async () => {
    const run = await runTimed({ agents: {}, checks: [{ minutes: 5, verdict: 'fail' }, { minutes: 5, verdict: 'pass' }] });
    expect(run.calls.filter(call => call.name.startsWith('check-repair'))).toHaveLength(1);
    expect(run.calls.map(call => call.name)).not.toContain('time-stop');
    expect(run.calls.filter(call => call.name.startsWith('adversary'))).toHaveLength(2);
  });

  it('counts parallel prototypes as the budget does, three charges for one stretch of clock', async () => {
    // Three 20m prototypes in parallel take 20m of wall clock but 60m of
    // budget. By the first failed check the clock shows about 80m used, which
    // would leave room for a repair; the budget has spent about 120m, which
    // does not. Counting only the clock starts the repair and is refused
    // before publishing.
    const run = await runTimed({
      agents: { 'prototype': 20, 'comparator': 10, 'implementer': 30, 'check-repair': FLOW_TIME.repairMinutes, 'adversary': FLOW_TIME.reviewMinutes },
      checks: [{ minutes: FLOW_TIME.checkMinutes, verdict: 'fail' }],
      baseline: { minutes: FLOW_TIME.checkMinutes, verdict: 'fail' },
    }, 'prototype', { parallel: ['prototype'] });
    expect(run.calls.filter(call => call.name.startsWith('check-repair'))).toHaveLength(0);
    expect(run.refused).toBeNull();
    expect(run.opened).toBeDefined();
  });

  it('reports the first review\'s findings when there is no time for a fix round', async () => {
    const run = await runTimed({
      agents: { 'planner': 10, 'plan-reviewer': 10, 'implementer': 60, 'adversary': FLOW_TIME.reviewMinutes },
      checks: [{ minutes: FLOW_TIME.checkMinutes, verdict: 'pass' }],
    });
    expect(run.refused).toBeNull();
    expect(run.calls.map(call => call.name)).not.toContain('fixer');
    expect(run.calls.map(call => call.name)).toContain('review-blocked');
    expect(run.errors.join('\n')).toMatch(/out of time for a fix round/i);
  });

  it('skips the base-commit check rather than run out of time before publishing', async () => {
    const run = await runTimed({
      agents: { 'implementer': 150 },
      checks: [{ minutes: FLOW_TIME.checkMinutes, verdict: 'fail' }],
      baseline: { minutes: FLOW_TIME.checkMinutes, verdict: 'fail' },
    }, 'simple');
    expect(run.refused).toBeNull();
    expect(run.calls.map(call => call.name)).not.toContain('base-check');
    expect(run.opened).toBeDefined();
    // Nothing was checked, so the run must not claim the base commit fails too.
    expect(run.errors.join('\n')).toMatch(/no time left to check the base commit/);
    expect(run.errors.join('\n')).not.toMatch(/as far as the base commit shows/);
  });
});

describe('timed-out agent steps (agentrelay.com#138)', () => {
  const errorsOf = (run: Awaited<ReturnType<typeof runTimed>>) => run.errors.join('\n');
  const after = (run: Awaited<ReturnType<typeof runTimed>>, name: string) => run.calls.slice(run.calls.findIndex(call => call.name === name) + 1);

  it('counts a timed-out repair as a failed attempt: re-check, then the draft and its report', async () => {
    const run = await runTimed({
      agents: { 'check-repair': 200 },
      checks: [{ minutes: 5, verdict: 'fail' }],
      baseline: { minutes: 5, verdict: 'fail' },
    }, 'simple');
    const repairs = run.calls.filter(call => call.name.startsWith('check-repair'));
    // Stopped at its allowance and charged exactly that; not tried again.
    expect(repairs).toHaveLength(1);
    expect(repairs[0]).toMatchObject({ minutes: FLOW_TIME.repairMinutes, timedOut: true });
    expect(after(run, 'check-repair-1')[0]!.name).toBe('check');
    expect(errorsOf(run)).toContain(`check-repair-1 was stopped at its ${FLOW_TIME.repairMinutes}m limit`);
    // The existing path for checks that still fail: the base commit is
    // compared and the pull request opens as a draft.
    expect(run.calls.map(call => call.name)).toContain('base-check');
    expect(run.opened?.command).toContain(' --draft');
    expect(run.refused).toBeNull();
  });

  it('keeps a repair that passes the re-check despite its time-out', async () => {
    const run = await runTimed({
      agents: { 'check-repair': 200 },
      checks: [{ minutes: 5, verdict: 'fail' }, { minutes: 5, verdict: 'pass' }],
    }, 'simple');
    expect(run.calls.filter(call => call.name.startsWith('check-repair'))).toHaveLength(1);
    expect(run.calls.map(call => call.name)).not.toContain('base-check');
    expect(run.opened?.command).not.toContain(' --draft');
  });

  it('never reads a timed-out review as clean: the pull request goes to draft with the report', async () => {
    // Even a review.clean the stopped reviewer left behind does not count.
    const run = await runTimed({
      agents: { 'adversary': 200 },
      checks: [{ minutes: 5, verdict: 'pass' }],
      reviewClean: true,
    }, 'prototype');
    const review = run.calls.find(call => call.name === 'adversary-1')!;
    expect(review).toMatchObject({ minutes: FLOW_TIME.reviewMinutes, timedOut: true });
    expect(after(run, 'adversary-1').some(call => call.command?.startsWith('test -f review.clean'))).toBe(false);
    const blocked = run.calls.find(call => call.name === 'review-blocked');
    expect(blocked?.command).toMatch(/^review_timeout=yes; /);
    expect(errorsOf(run)).toContain(`adversary-1 was stopped at its ${FLOW_TIME.reviewMinutes}m limit`);
    expect(run.finish).toBe('step_failed');
  });

  it('treats a timed-out first review like an unresolved one: a fix round, then the second review decides', async () => {
    const run = await runTimed({
      agents: { 'adversary-1': 200, 'adversary-2': 5 },
      checks: [{ minutes: 5, verdict: 'pass' }],
      reviewClean: true,
    });
    expect(run.calls.filter(call => call.name.startsWith('adversary'))).toHaveLength(2);
    expect(run.calls.find(call => call.name === 'adversary-1')?.timedOut).toBe(true);
    expect(run.calls.map(call => call.name)).toContain('fixer');
    // The second review finished and left review.clean: the run parks for a person.
    expect(run.calls.map(call => call.name)).not.toContain('review-blocked');
    expect(run.finish).toBe('needs_human');
  });

  it('keeps a timed-out fixer\'s work and checks it as usual', async () => {
    const run = await runTimed({
      agents: { 'fixer': 200 },
      checks: [{ minutes: 5, verdict: 'pass' }],
    });
    expect(run.calls.find(call => call.name === 'fixer')).toMatchObject({ minutes: FLOW_TIME.fixerMinutes, timedOut: true });
    expect(errorsOf(run)).toContain(`fixer was stopped at its ${FLOW_TIME.fixerMinutes}m limit`);
    const next = after(run, 'fixer').map(call => call.name);
    expect(next[0]).toBe('check');
    expect(next).toContain('push');
    expect(next).toContain('adversary-2');
    expect(run.refused).toBeNull();
  });

  it('falls back to the ecosystem default when check discovery times out', async () => {
    const run = await runTimed({ agents: { 'check-discovery': 200 }, checks: [{ minutes: 5, verdict: 'pass' }] }, 'simple');
    expect(run.calls.find(call => call.name === 'check-discovery')).toMatchObject({ minutes: FLOW_TIME.discoveryMinutes, timedOut: true });
    // What it left half-written is not a recipe; the resolver writes the default.
    expect(after(run, 'check-discovery')[0]!.command).toBe('rm -f .relayflow/check.sh');
    expect(errorsOf(run)).toContain(`check-discovery was stopped at its ${FLOW_TIME.discoveryMinutes}m limit`);
  });

  it('states no agent limits for a local run, so an older runtime still runs it', async () => {
    const run = await runTimed({
      agents: { 'check-repair': 50, 'adversary': 25 },
      checks: [{ minutes: 5, verdict: 'fail' }, { minutes: 5, verdict: 'pass' }],
    }, 'traditional', { target: 'local' });
    expect(run.calls.some(call => call.timedOut)).toBe(false);
    expect(run.calls.find(call => call.name === 'check-repair-1')?.minutes).toBe(50);
    expect(errorsOf(run)).not.toMatch(/was stopped at its/);
  });
});
