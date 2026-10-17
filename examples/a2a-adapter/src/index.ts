import { handleRpc } from "./a2a.ts";
import { answer } from "./answer.ts";
import { AdapterConfigError, buildAgentCard, CARD_PATH, RPC_PATH } from "./card.ts";
import { config } from "./config.ts";
import type { Env } from "./types.ts";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    // The card is public: arelay.to fetches it without credentials.
    if (pathname === CARD_PATH && request.method === "GET") {
      try {
        return Response.json(buildAgentCard(config));
      } catch (error) {
        if (!(error instanceof AdapterConfigError)) throw error;
        // Fail loudly: a card arelay.to would reject is worse than no card.
        return new Response(error.message, { status: 500 });
      }
    }

    if (pathname === RPC_PATH) {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
      if (env.A2A_BEARER_TOKEN && !(await hasBearer(request, env.A2A_BEARER_TOKEN))) {
        return new Response("Unauthorized", { status: 401, headers: { "www-authenticate": "Bearer" } });
      }
      return Response.json(await handleRpc(await request.text(), answer, env));
    }

    return new Response("Not found", { status: 404 });
  },
};

// Compares SHA-256 digests so the check takes the same time whatever the input.
async function hasBearer(request: Request, expected: string): Promise<boolean> {
  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(presented)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i]! ^ right[i]!;
  return difference === 0;
}
