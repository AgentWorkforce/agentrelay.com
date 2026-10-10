import { getRecommendedFlowCatalog } from '../../../../../lib/recommended-flow-catalog';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(getRecommendedFlowCatalog(), { headers: {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  } });
}
