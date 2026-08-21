// Machine-readable discovery documents served under /.well-known/.
//
// Agents that land on agentrelay.com without prior knowledge use these to find
// the security contact, the HTTP APIs behind the product, and the MCP server
// that exposes Relay as tools. Everything here points at surfaces that already
// exist — the docs pages and the published OpenAPI specs — so the manifests
// stay true without a separate source of truth to keep in sync.

import { SITE_EMAIL, SITE_URL, absoluteUrl } from './site';

const RELAYCAST_OPENAPI_URL =
  'https://raw.githubusercontent.com/AgentWorkforce/relaycast/main/openapi.yaml';
const RELAYFILE_OPENAPI_URL =
  'https://raw.githubusercontent.com/AgentWorkforce/relayfile/main/openapi/relayfile-v1.openapi.yaml';

/** RFC 9116 requires an absolute, machine-parseable expiry no more than a year out. */
export function securityTxtExpiry(now: Date): string {
  const expires = new Date(now);
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  expires.setUTCMilliseconds(0);
  return expires.toISOString().replace('.000Z', 'Z');
}

/** RFC 9116 security.txt. */
export function getSecurityTxt(now: Date): string {
  return [
    '# Agent Relay security contact (RFC 9116).',
    '# Report a vulnerability by email; we acknowledge within two business days.',
    '',
    `Contact: mailto:${SITE_EMAIL}`,
    `Expires: ${securityTxtExpiry(now)}`,
    'Preferred-Languages: en',
    `Canonical: ${absoluteUrl('/.well-known/security.txt')}`,
    `Policy: ${absoluteUrl('/terms')}`,
    '',
  ].join('\n');
}

type LinksetLink = { href: string; type: string; title: string };

type LinksetEntry = {
  anchor: string;
  'service-desc'?: LinksetLink[];
  'service-doc'?: LinksetLink[];
  'service-meta'?: LinksetLink[];
};

/**
 * RFC 9727 API catalog: one linkset entry per HTTP API, each pointing at its
 * OpenAPI description (`service-desc`) and its human documentation
 * (`service-doc`).
 */
export function getApiCatalog(): { linkset: LinksetEntry[] } {
  return {
    linkset: [
      {
        anchor: 'https://api.agentrelay.com/v1',
        'service-desc': [
          {
            href: RELAYCAST_OPENAPI_URL,
            type: 'application/yaml',
            title: 'Relaycast v1 OpenAPI 3.0 description',
          },
        ],
        'service-doc': [
          {
            href: absoluteUrl('/docs/relaycast-api'),
            type: 'text/html',
            title: 'Relaycast API reference',
          },
          {
            href: absoluteUrl('/docs/markdown/relaycast-api.md'),
            type: 'text/markdown',
            title: 'Relaycast API reference (markdown)',
          },
        ],
        'service-meta': [
          {
            href: absoluteUrl('/docs/authentication'),
            type: 'text/html',
            title: 'Authentication: token types and scopes',
          },
        ],
      },
      {
        anchor: 'https://api.agentrelay.com/relayfile/v1',
        'service-desc': [
          {
            href: RELAYFILE_OPENAPI_URL,
            type: 'application/yaml',
            title: 'Relayfile v1 OpenAPI description',
          },
        ],
        'service-doc': [
          {
            href: absoluteUrl('/docs/file/api-reference'),
            type: 'text/html',
            title: 'Relayfile API reference',
          },
        ],
      },
    ],
  };
}

/**
 * MCP server manifest. `agent-relay mcp` is a stdio server shipped in the CLI,
 * so the manifest describes how to launch it rather than a remote URL.
 */
export function getMcpManifest() {
  return {
    name: 'agent-relay',
    description:
      'Agent Relay messaging as MCP tools: channels, DMs, threads, reactions, inbox, and Zod-backed actions.',
    documentation: absoluteUrl('/docs/agent-relay-mcp'),
    website: SITE_URL,
    servers: [
      {
        name: 'agent-relay',
        transport: 'stdio',
        command: 'agent-relay',
        args: ['mcp'],
        install: {
          registry: 'npm',
          package: 'agent-relay',
          command: 'npm install -g agent-relay',
        },
        env: [
          {
            name: 'RELAY_WORKSPACE_KEY',
            description: 'Workspace join secret (rk_live_*). Create one with `agent-relay workspace create`.',
            required: true,
          },
          {
            name: 'RELAY_BASE_URL',
            description: 'API base URL override, for self-hosted @relaycast/engine deployments.',
            required: false,
          },
        ],
      },
    ],
  };
}
