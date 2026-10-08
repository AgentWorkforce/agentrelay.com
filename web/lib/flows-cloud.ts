const DEFAULT_CLOUD_URL = '/cloud';

export function flowsGoogleAuthHref(placement?: string) {
  const cloudUrl = (process.env.NEXT_PUBLIC_CLOUD_URL || DEFAULT_CLOUD_URL).replace(/\/$/, '');
  const params = new URLSearchParams({
    source: 'flows',
    next: '/flows/deploy',
  });
  if (placement) params.set('utm_content', placement);
  return `${cloudUrl}/api/auth/google/start?${params.toString()}`;
}
