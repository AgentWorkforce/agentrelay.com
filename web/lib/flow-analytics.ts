import { JOURNEY_ID_REGEX } from './flow-journey';

export const JOURNEY_TIMEOUT_MS = 30 * 60_000;
export const JOURNEY_STORAGE_KEY = 'agentrelay:flows:analytics:v2';
export function journeyId(storage: Pick<Storage, 'getItem' | 'setItem'>, createId: () => string, now = Date.now()) {
  try {
    const saved = JSON.parse(storage.getItem(JOURNEY_STORAGE_KEY) ?? 'null');
    if (JOURNEY_ID_REGEX.test(saved?.id) && Number.isFinite(saved.updatedAt) && now >= saved.updatedAt && now - saved.updatedAt < JOURNEY_TIMEOUT_MS) {
      storage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify({ id: saved.id, updatedAt: now }));
      return saved.id as string;
    }
  } catch { /* Storage is optional. */ }
  const id = createId();
  try { storage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify({ id, updatedAt: now })); } catch { /* Optional. */ }
  return id;
}
