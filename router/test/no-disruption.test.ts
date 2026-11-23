// No-disruption proof for the public.* / public-staging.* hosts.
//
// With NO_DISRUPTION_BASE_ROUTER pointing at the base revision's
// router/index.ts (scripts/no-disruption.sh sets this up from a git worktree
// at the PR's merge base), every case in the matrix is replayed through the
// base router and this router with identical production-shaped mocks, and
// the full observations must be identical on every existing host.
//
// Without it (plain `npm test`), the head-vs-head run still proves the
// harness is deterministic, so a reported difference is never noise.
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { buildMatrix, EXISTING_HOSTS, observe, type Observation, type RouterModule } from "./no-disruption/harness.js";

const basePath = process.env.NO_DISRUPTION_BASE_ROUTER;

// A fresh module instance per comparison: index.ts keeps once-per-isolate
// state (the phase-5a log line), and both sides must start from a cold
// isolate, exactly like a fresh deploy.
async function load(specifier: string, instance: string): Promise<RouterModule> {
  return (await import(/* @vite-ignore */ `${specifier}?instance=${instance}`)).default as RouterModule;
}
const HEAD = new URL("../index.ts", import.meta.url).href;
const matrix = buildMatrix();

function header(observation: Observation, name: string): string | undefined {
  return observation.headers.find(([key]) => key === name)?.[1];
}

async function compare(a: RouterModule, b: RouterModule) {
  const differences: Array<{ id: string; a: Observation; b: Observation }> = [];
  let robotsTagged = 0;
  for (const testCase of matrix) {
    const left = await observe(a, testCase);
    const right = await observe(b, testCase);
    if (header(right, "x-robots-tag") !== undefined && header(left, "x-robots-tag") === undefined) robotsTagged++;
    if (JSON.stringify(left) !== JSON.stringify(right)) differences.push({ id: testCase.id, a: left, b: right });
  }
  return { differences, robotsTagged };
}

describe("no-disruption harness", () => {
  it("covers every existing host with a large matrix", () => {
    expect(new Set(matrix.map((testCase) => new URL(testCase.url).hostname))).toEqual(new Set(EXISTING_HOSTS));
    expect(matrix.length).toBeGreaterThan(1500);
  });

  it("is deterministic (head vs head)", async () => {
    const { differences } = await compare(await load(HEAD, "a"), await load(HEAD, "b"));
    expect(differences.map(({ id }) => id)).toEqual([]);
  }, 120_000);
});

describe.skipIf(!basePath)("no-disruption: base router vs this router on existing hosts", () => {
  it("has zero differences across the matrix", async () => {
    const base = await load(pathToFileURL(basePath!).href, "base");
    const { differences, robotsTagged } = await compare(base, await load(HEAD, "head"));
    const summary = [
      JSON.stringify({
        event: "no_disruption_result",
        cases: matrix.length,
        hosts: EXISTING_HOSTS,
        differences: differences.length,
        robotsTagAdded: robotsTagged,
      }),
      ...differences.slice(0, 5).map(({ id, a, b }) => `DIFF ${id}\nbase: ${JSON.stringify(a)}\nhead: ${JSON.stringify(b)}`),
    ].join("\n");
    if (process.env.NO_DISRUPTION_REPORT) writeFileSync(process.env.NO_DISRUPTION_REPORT, `${summary}\n`);
    expect(robotsTagged).toBe(0);
    expect(differences.map(({ id }) => id)).toEqual([]);
  }, 300_000);
});
