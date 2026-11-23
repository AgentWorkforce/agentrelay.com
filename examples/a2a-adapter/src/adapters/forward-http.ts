import type { AnswerContext } from "../types.ts";

// Forward each message to an agent you already run behind an HTTP endpoint.
//
//   wrangler.toml:  [vars] UPSTREAM_URL = "https://internal.acme.com/agent/chat"
//   if it needs auth: npx wrangler secret put UPSTREAM_TOKEN
//
// The request and response shapes below are placeholders. Change them to
// whatever your agent already speaks.
export async function forwardToHttpAgent(message: string, context: AnswerContext): Promise<string> {
  const { UPSTREAM_URL, UPSTREAM_TOKEN } = context.env;
  if (!UPSTREAM_URL) throw new Error("UPSTREAM_URL is not set");

  const response = await fetch(UPSTREAM_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(UPSTREAM_TOKEN ? { authorization: `Bearer ${UPSTREAM_TOKEN}` } : {}),
    },
    body: JSON.stringify({ message, conversationId: context.contextId }),
    // Leave headroom inside arelay.to's ~10 second wait.
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Upstream agent returned HTTP ${response.status}`);

  const body = (await response.json()) as { reply?: unknown };
  if (typeof body.reply !== "string") throw new Error('Upstream agent response has no string "reply" field');
  return body.reply;
}
