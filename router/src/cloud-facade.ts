import { routeClass } from "./edge-timing.js";
import { isPrimaryHost } from "./hosts.js";

export const CLOUD_FACADE_KEY = "cloud-facade-routes";
const ALLOWED_ORIGINS = new Set([
  "https://api.prod-aws.agentrelay.com",
  "https://prod-aws.agentrelay.com",
]);
const HTTP_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
export type FacadeRoute = {
  prefix: string;
  methods?: string[];
  origin: string;
  mode: "off" | "shadow" | "on";
};
type Config = Pick<KVNamespace, "get">;

/** Decode once for matching; reject ambiguous separators/dots. Never rewrite the forwarded path. */
export function decodedFacadePath(pathname: string): string | null {
  // Encoded separators/dots (or a second decoding pass) can disagree with
  // backend routing and bypass a narrower off fence. Leave them with legacy.
  if (/%(?:2f|5c|2e|25)/i.test(pathname)) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || [...decoded].some(char => {
    const code = char.charCodeAt(0);
    return char === "\\" || code < 32 || code === 127;
  })) return null;
  if (decoded.includes("//") || decoded.split("/").some(segment => segment === "." || segment === "..")) return null;
  return decoded.length > 1 ? decoded.replace(/\/$/, "") : decoded;
}

/** One invalid entry invalidates the entire table, including entries in off mode. */
export function parseFacadeRoutes(raw: string | null): FacadeRoute[] {
  if (!raw?.trim()) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  const routes: FacadeRoute[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const { prefix, methods, origin, mode } = entry;
    if (
      typeof prefix !== "string" || !prefix.startsWith("/") ||
      /[\s%*?#{}\\]/.test(prefix) || prefix.includes("[") || prefix.includes("]") || decodedFacadePath(prefix) !== prefix ||
      typeof origin !== "string" || !ALLOWED_ORIGINS.has(origin) ||
      !["off", "shadow", "on"].includes(mode) ||
      (methods !== undefined && (!Array.isArray(methods) || methods.length === 0 ||
        methods.some((method: unknown) => typeof method !== "string" || !HTTP_METHODS.has(method))))
    ) return [];
    routes.push({ prefix, methods, origin, mode });
  }
  return routes;
}

export async function readFacadeRoute(request: Request, config?: Config): Promise<FacadeRoute | null> {
  const url = new URL(request.url);
  // Keep the arelay.to registry, redirects and chat routing independent.
  if (!isPrimaryHost(url.hostname) || isFacadeDenied(request)) return null;
  const pathname = decodedFacadePath(url.pathname);
  if (pathname === null) return null;
  let routes: FacadeRoute[];
  try {
    routes = parseFacadeRoutes((await config?.get(CLOUD_FACADE_KEY)) ?? null);
  } catch {
    return null;
  }
  let match: FacadeRoute | null = null;
  for (const route of routes) {
    // Cloud can accept case variants of these segments. Fold off fences so
    // those variants cannot escape into a broader enabled rule. Keep enabled
    // prefixes literal: this safety check must not widen traffic selection.
    const path = route.mode === "off" ? pathname.toLowerCase() : pathname;
    const prefix = route.mode === "off" ? route.prefix.toLowerCase() : route.prefix;
    const within = prefix === "/" || path === prefix || path.startsWith(prefix + "/");
    if (!within || (route.methods && !route.methods.includes(request.method))) continue;
    // Equal-length ties retain list order. An off entry can fence a narrower subtree.
    if (!match || route.prefix.length > match.prefix.length) match = route;
  }
  return match;
}

/** Labels describe the selected ingress, not proof of which backend answered. */
export function facadeOriginLabel(route: FacadeRoute, pathname: string): "rc" | "rfc" | "web" {
  if (route.origin === "https://api.prod-aws.agentrelay.com") return "rc";
  const path = decodedFacadePath(pathname) ?? "";
  if (/^\/(?:cloud\/)?api\/v1\/(?:flows|workers|workflows)(?:\/|$)/.test(path)) return "rfc";
  return /^\/(?:cloud\/api|login)(?:\/|$)/.test(path) ? "rc" : "web";
}

function facadeRequest(request: Request, origin: string, shadow = false): Request {
  if (!ALLOWED_ORIGINS.has(origin) || isFacadeDenied(request)) throw new Error("Facade route refused");
  // Assign path/search separately: new URL('//host/path', origin) would escape the allowlist.
  const source = new URL(request.url);
  const target = new URL(origin);
  target.pathname = source.pathname;
  target.search = source.search;
  const headers = new Headers(request.headers);
  for (const name of ["host", "forwarded", "x-forwarded-prefix", "x-forwarded-for", "x-real-ip"]) headers.delete(name);
  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) headers.set("x-forwarded-for", clientIp);
  headers.set("x-forwarded-host", "agentrelay.com");
  headers.set("x-original-host", "agentrelay.com");
  headers.set("x-forwarded-proto", "https");
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    body: request.body,
    duplex: "half",
    redirect: "manual",
    ...(shadow ? { signal: AbortSignal.timeout(5_000) } : {}),
  };
  return new Request(target.toString(), init);
}

