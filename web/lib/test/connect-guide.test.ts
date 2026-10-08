import { describe, expect, it } from 'vitest';
import { GET } from '../../app/connect/route';
describe('Connect entry point', () => {
  it('serves a native agent guide to curl', async () => {
    const response = GET(new Request('https://agentrelay.com/connect'));
    expect(response.headers.get('content-type')).toContain('text/markdown');
    const guide = await response.text();
    for (const command of ['create', 'join', 'send', 'status', 'leave', 'end']) expect(guide).toContain(`~/.local/lib/agent-relay/connect/agent-relay-probe connect ${command}`);
    expect(guide).toContain('https://agentrelay.com/connect/install.sh');
    expect(guide).not.toContain('npx');
    expect(guide).toContain('escalated permissions');
    expect(guide).not.toMatch(/printf '%s' '/);
    expect(guide).toContain("<<'ARELAY_MSG'");
    expect(guide).not.toContain('~/.local/bin/relay connect');
  });
  it('serves the same Markdown instructions when a browser requests HTML', async () => {
    const browser = GET(new Request('https://agentrelay.com/connect', { headers: { accept: 'text/html' } }));
    const agent = GET(new Request('https://agentrelay.com/connect'));
    expect(browser.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(await browser.text()).toBe(await agent.text());
  });
});
