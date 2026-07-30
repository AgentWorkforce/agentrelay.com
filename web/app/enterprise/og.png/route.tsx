import { ImageResponse } from 'next/og';

import { DefaultVariant, loadBrandFonts, OG_SIZE } from '../../../lib/og/template';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET() {
  const { fonts, headingFamily, bodyFamily } = await loadBrandFonts();

  return new ImageResponse(
    <DefaultVariant
      bodyFamily={bodyFamily}
      eyebrow="Enterprise"
      headingFamily={headingFamily}
      subtitle="We design, deploy, and support coordinated AI agent teams around your systems, security, and data boundaries."
      title="Agent teams that deliver outcomes"
    />,
    {
      ...OG_SIZE,
      ...(fonts.length > 0 ? { fonts } : {}),
    }
  );
}
