import { CODING_AGENTS } from './flow-agents';
import { resolveAgentSettings, rolesForStep } from './flow-agent-settings';
import type { FactoryDraft } from './flow-onboarding';
import { sourceLabel, sourceSummary } from './flow-sources';
import { WORKFLOWS, WORKFLOW_STEP_DETAILS } from './flow-workflows';

/** Display-only snapshot of the same plan shown by WorkflowPlan. Never executed by Cloud. */
export function flowPreview(draft: FactoryDraft) {
  const workflow = WORKFLOWS.find(item => item.id === draft.workflow);
  if (!workflow) return undefined;
  return {
    version: 1,
    description: workflow.description,
    nodes: [
      {
        kind: 'trigger', title: draft.sources.length === 1
          ? draft.sources[0] === 'markdown' ? 'Read your Markdown file'
            : draft.sources[0] === 'slack' ? 'Slack message matches' : `${sourceLabel(draft.sources[0])} ticket matches`
          : 'Work matches your sources',
        description: draft.sources.map(id => `${draft.sources.length > 1 ? `${sourceLabel(id)}: ` : ''}${sourceSummary(id, draft.sourceSettings[id] ?? {})}`).join('\n'),
        owner: 'Trigger', detail: draft.sources.length > 1 ? 'Any one source can start the flow.' : '', icons: draft.sources,
      },
      ...workflow.steps.map(step => {
        const configs = rolesForStep(step).map(role => resolveAgentSettings(workflow.id, role, draft.agents, draft.agentSettings));
        const human = step === 'Human gate';
        const review = step === '2× adversarial review';
        const agents = (review ? configs.slice(0, 1) : configs).map(config => ({
          id: config.agent, label: CODING_AGENTS.find(agent => agent.id === config.agent)!.label,
          model: config.model || 'Default model',
        }));
        return {
          kind: human ? 'approval' : configs.length ? 'agent' : 'script',
          title: human ? 'Your approval' : review ? 'Adversarial review' : step,
          description: WORKFLOW_STEP_DETAILS[step],
          owner: human ? 'You' : !agents.length ? 'Script' : agents.length > 1 ? 'Parallel' : agents[0].label,
          detail: agents.map(agent => agents.length > 1 ? `${agent.label} · ${agent.model}` : agent.model).join('\n'),
          icons: step === 'Open PR' ? ['github'] : agents.map(agent => agent.id),
          ...(review ? { badge: '2 rounds' } : {}),
        };
      }),
    ],
  };
}
