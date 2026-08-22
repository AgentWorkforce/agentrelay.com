import { describe, expect, it } from 'vitest';

import { getApiCatalog, getMcpManifest, getSecurityTxt, securityTxtExpiry } from '../agent-discovery';

describe('security.txt', () => {
  it('carries the RFC 9116 required fields', () => {
    const txt = getSecurityTxt(new Date('2026-08-21T00:00:00Z'));

    expect(txt).toContain('Contact: mailto:hello@agentrelay.com');
    expect(txt).toContain('Expires: 2027-08-21T00:00:00Z');
    expect(txt).toContain('Canonical: https://agentrelay.com/.well-known/security.txt');
    expect(txt).toContain('Preferred-Languages: en');
  });

  it('always expires in the future', () => {
    const now = new Date('2026-08-21T00:00:00Z');
    expect(Date.parse(securityTxtExpiry(now))).toBeGreaterThan(now.getTime());
  });
});

describe('api-catalog', () => {
  it('links each API to an OpenAPI description and human docs', () => {
    const { linkset } = getApiCatalog();

    // Anchors must be API hosts that actually exist — api.agentrelay.com does not.
    expect(linkset.map((e) => e.anchor)).toEqual([
      'https://cast.agentrelay.com/v1',
      'https://file.agentrelay.com/v1',
    ]);
    for (const entry of linkset) {
      expect(entry.anchor).toMatch(/^https:\/\//);
      expect(entry['service-desc']?.[0]?.href).toMatch(/^https:\/\//);
      expect(entry['service-doc']?.[0]?.href).toMatch(/^https:\/\/agentrelay\.com\//);
    }
  });
});

describe('mcp.json', () => {
  it('describes the stdio server well enough to launch it', () => {
    const manifest = getMcpManifest();
    const [server] = manifest.servers;

    expect(manifest.documentation).toBe('https://agentrelay.com/docs/agent-relay-mcp');
    expect(server.transport).toBe('stdio');
    expect(server.command).toBe('agent-relay');
    expect(server.args).toEqual(['mcp']);
    expect(server.env.find((e) => e.name === 'RELAY_WORKSPACE_KEY')?.required).toBe(true);
  });
});
