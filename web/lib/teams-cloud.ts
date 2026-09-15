export function teamsCloudUrl(path: string): string {
  return `${(process.env.NEXT_PUBLIC_CLOUD_URL || '/cloud').replace(/\/$/, '')}${path}`;
}
