import { routeClass } from "./edge-timing.js";

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

/** Decode once for matching, then normalize slash/dot segments. Never rewrite the forwarded path. */
export function decodedFacadePath(pathname: string): string | null {
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
  const segments: string[] = [];
  for (const segment of decoded.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") segments.pop();
    else segments.push(segment);
  }
  return "/" + segments.join("/");
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
  if (url.hostname !== "agentrelay.com") return null;
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
    const within = route.prefix === "/" || pathname === route.prefix || pathname.startsWith(route.prefix + "/");
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
  if (!ALLOWED_ORIGINS.has(origin)) throw new Error("Facade origin refused");
  // Assign path/search separately: new URL('//host/path', origin) would escape the allowlist.
  const source = new URL(request.url);
  const target = new URL(origin);
  target.pathname = source.pathname;
  target.search = source.search;
  const headers = new Headers(request.headers);
  headers.delete("host");
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
    headers.append("set-cookie", cookie.replace(/;\s*domain\s*=[^;]*/gi, ""));
  }
  headers.set("x-ar-origin", label);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function fetchFacade(request: Request, route: FacadeRoute): Promise<Response> {
  const label = facadeOriginLabel(route, new URL(request.url).pathname);
  try {
    const response = await globalThis.fetch(facadeRequest(request, route.origin));
    return facadeResponse(response, label);
  } catch {
    // Never replay a failed on-mode mutation into Cloud as an implicit fallback.
    return new Response("Facade upstream unavailable", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-ar-origin": label },
    });
  }
}

// A GET method alone is not evidence of safety: OAuth callbacks and grant
// exchanges also use it. Start with the audited Sessions/History read cohort.
const SHADOW_READ_PATH = /^\/cloud\/api\/v1\/workspaces\/[^/]+\/(?:sessions(?:\/(?:[^/]+(?:\/delivery-evidence)?))?|session-(?:share-links|pull-requests)|reflex\/sessions\/[^/]+\/(?:analysis|brief|events)|relayhistory\/origin)$/;
export function isSafeShadowGet(request: Request): boolean {
  if (request.method !== "GET" || request.headers.has("upgrade") || request.headers.has("range") ||
    request.headers.get("accept")?.toLowerCase().includes("text/event-stream")) return false;
  const url = new URL(request.url);
  const path = decodedFacadePath(url.pathname);
  if (!path || !SHADOW_READ_PATH.test(path)) return false;
  let credentialQuery = false;
  url.searchParams.forEach((_value, key) => {
    if (/(?:grant|token|code|secret|state|key)/i.test(key)) credentialQuery = true;
  });
  return !credentialQuery;
}

/** Header-only response shape: never consume or log response bodies. */
export function facadeResponseShape(response: Response): string {
  const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (!type) return "none";
  if (type === "application/json" || type.endsWith("+json")) return "json";
  if (type === "text/html") return "html";
  if (type === "text/event-stream") return "stream";
  if (type.startsWith("text/")) return "text";
  return "binary";
}

export async function compareFacadeShadow(request: Request, route: FacadeRoute, baseline: Response): Promise<void> {
  if (route.mode !== "shadow" || !isSafeShadowGet(request)) return;
  const path = new URL(request.url).pathname;
  const common = { event: "cloud_facade_shadow", route: routeClass(path), origin: facadeOriginLabel(route, path) };
  try {
    const response = await globalThis.fetch(facadeRequest(request, route.origin, true));
    const statusMatch = baseline.status === response.status;
    const shapeMatch = facadeResponseShape(baseline) === facadeResponseShape(response);
    // Do not clone/read bodies or print response headers, URLs, query strings,
    // ids, errors or credentials. Cancel unread shadow streams (including SSE).
    void response.body?.cancel().catch(() => undefined);
    console.log(JSON.stringify({ ...common, outcome: statusMatch && shapeMatch ? "match" : "mismatch",
      statusMatch, shapeMatch, cloudStatus: baseline.status, shadowStatus: response.status }));
  } catch {
    console.log(JSON.stringify({ ...common, outcome: "error" }));
  }
}
