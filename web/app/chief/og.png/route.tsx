import { ImageResponse } from 'next/og';

import { DefaultVariant, loadBrandFonts, OG_SIZE } from '../../../lib/og/template';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET() {
  const { fonts, headingFamily, bodyFamily } = await loadBrandFonts();

  return new ImageResponse(
    <DefaultVariant
      bodyFamily={bodyFamily}
      eyebrow="Chief by Agent Relay"
      headingFamily={headingFamily}
      subtitle="Run coding-agent teams across your backlog and get pull requests ready for review."
      title="The Agent Software Manager"
    />,
    {
      ...OG_SIZE,
      ...(fonts.length > 0 ? { fonts } : {}),
    }
  );
}
