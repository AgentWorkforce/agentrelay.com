import { afterEach, describe, expect, it, vi } from 'vitest';
import { teamsGoogleAuthHref } from '../teams-cloud';

afterEach(() => vi.unstubAllEnvs());

describe('teamsGoogleAuthHref', () => {
  it('starts Google auth for Teams, returns to connect, and names the CTA placement', () => {
    vi.stubEnv('NEXT_PUBLIC_CLOUD_URL', '');
    expect(teamsGoogleAuthHref('home_hero')).toBe(
      '/cloud/api/auth/google/start?source=teams&next=%2Fteams%2Fconnect&utm_content=home_hero',
    );
  });

  it('uses the configured Cloud origin without a duplicate slash', () => {
    vi.stubEnv('NEXT_PUBLIC_CLOUD_URL', 'https://cloud.example.test/cloud/');
    expect(teamsGoogleAuthHref('teams_nav')).toBe(
      'https://cloud.example.test/cloud/api/auth/google/start?source=teams&next=%2Fteams%2Fconnect&utm_content=teams_nav',
    );
  });
});
