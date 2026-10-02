import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import {
  FLOW_BASE_CHECK_COMMAND,
  FLOW_CHECK_RUN_COMMAND,
  FLOW_OPEN_CHANGE_COMMAND,
  FLOW_PUBLISH_CHECK_COMMAND,
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
};

/**
 * Runs the generated flow against a simulated clock and the kernel's budget
 * rule (flows `AuthoredBudget`): every step's wallclock is charged, and a step
 * is refused once the charged total exceeds the header's wallclock. Every
 * other command takes 5 seconds.
 */
async function runTimed(timing: Timing, workflow: FactoryDraft['workflow'] = 'traditional', options: { parallel?: string[] } = {}) {
  const source = factorySource({ ...draft, workflow });
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
  const calls: { name: string; atMinute: number }[] = [];
  const errors: string[] = [];
  let finish = '';
  let refused: string | null = null;
  const step = (name: string, ms: number, parallel = false) => {
    // Strictly greater, as the kernel compares (flows authored-budget.ts,
    // machine/budget.rs): a step is refused once the charged time exceeds the limit.
    if (charged > budgetMs) {
      refused = name;
      throw new Error(`Flow budget exceeded before step "${name}"`);
    }
    calls.push({ name, atMinute: charged / MINUTE });
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
      agent: async (name: string) => {
        // Agents started together (prototypes) run at once: each is charged
        // in full, but the wall clock moves once for the whole group.
        step(name, agentMinutes(name) * MINUTE, options.parallel?.some(prefix => name.startsWith(prefix)) ?? false);
      },
      run: async (command: string) => {
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
        step(command.startsWith(FLOW_OPEN_CHANGE_COMMAND) ? 'open-change' : command === FLOW_TIME_STOP_COMMAND ? 'time-stop' : command === FLOW_REVIEW_BLOCKED_COMMAND ? 'review-blocked' : 'run', 5000);
        // The flow reads the clock through a journaled step.
        if (command === 'date +%s') return String(epoch + Math.floor(wallMs / 1000));
        if (command.endsWith(FLOW_PUBLISH_CHECK_COMMAND)) return 'publish';
        if (command.endsWith(FLOW_VALIDATE_CHANGE_METADATA_COMMAND)) return 'valid';
        if (command === 'git rev-parse HEAD') return 'abc123';
        if (command.startsWith('test -f review.clean')) return 'no';
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
    // A review round starts only when the review and a time-stop publish fit.
    expect(t.reviewStartMinutes).toBe(t.reviewMinutes + t.publishMinutes);
    // A fix round is the fixer, its check, the next review, and publishing.
    expect(t.fixRoundStartMinutes).toBe(t.fixerMinutes + t.checkMinutes + t.reviewMinutes + t.publishMinutes);
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
    const run = await runTimed({
      agents: { 'planner': 10, 'plan-reviewer': 10, 'check-discovery': 10, 'implementer': 30, 'check-repair': FLOW_TIME.repairMinutes, 'adversary': FLOW_TIME.reviewMinutes, 'fixer': FLOW_TIME.fixerMinutes },
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
    // The kernel charges each prototype's own time; three 30m prototypes in
    // parallel cost 90m of budget in 30m of wall clock.
    const timing: Timing = {
      agents: { 'prototype': 30, 'comparator': 10, 'implementer': 30, 'check-repair': FLOW_TIME.repairMinutes, 'adversary': FLOW_TIME.reviewMinutes },
      checks: [{ minutes: FLOW_TIME.checkMinutes, verdict: 'fail' }],
      baseline: { minutes: FLOW_TIME.checkMinutes, verdict: 'fail' },
    };
    const run = await runTimed(timing, 'prototype', { parallel: ['prototype'] });
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
  });
});
