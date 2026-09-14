import type { ReactNode } from 'react';
import { highlightCode } from '../../lib/syntax';
import { flowExamples } from './flow-examples';
import { FlowScriptCarousel } from './FlowScriptCarousel';

export async function FlowExamples({ introductoryCode }: { introductoryCode: ReactNode }) {
  const examples = await Promise.all(flowExamples.map(async ({ code, ...example }, index) => ({
    ...example,
    codeHtml: index === 0 ? '' : (await highlightCode(code, 'typescript')).codeHtml,
  })));

  return <FlowScriptCarousel examples={examples} introductoryCode={introductoryCode} />;
}
