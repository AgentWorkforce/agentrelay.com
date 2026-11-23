// Checks a deployed adapter the way arelay.to will use it:
//   1. the card URL and the endpoint the card declares are HTTPS and on your domain
//   2. one SendMessage round trip returns a text reply in time
//
//   A2A_BEARER_TOKEN=... npm run smoke -- https://agents.acme.com/.well-known/agent-card.json acme.com
import { a2aUrlProblem } from "../src/domain.ts";

declare const process: { argv: string[]; env: Record<string, string | undefined>; exitCode?: number };

const REPLY_DEADLINE_MS = 10_000;

async function main(): Promise<void> {
  const [cardUrl, domain] = process.argv.slice(2);
  if (!cardUrl || !domain) throw new Error("Usage: npm run smoke -- <agent card URL> <verified domain>");

  const cardProblem = a2aUrlProblem("Agent card URL", cardUrl, domain);
  if (cardProblem) throw new Error(cardProblem);

  const cardResponse = await fetch(cardUrl, { headers: { accept: "application/json" } });
  if (!cardResponse.ok) throw new Error(`GET ${cardUrl} returned HTTP ${cardResponse.status}: ${await cardResponse.text()}`);
  const finalCardProblem = a2aUrlProblem("Agent card URL after redirects", cardResponse.url, domain);
  if (finalCardProblem) throw new Error(finalCardProblem);
  const card = (await cardResponse.json()) as {
    supportedInterfaces?: Array<{ url?: string; protocolBinding?: string; protocolVersion?: string }>;
  };
  const endpoint = card.supportedInterfaces?.find((candidate) =>
    candidate.protocolBinding?.toUpperCase() === "JSONRPC" && candidate.protocolVersion?.startsWith("1.0"))?.url;
  if (!endpoint) throw new Error("The card declares no JSONRPC 1.0 interface in supportedInterfaces");
  const endpointProblem = a2aUrlProblem("Declared service endpoint", endpoint, domain);
  if (endpointProblem) throw new Error(endpointProblem);
  console.log(`ok   card ${cardUrl}`);
  console.log(`ok   endpoint ${endpoint}`);

  const token = process.env.A2A_BEARER_TOKEN;
  const requestId = crypto.randomUUID();
  const started = Date.now();
  const rpcResponse = await fetch(endpoint, {
    method: "POST",
    // arelay.to does not follow redirects on the service endpoint.
    redirect: "manual",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "a2a-version": "1.0",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: requestId,
      method: "SendMessage",
      params: {
        message: {
          role: "ROLE_USER",
          messageId: crypto.randomUUID(),
          contextId: crypto.randomUUID(),
          parts: [{ text: "Hello from the a2a-adapter smoke test" }],
        },
        configuration: { returnImmediately: true, acceptedOutputModes: ["text/plain"] },
      },
    }),
  });
  const elapsed = Date.now() - started;
  if (rpcResponse.status >= 300 && rpcResponse.status < 400) {
    throw new Error(`POST ${endpoint} redirected (HTTP ${rpcResponse.status}). Declare the final URL in the card.`);
  }
  if (!rpcResponse.ok) {
    const hint = rpcResponse.status === 401 ? " Set A2A_BEARER_TOKEN to the Worker's token." : "";
    throw new Error(`POST ${endpoint} returned HTTP ${rpcResponse.status}.${hint}`);
  }
  const rpc = (await rpcResponse.json()) as {
    id?: unknown;
    error?: { message?: string };
    result?: { message?: { parts?: Array<{ text?: string }> } };
  };
  if (rpc.error) throw new Error(`SendMessage failed: ${rpc.error.message ?? "unknown error"}`);
  if (rpc.id !== requestId) throw new Error("The JSON-RPC response id does not match the request id");
  const reply = rpc.result?.message?.parts?.map((part) => part.text ?? "").join("\n").trim();
  if (!reply) throw new Error("SendMessage returned no text reply");
  console.log(`ok   reply in ${elapsed} ms: ${reply}`);
  if (elapsed > REPLY_DEADLINE_MS) {
    throw new Error(`The reply took ${elapsed} ms. arelay.to gives up after about ${REPLY_DEADLINE_MS} ms.`);
  }
}

main().catch((error: unknown) => {
  console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
