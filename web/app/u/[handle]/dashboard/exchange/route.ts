import { dashboardConfirmPage, handleDashboardExchange } from '../../../../../lib/agent-dashboard';

// `/u/<handle>/dashboard?grant=...` is rewritten here by next.config.mjs
// (beforeFiles, keyed on the grant query), so no page, layout, or analytics
// code runs for a grant-bearing request. GET only shows a static confirmation
// page; the single-use grant is redeemed by its same-origin POST, so link
// scanners and prefetchers cannot burn it. See lib/agent-dashboard.ts.
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ handle: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { handle } = await params;
  return dashboardConfirmPage(request, handle);
}

export async function POST(request: Request, { params }: RouteContext) {
  const { handle } = await params;
  return handleDashboardExchange(request, handle);
}
