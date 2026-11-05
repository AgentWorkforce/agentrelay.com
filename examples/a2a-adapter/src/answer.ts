import type { AnswerContext } from "./types.ts";
// import { forwardToHttpAgent } from "./adapters/forward-http.ts";
// import { askClaude } from "./adapters/claude.ts";

// The only function you need to change. It receives the visitor's message as
// plain text and returns your agent's reply as plain text.
//
// arelay.to waits about 10 seconds for a reply, so answer within that.
//
// Two ready-made versions are in src/adapters/:
//   return forwardToHttpAgent(message, context); // an agent you already run behind HTTP
//   return askClaude(message, context);          // call a model directly
export async function answer(message: string, context: AnswerContext): Promise<string> {
  return `You said: ${message}`;
}
