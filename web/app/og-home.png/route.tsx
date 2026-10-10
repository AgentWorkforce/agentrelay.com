import { HOME_OG_IMAGE_PATH } from '../../lib/og-meta';
import { absoluteUrl } from '../../lib/site';

export const dynamic = 'force-static';

// Keep the legacy URL aligned with the static card used by homepage metadata.
export function GET() {
  return Response.redirect(absoluteUrl(HOME_OG_IMAGE_PATH), 307);
}