function facadeResponse(response: Response, label: string): Response {
  const headers = new Headers(response.headers);
  // Workers exposes getAll("set-cookie"); Node's test runtime has getSetCookie.
  // Both preserve cookie boundaries, including commas in Expires.
  const cookieHeaders = response.headers as Headers & { getSetCookie?: () => string[]; getAll?: (name: string) => string[] };
  const cookies = cookieHeaders.getSetCookie?.() ?? cookieHeaders.getAll?.("set-cookie") ?? [];
  headers.delete("set-cookie");
  for (const cookie of cookies) {
    // Until the identity cookie Domain/Path contract is explicitly migrated,
    // never mint or clear a second same-name session cookie at the facade.
    if (/^\s*agent_relay_session\s*=/i.test(cookie)) continue;
    headers.append("set-cookie", cookie.replace(/;\s*domain\s*=[^;]*/gi, ""));
  }
  const location = headers.get("location");
  if (location) {
    try {
      const target = new URL(location, "https://agentrelay.com");
      if (ALLOWED_ORIGINS.has(target.origin)) {
        headers.set("location", `https://agentrelay.com${target.pathname}${target.search}${target.hash}`);
      }
    } catch {
      // Relative redirect values remain relative to the apex.
    }
  }
  headers.set("x-ar-origin", label);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function fetchFacade(request: Request, route: FacadeRoute): Promise<Response> {
  const label = facadeOriginLabel(route, new URL(request.url).pathname);
  try {
    const response = await globalThis.fetch(facadeRequest(request, route.origin));
    if (eventStream(response.headers)) {
      void response.body?.cancel().catch(() => undefined);
      throw new Error("Facade streaming response refused");
    }
    return facadeResponse(response, label);
  } catch {
    // Never replay a failed on-mode mutation into Cloud as an implicit fallback.
    return new Response("Facade upstream unavailable", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-ar-origin": label },
    });
  }
}

// This denylist is independent of KV, and applies to both shadow and on.
const DENIED_SEGMENTS = new Set([
  "auth", "oauth", "login", "logout", "signin", "signout", "signup", "callback", "callbacks",
  "grant", "grants", "token", "tokens", "credential", "credentials", "device",
  "webhook", "webhooks", "mcp", "sse", "stream", "streaming", "key", "keys",
  "register", "enroll", "enrollment",
]);
function eventStream(headers: Headers): boolean {
  return [headers.get("accept"), headers.get("content-type")]
    .some(value => value?.toLowerCase().includes("text/event-stream"));
}

export function isFacadeDenied(request: Request): boolean {
  if (request.headers.has("upgrade") || eventStream(request.headers)) return true;
  const url = new URL(request.url);
  const path = decodedFacadePath(url.pathname);
  if (!path) return true;
  const segments = path.toLowerCase().split("/");
  if (segments.some(segment => segment === ".well-known" ||
    segment.split(/[-_]/).some(word => DENIED_SEGMENTS.has(word)))) return true;
  // Credential minting aliases whose path does not literally say token/key.
  if (/\/relayfile\/mount-session(?:\/|$)/.test(path.toLowerCase()) ||
    /\/clone\/archive-lease(?:\/|$)/.test(path.toLowerCase()) ||
    /\/workflows\/local-run(?:\/|$)/.test(path.toLowerCase()) ||
    (request.method !== "GET" && request.method !== "HEAD" && /\/session-share-links(?:\/|$)/.test(path.toLowerCase()))) return true;
  let credentialQuery = false;
  url.searchParams.forEach((_value, key) => {
    if (/(?:grant|token|code|secret|state|key)/i.test(key)) credentialQuery = true;
  });
  return credentialQuery;
}

