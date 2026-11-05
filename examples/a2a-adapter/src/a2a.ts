import type { AnswerContext, Env } from "./types.ts";

// A2A 1.0 over JSON-RPC, reduced to what arelay.to sends: one `SendMessage`
// call per visitor message, answered synchronously with a Message.

type RpcId = string | number | null;
type RpcResponse =
  | { jsonrpc: "2.0"; id: RpcId; result: unknown }
  | { jsonrpc: "2.0"; id: RpcId; error: { code: number; message: string } };
export type Answer = (message: string, context: AnswerContext) => Promise<string>;

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

function rpcError(id: RpcId, code: number, message: string): RpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function handleRpc(rawBody: string, answer: Answer, env: Env): Promise<RpcResponse> {
  let request: unknown;
  try {
    request = JSON.parse(rawBody);
  } catch {
    return rpcError(null, PARSE_ERROR, "Request body is not valid JSON");
  }
  if (!isRecord(request) || request.jsonrpc !== "2.0" || typeof request.method !== "string") {
    return rpcError(null, INVALID_REQUEST, "Expected a JSON-RPC 2.0 request");
  }
  const id: RpcId = typeof request.id === "string" || typeof request.id === "number" ? request.id : null;
  if (request.method !== "SendMessage") {
    return rpcError(id, METHOD_NOT_FOUND, `Method ${request.method} is not supported`);
  }

  const message = isRecord(request.params) ? request.params.message : undefined;
  const parts = isRecord(message) && Array.isArray(message.parts) ? message.parts : [];
  const text = parts
    .flatMap((part) => (isRecord(part) && typeof part.text === "string" ? [part.text] : []))
    .join("\n")
    .trim();
  if (!isRecord(message) || !text) {
    return rpcError(id, INVALID_PARAMS, "params.message must contain at least one text part");
  }

  const contextId = typeof message.contextId === "string" && message.contextId
    ? message.contextId
    : crypto.randomUUID();
  const messageId = typeof message.messageId === "string" ? message.messageId : crypto.randomUUID();

  let reply: string;
  try {
    reply = await answer(text, { contextId, messageId, env });
  } catch (error) {
    console.error("answer() failed", error);
    return rpcError(id, INTERNAL_ERROR, "The agent could not answer");
  }

  return {
    jsonrpc: "2.0",
    id,
    result: {
      message: {
        role: "ROLE_AGENT",
        messageId: crypto.randomUUID(),
        contextId,
        parts: [{ text: reply }],
      },
    },
  };
}
