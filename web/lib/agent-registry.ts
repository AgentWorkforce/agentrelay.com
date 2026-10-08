import { cache } from 'react';

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])$/;
const MAX_PROFILE_BYTES = 16_000;
const PROFILE_TIMEOUT_MS = 5_000;
const REGISTRY_ORIGIN = 'https://arelay.to';

export type PublicAgentProfile = {
  handle: string;
  displayName: string;
  description: string;
  verifiedDomain: string;
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
  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > MAX_PROFILE_BYTES) {
    throw new Error('Agent registry profile exceeded the size limit');
  }
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

export const getAgentProfile = cache((handle: string) => fetchAgentProfile(handle));

function isPublicAgentProfile(value: unknown): value is PublicAgentProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const profile = value as Record<string, unknown>;
  return typeof profile.handle === 'string'
    && validRegistryHandle(profile.handle)
    && boundedString(profile.displayName, 1, 100)
    && boundedString(profile.description, 1, 1_000)
    && boundedString(profile.verifiedDomain, 1, 253)
    && typeof profile.verifiedAt === 'string'
    && Number.isFinite(Date.parse(profile.verifiedAt))
    && (profile.deliveryType === 'internal' || profile.deliveryType === 'a2a' || profile.deliveryType === 'relay')
    && (profile.status === 'active' || profile.status === 'suspended');
}

function boundedString(value: unknown, minimum: number, maximum: number): value is string {
  return typeof value === 'string' && value.length >= minimum && value.length <= maximum;
}