// GET alone is not a safety guarantee. This audited read-only upper bound is
// independent of KV: configuration may narrow it, never add another route.
// Use exact read shapes, not arbitrary Sessions descendants. In particular,
// session-pull-requests is excluded because refresh=1 persists provider state.
const SHADOW_READ_PATH = /^\/cloud\/api\/v1\/workspaces\/[^/]+\/(?:sessions(?:\/(?:activity|agents|output))?|sessions\/[^/]+\/delivery-evidence|reflex\/sessions\/[^/]+\/(?:analysis|brief|events)|relayhistory\/origin)$/;
export function isSafeShadowRequest(request: Request): boolean {
  if ((request.method !== "GET" && request.method !== "HEAD") ||
    request.headers.has("range") || isFacadeDenied(request)) return false;
  const path = decodedFacadePath(new URL(request.url).pathname);
  return path !== null && SHADOW_READ_PATH.test(path);
}

const MAX_COMPARE_BYTES = 64 * 1024;
const COMPARE_DEADLINE_MS = 5_000;

async function boundedBody(response: Response): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const read = async () => {
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_COMPARE_BYTES) throw new Error("comparison limit");
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      return bytes;
    } finally {
      // Do not await a tee cancellation: the client may still be reading Cloud.
      void reader.cancel().catch(() => undefined);
    }
  };
  try {
    return await Promise.race([read(), new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        void reader.cancel().catch(() => undefined);
        reject(new Error("comparison deadline"));
      }, COMPARE_DEADLINE_MS);
    })]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function jsonShape(value: unknown, depth = 0): unknown {
  if (depth > 32) throw new Error("comparison depth");
  if (value === null) return "null";
  if (Array.isArray(value)) return ["array", [...new Set(value.map(item =>
    JSON.stringify(jsonShape(item, depth + 1))))].sort()];
  if (typeof value === "object") return ["object", Object.keys(value).sort().map(key =>
    [key, jsonShape((value as Record<string, unknown>)[key], depth + 1)])];
  return typeof value;
}

async function fingerprint(response: Response, method: string): Promise<{ kind: string; hash: string }> {
  const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  let bytes = method === "HEAD" ? new Uint8Array() : await boundedBody(response);
  const json = method !== "HEAD" && (type === "application/json" || type?.endsWith("+json"));
  if (json) bytes = new TextEncoder().encode(JSON.stringify(jsonShape(JSON.parse(new TextDecoder().decode(bytes)))));
  const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer);
  return { kind: json ? "json_shape" : "body_hash",
    hash: [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("") };
}

export async function compareFacadeShadow(request: Request, route: FacadeRoute, baseline: Response): Promise<void> {
  if (route.mode !== "shadow" || !isSafeShadowRequest(request) || eventStream(baseline.headers)) return;
  const path = new URL(request.url).pathname;
  const common = { event: "cloud_facade_shadow", route: routeClass(path), origin: facadeOriginLabel(route, path) };
  let response: Response | undefined;
  let cloudCopy: Response | undefined;
  let cloudFingerprint: Promise<Awaited<ReturnType<typeof fingerprint>> | null> | undefined;
  try {
    // Clone and start the bounded reader before yielding to the target fetch:
    // the client may consume Cloud immediately while the shadow is still pending.
    cloudCopy = baseline.clone();
    cloudFingerprint = fingerprint(cloudCopy, request.method).catch(() => null);
    response = await globalThis.fetch(facadeRequest(request, route.origin, true));
    if (eventStream(response.headers)) return;
    const statuses = { baselineStatus: baseline.status, shadowStatus: response.status };
    if (response.status === 401 && (request.headers.get("authorization") || request.headers.get("cookie"))) {
      console.log(JSON.stringify({ ...common, outcome: "identity_unmigrated", ...statuses }));
      return;
    }
    const [cloud, shadow] = await Promise.all([
      cloudFingerprint, fingerprint(response, request.method),
    ]);
    if (!cloud) throw new Error("Cloud comparison unavailable");
    const statusMatch = baseline.status === response.status;
    const shapeMatch = cloud.kind === shadow.kind && cloud.hash === shadow.hash;
    // Log only booleans and coarse metadata, never bodies, hashes, JSON keys,
    // headers, URLs, IDs, credentials or error text.
    console.log(JSON.stringify({ ...common, outcome: statusMatch && shapeMatch ? "match" : "mismatch",
      comparison: cloud.kind === shadow.kind ? cloud.kind : "different_formats", statusMatch, shapeMatch, ...statuses }));
  } catch {
    console.log(JSON.stringify({ ...common, outcome: "error" }));
  } finally {
    // Keep all bounded copy work within the waitUntil task, including error/401 paths.
    await cloudFingerprint;
    if (response && !response.bodyUsed) void response.body?.cancel().catch(() => undefined);
    if (cloudCopy && !cloudCopy.bodyUsed) void cloudCopy.body?.cancel().catch(() => undefined);
  }
}
