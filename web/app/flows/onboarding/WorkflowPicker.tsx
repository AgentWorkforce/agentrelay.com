import { AgentStepEditor } from './AgentStepEditor';
import { resolveAgentSettings, rolesForStep, type AgentRole } from '../../../lib/flow-agent-settings';
import { GitBranch, Layers3, Zap, UserRound, LockKeyhole, Terminal, Settings } from 'lucide-react';
import { useState } from 'react';
import { WORKFLOWS, WORKFLOW_STEP_DETAILS, workflowAgents } from '../../../lib/flow-workflows';
import { SiGithub, SiGitlab } from 'react-icons/si';
import Claude from '@lobehub/icons/es/Claude';
import Codex from '@lobehub/icons/es/Codex';
import Grok from '@lobehub/icons/es/Grok';
import Cursor from '@lobehub/icons/es/Cursor';
import { agentLabel, canContinue, isCodingAgent, type CodingAgent, type FactoryDraft } from '../../../lib/flow-onboarding';
import { repositoryHost, sourceLabel, sourceSummary } from '../../../lib/flow-sources';
import { SourceIcon } from './SourcePicker';
import type { FlowTrack } from '../../../lib/flow-analytics';
import s from './onboarding.module.css';

function ProcessAgent({ id }: { id: CodingAgent }) {
  const Icon = { claude: Claude.Color, codex: Codex.Color, cursor: Cursor, grok: Grok }[id];
  return <span className={s.processAgent} role="img" aria-label={agentLabel(id)} title={agentLabel(id)}><Icon size={21} aria-hidden="true" /></span>;
}

export function WorkflowPicker({ draft, onChange, onTrack }: { draft: FactoryDraft; onChange: (draft: FactoryDraft) => void; onTrack: FlowTrack }) {
  const [instructionsOpen, setInstructionsOpen] = useState(Boolean(draft.workflow));
  const icons = { traditional: GitBranch, prototype: Layers3, simple: Zap };
  const labels = { traditional: 'Balanced', prototype: 'Best results, many tokens', simple: 'Best for simple tasks' };
  return <>
    <fieldset className={s.workflowGroup}>
      <legend className={s.visuallyHidden}>Choose a workflow</legend>
      {WORKFLOWS.map(workflow => {
        const Icon = icons[workflow.id];
        return <label key={workflow.id} className={`${s.workflowCard} ${draft.workflow === workflow.id ? s.workflowSelected : ''}`}>
          <div className={s.workflowTop}>
            <Icon size={21} className={s.workflowIcon} aria-hidden="true" />
            <strong>{workflow.label}</strong>
            <span className={s.workflowHint}>{labels[workflow.id]}</span>
            <input type="radio" aria-label={`${workflow.label}: ${labels[workflow.id]}`} name="workflow" value={workflow.id} checked={draft.workflow === workflow.id}
              onChange={() => { onChange({ ...draft, workflow: workflow.id }); setInstructionsOpen(true); }} />
          </div>
        </label>;
      })}
    </fieldset>
    <details className={s.extraInstructions} open={instructionsOpen} onToggle={event => {
      setInstructionsOpen(event.currentTarget.open);
    }}>
      <summary onClick={event => {
        event.preventDefault();
        const open = !event.currentTarget.parentElement!.hasAttribute('open');
        setInstructionsOpen(open);
        onTrack('help_toggled', { section: 'extra_instructions', open });
      }}>Extra instructions <span>Optional</span></summary>
      <div className={s.taskChoice}>
        <label htmlFor="factory-task">Anything your agents should keep in mind?</label>
        <textarea id="factory-task" maxLength={600} rows={3} placeholder="e.g. Follow our existing patterns and add regression tests"
          value={draft.task} onChange={event => onChange({ ...draft, task: event.target.value })} />
      </div>
    </details>
  </>;
}

