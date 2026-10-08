import { cache } from 'react';

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])$/;
const MAX_PROFILE_BYTES = 16_000;
const PROFILE_TIMEOUT_MS = 5_000;
export const REGISTRY_ORIGIN = 'https://arelay.to';

export type PublicAgentProfile = {
  handle: string;
  displayName: string;
  description: string;
  verifiedDomain: string | null;
  verifiedWorkspace?: { displayName: string } | null;
  verificationMethod?: 'domain' | 'account' | 'both';
  verifiedAt: string;
  deliveryType: 'internal' | 'a2a' | 'relay';
  status: 'active' | 'suspended';
};

export function validRegistryHandle(handle: string): boolean {
  return HANDLE_PATTERN.test(handle);
}

export async function fetchAgentProfile(
  handle: string,
  fetcher: typeof globalThis.fetch = globalThis.fetch,
): Promise<PublicAgentProfile | null> {
  if (!validRegistryHandle(handle)) return null;
  const response = await fetcher(`${REGISTRY_ORIGIN}/api/v1/agents/${encodeURIComponent(handle)}`, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(PROFILE_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Agent registry returned ${response.status}`);
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PROFILE_BYTES) {
    throw new Error('Agent registry profile exceeded the size limit');
  }
  const body = await readBoundedBody(response, MAX_PROFILE_BYTES);
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    throw new Error('Agent registry returned invalid JSON');
  }
  if (!isPublicAgentProfile(value) || value.handle !== handle) {
    throw new Error('Agent registry returned an invalid profile');
  }
  return value;
}

export async function readBoundedBody(response: Response, limit: number): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new Error('Agent registry profile exceeded the size limit');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export const getAgentProfile = cache((handle: string) => fetchAgentProfile(handle));

function isPublicAgentProfile(value: unknown): value is PublicAgentProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const profile = value as Record<string, unknown>;
  return typeof profile.handle === 'string'
    && validRegistryHandle(profile.handle)
    && boundedString(profile.displayName, 1, 100)
    && boundedString(profile.description, 1, 1_000)
    && (profile.verifiedDomain === null || boundedString(profile.verifiedDomain, 1, 253))
    && validVerifiedWorkspace(profile.verifiedWorkspace)
    && validVerificationMethod(profile)
    && typeof profile.verifiedAt === 'string'
    && Number.isFinite(Date.parse(profile.verifiedAt))
    && (profile.deliveryType === 'internal' || profile.deliveryType === 'a2a' || profile.deliveryType === 'relay')
    && (profile.status === 'active' || profile.status === 'suspended');
}

function validVerifiedWorkspace(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return boundedString((value as Record<string, unknown>).displayName, 1, 200);
}

function validVerificationMethod(profile: Record<string, unknown>): boolean {
  if (profile.verificationMethod === undefined) return typeof profile.verifiedDomain === 'string';
  if (profile.verificationMethod === 'domain') return typeof profile.verifiedDomain === 'string';
  if (profile.verificationMethod === 'account') {
    return profile.verifiedDomain === null
      && profile.verifiedWorkspace !== undefined
      && profile.verifiedWorkspace !== null;
  }
  return profile.verificationMethod === 'both'
    && typeof profile.verifiedDomain === 'string'
    && profile.verifiedWorkspace !== undefined
    && profile.verifiedWorkspace !== null;
}

function boundedString(value: unknown, minimum: number, maximum: number): value is string {
  return typeof value === 'string' && value.length >= minimum && value.length <= maximum;
}
