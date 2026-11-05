import Anthropic from "@anthropic-ai/sdk";
import type { AnswerContext } from "../types.ts";

// Answer by calling a model directly.
//
//   npx wrangler secret put ANTHROPIC_API_KEY
//
// Each message is answered on its own. To carry a conversation, store turns
// keyed by context.contextId (for example in KV) and send them as `messages`.
const SYSTEM_PROMPT = "You are Acme's support agent. Answer briefly and say so when you don't know.";

export async function askClaude(message: string, context: AnswerContext): Promise<string> {
  const client = new Anthropic({
    apiKey: context.env.ANTHROPIC_API_KEY,
    // arelay.to waits about 10 seconds, so a retry would arrive too late.
    timeout: 9_000,
    maxRetries: 0,
  });

  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    // Short chat replies keep the round trip inside arelay.to's wait.
    max_tokens: 1024,
    output_config: { effort: "low" },
    // If the model declines, the API retries on Anthropic's recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: message }],
  });

  if (response.stop_reason === "refusal") return "Sorry, I can't help with that.";
  const text = response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("\n")
    .trim();
  return text || "Sorry, I don't have an answer for that.";
}
