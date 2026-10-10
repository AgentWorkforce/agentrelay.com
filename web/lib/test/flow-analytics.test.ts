import { describe, expect, it, vi } from 'vitest';
import { journeyId, JOURNEY_STORAGE_KEY } from '../flow-analytics';

const id = '00000000-0000-4000-8000-000000000001';
const freshId = '00000000-0000-4000-8000-000000000002';

describe('journey correlation', () => {
  it('reuses a recent journey, expires stale or invalid timestamps, and tolerates blocked storage', () => {
    const storage = { getItem: vi.fn(), setItem: vi.fn() };
    storage.getItem.mockReturnValue(JSON.stringify({ id, updatedAt: 1000 }));
    expect(journeyId(storage, () => freshId, 2000)).toBe(id);
    expect(storage.setItem).toHaveBeenCalledWith(JOURNEY_STORAGE_KEY, JSON.stringify({ id, updatedAt: 2000 }));
    for (const updatedAt of [0, 4_000_000, 'invalid']) {
      storage.getItem.mockReturnValue(JSON.stringify({ id, updatedAt }));
      expect(journeyId(storage, () => freshId, 3_000_000)).toBe(freshId);
    }
    storage.getItem.mockImplementation(() => { throw Error('blocked'); });
    storage.setItem.mockImplementation(() => { throw Error('blocked'); });
    expect(journeyId(storage, () => freshId)).toBe(freshId);
  });
});
