// Server-side arelay.to analytics: the router's half of relay-agent's
// docs/ANALYTICS_BRIEF.md. The router writes exactly one event,
// agent_guide_fetched, using the same ordered v1 schema as relay-agent's
// src/analytics.ts. Keep the two layouts identical; the shared tests pin it.
//
// Writes are best-effort and never change a response. No data point carries a
// URL, query string, grant, raw IP, raw User-Agent, or caller-supplied header.

export const ANALYTICS_SCHEMA_VERSION = "v1";
export const ANALYTICS_WRITER = "router";

export type AnalyticsClientClass = "curl" | "claude-code" | "codex" | "grok" | "other";

export interface AnalyticsDataset {
  writeDataPoint(point: {
    indexes?: string[];
    blobs?: string[];
    doubles?: number[];
  }): void;
}

export interface AnalyticsEnv {
  ARELAY_ANALYTICS?: AnalyticsDataset;
  ANALYTICS_VISITOR_HASH_SECRET?: string;
}

const HANDLE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])$/;
const COUNTRY = /^[A-Z][A-Z0-9]$/;

const CLIENT_MARKERS: ReadonlyArray<[AnalyticsClientClass, readonly string[]]> = [
  ["claude-code", ["claude-code", "claude-cli", "claudecode", "claude-user"]],
  ["codex", ["codex"]],
  ["grok", ["grok", "xai-"]],
  ["curl", ["curl/"]],
];

export function classifyClient(userAgent: string | null | undefined): AnalyticsClientClass {
  if (typeof userAgent !== "string" || userAgent.length === 0 || userAgent.length > 1_024) {
    return "other";
  }
  const lowered = userAgent.toLowerCase();
  for (const [client, markers] of CLIENT_MARKERS) {
    if (markers.some((marker) => lowered.includes(marker))) return client;
  }
  return "other";
}

/** Reads `request.cf.country`; caller-controlled headers are never consulted. */
export function requestCountry(request: Request): string {
  const country = (request as Request & { cf?: { country?: unknown } }).cf?.country;
  if (typeof country !== "string") return "unknown";
  const upper = country.toUpperCase();
  return COUNTRY.test(upper) ? upper : "unknown";
}

const encoder = new TextEncoder();

async function hmac(key: ArrayBuffer | Uint8Array<ArrayBuffer>, message: string): Promise<ArrayBuffer> {
  const imported = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", imported, encoder.encode(message));
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Daily, handle-scoped visitor pseudonym (identical to relay-agent's). Returns
 * undefined when the secret is unavailable or hashing fails; the caller then
 * writes nothing.
 */
export async function visitorPseudonym(
  secret: string | undefined,
  handle: string,
  ip: string,
  userAgent: string,
  now = Date.now(),
): Promise<string | undefined> {
  if (!secret) return undefined;
  try {
    const day = new Date(now).toISOString().slice(0, 10);
    const dayKey = await hmac(encoder.encode(secret), `arelay-visitors-v1\0${day}`);
    return hex(await hmac(dayKey, `${handle}\0${ip}\0${userAgent}`));
  } catch {
    return undefined;
  }
}

export function guideFetchedDataPoint(
  handle: string,
  client: AnalyticsClientClass,
  country: string,
  visitor: string,
): { indexes: string[]; blobs: string[]; doubles: number[] } | null {
  if (!HANDLE.test(handle) || !/^[0-9a-f]{64}$/.test(visitor)) return null;
  return {
    indexes: [handle],
    blobs: [
      ANALYTICS_SCHEMA_VERSION,
      "agent_guide_fetched",
      handle,
      "not_applicable",
      client,
      COUNTRY.test(country) ? country : "unknown",
      "none",
      visitor,
      ANALYTICS_WRITER,
    ],
    doubles: [1, -1],
  };
}

/**
 * Records one successful agent guide fetch. Call only after the rewritten
 * /u/<handle>/agent.md upstream returned 2xx for an external GET.
 */
export async function recordGuideFetched(
  request: Request,
  handle: string,
  env: AnalyticsEnv,
): Promise<void> {
  const dataset = env.ARELAY_ANALYTICS;
  if (!dataset) return;
  try {
    const visitor = await visitorPseudonym(
      env.ANALYTICS_VISITOR_HASH_SECRET,
      handle,
      request.headers.get("cf-connecting-ip")?.trim() || "unknown",
      request.headers.get("user-agent") ?? "",
    );
    if (!visitor) return;
    const point = guideFetchedDataPoint(
      handle,
      classifyClient(request.headers.get("user-agent")),
      requestCountry(request),
      visitor,
    );
    if (point) dataset.writeDataPoint(point);
  } catch {
    console.warn("arelay analytics: data point write failed");
  }
}
