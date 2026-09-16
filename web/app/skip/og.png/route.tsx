import { ImageResponse } from 'next/og';

import { DefaultVariant, loadBrandFonts, OG_SIZE } from '../../../lib/og/template';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET() {
  const { fonts, headingFamily, bodyFamily } = await loadBrandFonts();

  return new ImageResponse(
    <DefaultVariant
      bodyFamily={bodyFamily}
      eyebrow="Skip by Agent Relay"
      headingFamily={headingFamily}
      subtitle="Chat with one coding agent that works your backlog and reports back in your channel."
      title="The single-agent chat for engineering work"
    />,
    {
      ...OG_SIZE,
      ...(fonts.length > 0 ? { fonts } : {}),
    }
  );
}
