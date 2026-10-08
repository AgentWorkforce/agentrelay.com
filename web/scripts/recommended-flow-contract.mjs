// The Software Garden the catalog serves is the /flows generator's output
// (web/public/flows/software-garden, agentrelay.com#174). These are the
// generated lines that derive the pull-request title from the ticket and
// require exactly one GitHub closing reference before a PR is opened.
export const SOFTWARE_FACTORY_METADATA_SNIPPETS = Object.freeze([
  'const normalizedTitle = issue.title.trim().replace(/\\s+/g, " ");',
  'const changeTitle = Array.from(normalizedTitle).slice(0, 240).join("").trim();',
  '? "Fixes " + issueIdentifier',
  'expected=\\"Fixes $identifier\\"',
  'count=$(grep -xcF \\"$expected\\"',
  'elif [ \\"$count\\" -ne 1 ]',
  '" --title " + shellQuote(changeTitle) + " --body-file .relayflow/pr-body.md"',
]);

export function assertRecommendedFlowSourceContract(flow, sourceText) {
  if (flow.id !== 'software-factory') return;
  const missing = SOFTWARE_FACTORY_METADATA_SNIPPETS.filter(snippet => !sourceText.includes(snippet));
  if (missing.length > 0) {
    throw new Error(`${flow.id}: released source lacks the ticket-derived title/exact closing-reference contract (${missing.join(', ')})`);
  }
}
