import { handleDashboardExchange } from '../../../../../lib/agent-dashboard';

// `/u/<handle>/dashboard?grant=...` is rewritten here by next.config.mjs
// (beforeFiles, keyed on the grant query), so the grant is exchanged before
// any page, layout, or analytics code runs. See lib/agent-dashboard.ts.
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ handle: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { handle } = await params;
  return handleDashboardExchange(request, handle);
}
