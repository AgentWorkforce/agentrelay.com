import { describe, expect, it } from 'vitest';
import { teamsConnectHref } from '../teams-onboarding';

describe('Teams onboarding contracts', () => {
  it('starts at Cloud while preserving only validated setup context', () => {
    expect(teamsConnectHref()).toBe('/cloud/teams/connect');
    expect(teamsConnectHref({ machine: 'm_mine', workspace: 'w-1', account: 'u-1', next: 'https://evil.invalid' }))
      .toBe('/cloud/teams/connect?machine=m_mine&workspace=w-1&account=u-1');
    expect(teamsConnectHref({ machine: ['m_one', 'm_two'], workspace: '../bad', account: 'bad&next=x' }))
      .toBe('/cloud/teams/connect');
  });
});
