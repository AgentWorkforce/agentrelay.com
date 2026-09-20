import { getRecommendedFlow } from '../../../../../../lib/recommended-flow-catalog';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
};

export async function GET(_request: Request, { params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await params;
  const recommendedFlow = getRecommendedFlow(flowId);
  if (!recommendedFlow) {
    return Response.json({ error: {
      code: 'recommended_flow_not_found',
      message: `Recommended flow "${flowId}" was not found.`,
    } }, { status: 404, headers });
  }
  return Response.json(recommendedFlow, { headers });
}
