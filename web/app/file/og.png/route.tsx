import { ImageResponse } from 'next/og';

import { loadBrandFonts, OG_SIZE, RelayfileVariant } from '../../../lib/og/template';

export const runtime = 'nodejs';
// Prerender at build time — the Relayfile card never changes between deploys.
export const dynamic = 'force-static';

/**
 * The Relayfile landing page's Open Graph card: the same composition as the
 * homepage and Pear cards (left copy column, a panel bled into the bottom-right)
 * with the page's own badge, headline, and subtitle beside the "relayfile
 * workspace" tree from its hero. Served as a `.png` route handler so the URL
 * ends in a real image extension.
 */
export async function GET() {
  const { fonts, headingFamily, bodyFamily } = await loadBrandFonts();

  return new ImageResponse(<RelayfileVariant headingFamily={headingFamily} bodyFamily={bodyFamily} />, {
    ...OG_SIZE,
    ...(fonts.length > 0 ? { fonts } : {}),
  });
}
