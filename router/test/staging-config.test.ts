// The staging Worker configs (wrangler `env.staging`) must never bind or name
// production Cloud, must keep analytics off, and must leave the production
// top-level config's bindings alone. Read with wrangler's own config reader,
// so this is what `wrangler deploy [--env staging]` would use.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { unstable_readConfig } from "wrangler";
import { describe, expect, it } from "vitest";

const routerConfigPath = fileURLToPath(new URL("../wrangler.jsonc", import.meta.url));
const webConfigPath = fileURLToPath(new URL("../../web/wrangler.jsonc", import.meta.url));
const stagingWorkflow = readFileSync(
  fileURLToPath(new URL("../../.github/workflows/deploy-staging.yml", import.meta.url)),
  "utf8",
);

const read = (config: string, env: string) => unstable_readConfig({ config, env }, { hideWarnings: true });

const PROD_CLOUD = ["origin.agentrelay.cloud", "cloud-web-worker", "incoming-webhooks.agentrelay.com", "prod-aws.agentrelay.com"];

describe("staging router config", () => {
  const staging = read(routerConfigPath, "staging");

  it("is a separate Worker on public-staging only", () => {
    expect(staging.name).toBe("agentrelay-router-staging");
    expect(staging.routes).toEqual([{ pattern: "public-staging.agentrelay.com", custom_domain: true }]);
    expect(staging.vars.ROUTER_ENV).toBe("staging");
    expect(staging.vars.WEB_ORIGIN).toBe("https://origin-web-staging.agentrelay.com");
  });

  it("binds no production Cloud, relay-agent, KV, R2 or analytics", () => {
    expect(staging.services).toEqual([]);
    expect(staging.kv_namespaces).toEqual([]);
    expect(staging.r2_buckets).toEqual([]);
    expect(staging.analytics_engine_datasets).toEqual([]);
    expect(staging.vars).not.toHaveProperty("CLOUD_APP_ORIGIN");
    expect(staging.vars).not.toHaveProperty("WEBHOOK_WORKER_ORIGIN");
    const serialized = JSON.stringify({
      vars: staging.vars, services: staging.services, routes: staging.routes,
    });
    for (const prod of PROD_CLOUD) expect(serialized).not.toContain(prod);
  });
});

describe("production router config", () => {
  const prod = read(routerConfigPath, "");

  it("adds only the public.agentrelay.com route", () => {
    expect(prod.name).toBe("agentrelay-router");
    expect(prod.routes).toEqual([
      { pattern: "agentrelay.com", custom_domain: true },
      { pattern: "arelay.to", custom_domain: true },
      { pattern: "www.arelay.to", custom_domain: true },
      { pattern: "public.agentrelay.com", custom_domain: true },
    ]);
    expect(prod.vars).not.toHaveProperty("ROUTER_ENV");
    expect(prod.vars).not.toHaveProperty("WEB_ORIGIN");
    expect(prod.vars).not.toHaveProperty("CLOUD_PROXY_ORIGIN");
  });
});

describe("staging web config", () => {
  it("is a separate Worker on its own origin domain", () => {
    const staging = read(webConfigPath, "staging");
    expect(staging.name).toBe("agentrelay-web-staging");
    expect(staging.routes).toEqual([{ pattern: "origin-web-staging.agentrelay.com", custom_domain: true }]);
    expect(read(webConfigPath, "").routes).toEqual([{ pattern: "origin-web.agentrelay.com", custom_domain: true }]);
  });
});

describe("staging deploy workflow", () => {
  it("runs on manual dispatch only", () => {
    const on = /^on:\n([\s\S]*?)\n\S/m.exec(stagingWorkflow)?.[1] ?? "";
    expect(on.trim()).toBe("workflow_dispatch:");
  });

  it("keeps analytics off", () => {
    // No router analytics secret, and the web build only takes a staging-only
    // PostHog key (unset means PostHog is disabled).
    expect(stagingWorkflow).not.toContain("ANALYTICS_VISITOR_HASH_SECRET");
    expect(stagingWorkflow).not.toContain("secrets-file");
    expect(stagingWorkflow).toContain("NEXT_PUBLIC_POSTHOG_KEY: ${{ vars.STAGING_NEXT_PUBLIC_POSTHOG_KEY }}");
    expect(stagingWorkflow).not.toMatch(/vars\.NEXT_PUBLIC_POSTHOG_KEY/);
  });

  it("deploys only the staging environments", () => {
    const deploys = stagingWorkflow.match(/wrangler deploy[^\n]*/g) ?? [];
    expect(deploys).toEqual(["wrangler deploy --env staging", "wrangler deploy --env staging"]);
  });
});
