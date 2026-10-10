import { REGISTER_CHECKLIST_MARKDOWN } from '../../../../lib/agent-register';

export const dynamic = 'force-static';

export function GET() {
  return new Response(REGISTER_CHECKLIST_MARKDOWN, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
