import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { agentLabel, isCodingAgent, type FactoryDraft } from '../../../lib/flow-onboarding';
import { defaultAgentPrompt, resolveAgentSettings, type AgentRole, type FlowAgentSettings } from '../../../lib/flow-agent-settings';
import type { FlowTrack } from '../../../lib/flow-analytics';
import s from './onboarding.module.css';

const roleLabels: Record<AgentRole, string> = { planner: 'Plan', 'plan-reviewer': 'Review plan', 'prototype-1': 'Implementation 1', 'prototype-2': 'Implementation 2', 'prototype-3': 'Implementation 3', comparator: 'Compare', implementer: 'Implement', adversary: 'Review', fixer: 'Fix review findings', 'check-discovery': 'Find how to run checks', 'check-repair': 'Repair failing checks' };

export function AgentStepEditor({ draft, roles, onChange, onClose, onTrack }: { draft: FactoryDraft; roles: AgentRole[]; onChange: (draft: FactoryDraft) => void; onClose: () => void; onTrack: FlowTrack }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [role, setRole] = useState(roles[0]);
  const [settings, setSettings] = useState<FlowAgentSettings>(draft.agentSettings ?? {});
  const workflow = draft.workflow!;
  const choices = [...new Set(draft.agents.filter(isCodingAgent))];
  if (!choices.length) choices.push('claude');
  const current = resolveAgentSettings(workflow, role, draft.agents, settings);
  const key = `${workflow}:${role}` as const;
  const invalid = roles.some(id => !resolveAgentSettings(workflow, id, draft.agents, settings).prompt.trim());
  useEffect(() => { dialog.current?.showModal(); }, []);
  function save() {
    onChange({ ...draft, agentSettings: settings });
    for (const id of roles) {
      const value = resolveAgentSettings(workflow, id, draft.agents, settings);
      onTrack('agent_settings_saved', { role: id, agent: value.agent, custom_model: Boolean(value.model), custom_prompt: value.prompt !== defaultAgentPrompt(workflow, id) });
    }
    dialog.current?.close();
  }
  return <dialog ref={dialog} className={`ph-no-capture ph-sensitive ${s.agentEditor}`} aria-labelledby="agent-editor-title" onClose={onClose}>
    <div className={s.agentEditorHeader}>
      <div><h2 id="agent-editor-title">Agent settings</h2><p>Customize how this step runs.</p></div>
      <button type="button" aria-label="Close agent settings" onClick={() => dialog.current?.close()}><X size={20} /></button>
    </div>
    {roles.length > 1 && <div className={s.agentRoleTabs} role="group" aria-label="Agent to configure">
      {roles.map(id => <button key={id} type="button" aria-pressed={role === id} onClick={() => setRole(id)}>{roleLabels[id]}</button>)}
    </div>}
    <form onSubmit={event => { event.preventDefault(); save(); }}>
      <div className={s.agentEditorBody}>
      <div className={s.agentEditorFields}>
        <label>Agent<select value={current.agent} onChange={event => setSettings({ ...settings, [key]: { ...current, agent: event.target.value as typeof current.agent, model: '' } })}>
          {choices.map(id => <option key={id} value={id}>{agentLabel(id)}</option>)}
        </select></label>
        <label>Model<input type="text" maxLength={120} value={current.model} placeholder="Agent default" aria-describedby="agent-model-help" onChange={event => setSettings({ ...settings, [key]: { ...current, model: event.target.value } })} /></label>
      </div>
      <p id="agent-model-help" className={s.agentEditorHint}>Leave the model blank to use {agentLabel(current.agent)}’s configured model, or enter a model ID available to your account.</p>
      <div className={s.agentReasoning}><span>Reasoning</span><strong>Agent default</strong></div>
      <p className={s.agentEditorHint}>Uses your agent’s reasoning settings. The flow runner doesn’t support overriding reasoning per step yet.</p>
      <label className={s.agentPrompt}>Step prompt<textarea rows={8} maxLength={6000} required value={current.prompt} onChange={event => setSettings({ ...settings, [key]: { ...current, prompt: event.target.value } })} aria-describedby="agent-prompt-help" /></label>
      <p id="agent-prompt-help" className={s.agentEditorHint}>The ticket and your extra instructions are included automatically.{role.startsWith('prototype-') ? ' Each implementation also receives its own approach and isolated worktree.' : role === 'comparator' ? ' The prototype worktree paths are included automatically.' : ''} Keep the named output files so later steps can use them.{role === 'adversary' && workflow === 'traditional' ? ' Both review rounds use these settings.' : ''}{role === 'fixer' ? ' This agent runs only if the first review finds issues.' : ''}</p>
      </div>
      <div className={s.agentEditorActions}>
        <button type="button" onClick={() => { const next = { ...settings }; delete next[key]; setSettings(next); }}>Restore defaults</button>
        <button type="button" onClick={() => dialog.current?.close()}>Cancel</button>
        <button className={s.agentSave} type="submit" disabled={invalid}>Save changes</button>
      </div>
    </form>
  </dialog>;
}
