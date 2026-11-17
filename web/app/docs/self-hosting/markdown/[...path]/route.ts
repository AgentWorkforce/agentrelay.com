import {
  getSelfhostMarkdown,
  getSelfhostMarkdownFiles,
  parseSelfhostMarkdownFile,
} from '../../../../../lib/selfhost-docs';

// Raw Markdown for every self-hosting guide and agent runbook, prerendered like
// /docs/markdown/*.md. next.config rewrites the public URLs here:
//   /docs/self-hosting.md                 -> index.md (the human overview)
//   /docs/self-hosting/<guide>.md         -> <guide>.md
//   /docs/self-hosting/agents.md          -> agents.md (rules for agents)
//   /docs/self-hosting/agents/<guide>.md  -> agents/<guide>.md
export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return getSelfhostMarkdownFiles().map((file) => ({ path: file.split('/') }));
}

type RouteProps = {
  params: Promise<{ path: string[] }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { path } = await params;
  const file = parseSelfhostMarkdownFile(path);
  const markdown = file ? getSelfhostMarkdown(file.slug, file.audience) : null;
  if (!markdown) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