export function WorkflowPlan({ draft, onChange, onTrack }: { draft: FactoryDraft; onChange: (draft: FactoryDraft) => void; onTrack: FlowTrack }) {
  const [editing, setEditing] = useState<AgentRole[] | null>(null);
  const { builder } = workflowAgents(draft.agents);
  const hasBuilder = draft.step >= 1 && canContinue(draft, 1);
  const selectedWorkflow = draft.step >= 2 && hasBuilder ? WORKFLOWS.find(workflow => workflow.id === draft.workflow) : undefined;
  if (!draft.sources.length) return <p className={s.planEmpty}>Choose where your tickets come from to start your plan.</p>;
  return <>
    <section className={s.workflowDetail} aria-label={selectedWorkflow ? `${selectedWorkflow.label} workflow details` : 'Your plan so far'}>
      {selectedWorkflow && <p className={s.workflowSummary}>{selectedWorkflow.description} Click an agent step to edit its settings.</p>}
            <ol className={s.workflowSteps} aria-label={selectedWorkflow ? `${selectedWorkflow.label} process` : 'Your plan so far'}>
              {draft.sources.length > 0 && <li>
                <div className={s.processNode}>
                  <span className={s.processAvatars}>
                    {draft.sources.map(id => <span key={id} className={s.processAgent} role="img" aria-label={sourceLabel(id)}><SourceIcon id={id} /></span>)}
                  </span>
                  <span className={s.processText}>
                    <span className={s.processHeading}><strong>{draft.sources.length === 1 ? draft.sources[0] === 'markdown' ? 'Read your Markdown file' : draft.sources[0] === 'slack' ? 'Slack message matches' : `${sourceLabel(draft.sources[0])} ticket matches` : 'Work matches your sources'}</strong><small className={s.processOwner}>Trigger</small></span>
                    {draft.sources.map(id => <span key={id} className={s.processDescription}>
                      {draft.sources.length > 1 && <span>{sourceLabel(id)}: </span>}{sourceSummary(id, draft.sourceSettings[id] ?? {})}
                    </span>)}
                    {draft.sources.length > 1 && <small>Any one source can start the flow.</small>}
                  </span>
                </div>
              </li>}
              {!selectedWorkflow && hasBuilder && <li>
                <div className={s.processNode}>
                  <span className={s.processAvatars}><ProcessAgent id={builder} /></span>
                  <span className={s.processText}>
                    <span className={s.processHeading}><strong>Coding agent</strong><small className={s.processOwner}>Agent</small></span>
                    <span className={s.processDescription}>{draft.agents.some(isCodingAgent) ? 'Your agent is selected. Choose a workflow to define its steps.' : 'A Claude Code example while support for your agents is coming soon.'}</span>
                  </span>
                </div>
              </li>}
              {selectedWorkflow?.steps.map(step => {
                const roles = rolesForStep(step);
                const configs = roles.map(role => resolveAgentSettings(selectedWorkflow.id, role, draft.agents, draft.agentSettings));
                const nodeConfigs = step === '2× adversarial review' ? configs.slice(0, 1) : configs;
                const agents = nodeConfigs.map(value => value.agent);
                const Node = agents.length ? 'button' : 'div';
                const human = step === 'Human gate';
                const script = step === 'Run checks' || step === 'Open PR';
                const review = step === '2× adversarial review';
                return <li key={step}>
                  <Node className={`${s.processNode} ${human ? s.processGate : ''} ${agents.length ? s.processEditable : ''}`} {...(agents.length ? { type: 'button' as const, 'aria-label': `Edit ${step} agent settings`, onClick: () => { setEditing(roles); onTrack('agent_settings_opened', { role: roles[0] }); } } : {})}>
                    <span className={`${s.processAvatars} ${agents.length > 1 ? s.processAgentCluster : ''}`}>
                      {agents.map((id, agentIndex) => <ProcessAgent key={agentIndex} id={id} />)}
                      {script && <span className={s.processPerson}>{step === 'Open PR' ? (repositoryHost(draft.sources) === 'gitlab' ? <SiGitlab size={21} aria-hidden="true" /> : <SiGithub size={21} aria-hidden="true" />) : <Terminal size={21} aria-hidden="true" />}</span>}
                      {human && <span className={s.processPerson}><UserRound size={21} aria-hidden="true" /></span>}
                    </span>
                    <span className={s.processText}>
                      <span className={s.processHeading}><strong>{human ? 'Your approval' : review ? 'Adversarial review' : step}</strong><small className={s.processOwner}>{human ? 'You' : script ? 'Script' : step === '3 implementations' ? 'Parallel' : 'Agent'}</small></span>
                      <span className={s.processDescription}>{WORKFLOW_STEP_DETAILS[step]}</span>
                      {agents.length > 0 && <small className={s.processModel}><span>{nodeConfigs.length > 1 ? 'Configure 3 agents' : nodeConfigs[0].model || 'Default model'}</span><Settings size={12} aria-hidden="true" /></small>}
                    </span>
                    {review && <span className={s.processRounds}>2 rounds</span>}
                    {human && <LockKeyhole size={15} className={s.processLock} aria-hidden="true" />}
                  </Node>
                </li>;
              })}
            </ol>
      {editing && selectedWorkflow && <AgentStepEditor draft={draft} roles={editing} onChange={onChange} onTrack={onTrack} onClose={() => setEditing(null)} />}
    </section>
  </>;
}
