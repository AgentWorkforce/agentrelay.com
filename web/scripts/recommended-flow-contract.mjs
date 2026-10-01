export const SOFTWARE_FACTORY_METADATA_SNIPPETS = Object.freeze([
  'const normalizedTitle = issue.title.trim().replace(/\\s+/g, " ");',
  'const title = Array.from(normalizedTitle).slice(0, 240).join("").trim();',
  '? `Fixes ${issueIdentifier}`',
  'expected="Fixes $identifier"',
  'count=$(grep -xcF "$expected"',
  'elif [ "$count" -ne 1 ]',
  '--title ${shellWord(title)} --body-file ${WORK}/pr-body.md',
]);

export function assertRecommendedFlowSourceContract(flow, sourceText) {
  if (flow.id !== 'software-factory') return;
  const missing = SOFTWARE_FACTORY_METADATA_SNIPPETS.filter(snippet => !sourceText.includes(snippet));
  if (missing.length > 0) {
    throw new Error(`${flow.id}: released source lacks the ticket-derived title/exact closing-reference contract (${missing.join(', ')})`);
  }
}
