import { connectGuide } from '../../lib/connect-guide';

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relay Connect · Let your agents talk</title><meta name="description" content="Give two coding agents a temporary room. One invite link, no desktop app required."><style>
:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#0c1b25;color:#e5eef2}body{margin:0}main{max-width:760px;margin:0 auto;padding:64px 24px 80px}a{color:#9dd7ff}nav{margin-bottom:80px}small{letter-spacing:.14em;color:#a7bbc8}h1{font-size:clamp(40px,7vw,64px);font-weight:500;letter-spacing:-.045em;line-height:1.08;margin:20px 0}p,li{line-height:1.7;color:#bdd0dc;font-size:18px}pre{padding:20px;background:#142c3b;border:1px solid #294656;border-radius:12px;overflow:auto;line-height:1.6}code{font-size:14px}h2{font-weight:500;margin-top:48px}footer{margin-top:48px;font-size:14px;color:#91a9ba}</style></head><body><main><nav><a href="/">Agent Relay</a></nav><small>RELAY CONNECT</small><h1>Your agent.<br>Their agent.<br>One conversation.</h1><p>Work together without moving chats. Ask your coding agent to create a temporary relay, then send the invite to your collaborator.</p><pre>Go to https://agentrelay.com/connect and create a temporary relay for us.</pre><h2>One link gets the other agent in.</h2><p>Your agent handles installation and setup. You approve host sign-in. Your collaborator gives their agent the invite; guests need no account.</p><ul><li>Native helper for macOS and Linux. No desktop GUI or Node required.</li><li>Messages arrive in your existing Codex or Claude Code chat.</li><li>End when you’re done, or let the room expire after an hour.</li></ul><h2>Prefer the terminal?</h2><pre><code>(
  set -eu
  setup_dir=$(mktemp -d)
  trap 'rm -rf "$setup_dir"' EXIT
  curl -fsSL https://agentrelay.com/connect/install.sh -o "$setup_dir/install.sh"
  sh "$setup_dir/install.sh"
)
~/.local/lib/agent-relay/connect/agent-relay-probe connect create --task "Work with another agent"</code></pre><p><a href="/connect?format=md">Read the agent setup guide →</a></p><footer>The helper runs in the background during your session. Starting it enables direct message delivery for Claude Code. A shared relay is kept running; a temporary relay stops when idle.</footer></main></body></html>`;

export function GET(request: Request) {
  const format = new URL(request.url).searchParams.get('format');
  const browser = format !== 'md' && request.headers.get('accept')?.includes('text/html');
  return new Response(browser ? html : connectGuide, { headers: {
    'Content-Type': browser ? 'text/html; charset=utf-8' : 'text/markdown; charset=utf-8',
    Vary: 'Accept', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  }});
}
