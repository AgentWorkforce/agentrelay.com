export function teamsCloudUrl(path: string): string {
  return `${(process.env.NEXT_PUBLIC_CLOUD_URL || '/cloud').replace(/\/$/, '')}${path}`;
}

export function teamsConnectHref(params: Record<string, string | string[] | undefined> = {}): string {
  const query = new URLSearchParams();
  if (typeof params.machine === 'string' && /^m_[a-zA-Z0-9_-]{1,128}$/.test(params.machine)) query.set('machine', params.machine);
  for (const key of ['workspace', 'account']) {
    const value = params[key];
    if (typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value)) query.set(key, value);
  }
  return teamsCloudUrl(`/teams/connect${query.size ? `?${query}` : ''}`);
}
