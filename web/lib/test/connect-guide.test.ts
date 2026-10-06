import { describe, expect, it } from 'vitest';
import { GET } from '../../app/connect/route';
describe('Connect entry point', () => {
  it('serves a native agent guide to curl', async () => {
    const response = GET(new Request('https://agentrelay.com/connect'));
    expect(response.headers.get('content-type')).toContain('text/markdown');
    expect(response.headers.get('vary')).toBe('Accept');
    const guide = await response.text();
    for (const command of ['create', 'join', 'end']) expect(guide).toContain(`~/.local/lib/agent-relay/connect/agent-relay-probe connect ${command}`);
    expect(guide).toContain('https://agentrelay.com/connect/install.sh');
    expect(guide).not.toContain('npx');
    expect(guide).not.toContain('~/.local/bin/relay connect');
  });
  it('serves browsers HTML with an explicit Markdown override', async () => {
    const browser = GET(new Request('https://agentrelay.com/connect', { headers: { accept: 'text/html' } }));
    expect(browser.headers.get('content-type')).toContain('text/html');
    expect(await browser.text()).toContain('Their agent.');
    const guide = GET(new Request('https://agentrelay.com/connect?format=md', { headers: { accept: 'text/html' } }));
    expect(guide.headers.get('content-type')).toContain('text/markdown');
  });
});
