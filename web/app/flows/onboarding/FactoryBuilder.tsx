'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Code2, Copy, Download, Info,
  ChevronDown, Terminal, Pi as PiIcon, Ellipsis } from 'lucide-react';
import Claude from '@lobehub/icons/es/Claude';
import Codex from '@lobehub/icons/es/Codex';
import Gemini from '@lobehub/icons/es/Gemini';
import OpenCode from '@lobehub/icons/es/OpenCode';
import Cursor from '@lobehub/icons/es/Cursor';
import GithubCopilot from '@lobehub/icons/es/GithubCopilot';
import Windsurf from '@lobehub/icons/es/Windsurf';
import Goose from '@lobehub/icons/es/Goose';
import Grok from '@lobehub/icons/es/Grok';
import { LogoIcon, LogoWordmark } from '../../../components/SiteNav';
import { canContinue, isCodingAgent, CODING_AGENTS, DEFAULT_FACTORY,
  FACTORY_DRAFT_KEY, PREVIOUS_FACTORY_DRAFT_KEY, LEGACY_FACTORY_DRAFT_KEY, factoryCodeSections, factorySource, readFactoryDraft,
  ONBOARDING_STAGES, onboardingPath, accessibleOnboardingStep, otherAgentIsSelected,
  type AgentId, type FactoryDraft } from '../../../lib/flow-onboarding';
import { WORKFLOWS } from '../../../lib/flow-workflows';
import { RunOptions } from './RunOptions';
import { WorkflowPicker, WorkflowPlan } from './WorkflowPicker';
import { SourcePicker, SourceIcon } from './SourcePicker';
import { sourceLabel, sourceSummary } from '../../../lib/flow-sources';
import s from './onboarding.module.css';
import { useFlowAnalytics } from './useFlowAnalytics';
import { FLOW_STAGES, lengthBucket } from '../../../lib/flow-analytics';

const questions = [
  { title: 'Where should your issues and tickets come from?', description: 'Choose your sources, or start with a Markdown file. Connect any accounts later.' },
  { title: 'Which agents do you use?', description: 'Choose the agents you have access to. You’ll need these installed wherever you run the flow, either on the computer or in the cloud. We’ll help with that later.' },
  { title: 'Choose your workflow.', description: 'How much planning and review does each ticket need? These are just examples. You can always make your own by editing the flow code.' },
];

function AgentIcon({ id, size = 22 }: { id: AgentId; size?: number }) {
  const icons = { claude: Claude.Color, codex: Codex.Color, gemini: Gemini.Color, opencode: OpenCode,
    cursor: Cursor, copilot: GithubCopilot, windsurf: Windsurf, aider: Terminal, goose: Goose, grok: Grok, pi: PiIcon };
  const Icon = icons[id];
  return <span className={`${s.agentIcon} ${s[`icon_${id}`] ?? ''}`}><Icon size={size} aria-hidden="true" /></span>;
}

function SyntaxLine({ text }: { text: string }) {
  if (text.trimStart().startsWith('//')) return <span className={s.comment}>{text || ' '}</span>;
  return <>{text.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:import|from|type|export|default|async|await|const|let|for|if|return|break|false|true)\b)/g).map((part, i) =>
    <span key={i} className={/^["']/.test(part) ? s.string : /^(import|from|type|export|default|async|await|const|let|for|if|return|break|false|true)$/.test(part) ? s.keyword : undefined}>{part}</span>
  )}</>;
}

export function FactoryBuilder() {
  const [answers, setDraft] = useState<FactoryDraft>(DEFAULT_FACTORY);
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const routeStep = ONBOARDING_STAGES.findIndex((_, index) => pathname === onboardingPath(index));
  const started = routeStep >= 0;
  const draft = { ...answers, step: started ? routeStep : answers.step };
  const accessibleStep = accessibleOnboardingStep(answers, routeStep);
  const loadingStage = started && (!hydrated || accessibleStep !== routeStep);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [previewModes, setPreviewModes] = useState<Record<string, 'plan' | 'code'>>({});
  const previewMode = previewModes[pathname] ?? (routeStep === 0 || routeStep === 1 || (routeStep === 2 && !draft.workflow) ? 'code' : 'plan');
  const setPreviewMode = (mode: 'plan' | 'code') => setPreviewModes(current => ({ ...current, [pathname]: mode }));
  const editor = useRef<HTMLDivElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousStep = useRef<number | null>(null);
  const { track, getJourneyId, markOutcome } = useFlowAnalytics(draft, FLOW_STAGES[Math.max(0, routeStep + 1)], hydrated && !loadingStage);
  const fieldStart = useRef<Record<string, number>>({});
  const storageStatus = useRef({ restored: false, failed: false, reported: false });
  const ready = draft.step === 3;
  const workflow = WORKFLOWS.find(option => option.id === draft.workflow);
  const emptyPreview = !started || loadingStage || !draft.sources.length;
  const hasPlanPreview = started && !loadingStage;
  const showingPlan = hasPlanPreview && previewMode === 'plan';
  const question = questions[Math.min(draft.step, 2)];
  const source = factorySource(draft);
  const sections = factoryCodeSections(emptyPreview ? DEFAULT_FACTORY : draft);
  const otherSelected = otherAgentIsSelected(draft);
  const requestedAgentCount = draft.agents.filter(id => !isCodingAgent(id)).length + (otherSelected ? 1 : 0);
  const comingSoonOnly = requestedAgentCount > 0 && !draft.agents.some(isCodingAgent);
  const activeSection = draft.step >= 2 ? 'task' : draft.step === 0 && draft.sources.length ? 'sources' : sections.filter(section => section.id !== 'end').at(-1)?.id;
  let lineNumber = 0;

  useEffect(() => {
    try {
      const saved = readFactoryDraft(localStorage.getItem(FACTORY_DRAFT_KEY)) ?? readFactoryDraft(localStorage.getItem(PREVIOUS_FACTORY_DRAFT_KEY)) ?? readFactoryDraft(localStorage.getItem(LEGACY_FACTORY_DRAFT_KEY));
      storageStatus.current.restored = Boolean(saved);
      setDraft(saved ?? DEFAULT_FACTORY);
    } catch { storageStatus.current.failed = true; }
    setHydrated(true);
    return () => { if (copyTimeout.current) clearTimeout(copyTimeout.current); };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!storageStatus.current.reported && !loadingStage) {
      track('draft_loaded', { restored: storageStatus.current.restored, storage_available: !storageStatus.current.failed });
      storageStatus.current.reported = true;
    }
    try { localStorage.setItem(FACTORY_DRAFT_KEY, JSON.stringify({ ...answers, step: started ? accessibleStep : answers.step })); }
    catch { if (!storageStatus.current.failed) track('storage_failed', { operation: 'save' }); storageStatus.current.failed = true; setNotice('Browser storage unavailable. Download to keep your draft.'); }
  }, [answers, hydrated, started, accessibleStep, loadingStage, track]);

  useEffect(() => {
    if (hydrated && started && accessibleStep !== routeStep) {
      router.replace(onboardingPath(accessibleStep) + window.location.search);
    }
  }, [hydrated, started, accessibleStep, routeStep, router]);

  useEffect(() => {
    if (!hydrated || loadingStage) return;
    if (!started) return;
    questionHeading.current?.focus({ preventScroll: true });
    if (previousStep.current !== null && previousStep.current !== draft.step &&
      window.matchMedia('(max-width: 760px)').matches) {
      questionHeading.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
    previousStep.current = draft.step;
    setNotice('');
  }, [draft.step, hydrated, started, loadingStage]);

  useEffect(() => {
    const section = editor.current?.querySelector<HTMLElement>(`[data-section="${activeSection}"]`);
    if (section && editor.current) editor.current.scrollTop = section.offsetTop - 20;
  }, [activeSection, draft.step, draft.workflow, started, emptyPreview]);

  function showQuestions() {
    track('intro_completed');
    goToStep(accessibleOnboardingStep(answers, answers.step));
  }

  function goToStep(step: number) {
    track('navigation_clicked', { target_stage: FLOW_STAGES[Math.max(0, step + 1)], direction: step < routeStep ? 'back' : 'forward' });
    router.push(onboardingPath(step) + window.location.search);
  }

  function updateDraft(next: FactoryDraft) {
    if (draft.step === 2 && next.workflow !== draft.workflow && next.workflow !== null) {
      if (!draft.workflow && previewMode !== 'plan') {
        setPreviewMode('plan');
        track('preview_changed', { mode: 'plan', interaction: 'workflow_selected' });
      }
    }
    for (const field of ['sources', 'agents'] as const) {
      if (JSON.stringify(next[field]) !== JSON.stringify(draft[field])) {
        track('choice_changed', { field, selected: next[field], selected_count: next[field].length });
      }
    }
    if (next.workflow !== draft.workflow) track('choice_changed', { field: 'workflow', from: draft.workflow, to: next.workflow });
    if (otherAgentIsSelected(next) !== otherSelected) track('choice_changed', { field: 'other_agent', selected: otherAgentIsSelected(next) });
    if (next.sourceSettings.slack?.mentioned !== draft.sourceSettings.slack?.mentioned) track('filter_configured', { source: 'slack', field: 'mentioned', enabled: Boolean(next.sourceSettings.slack?.mentioned) });
    setDraft(next);
  }

  function toggleAgent(id: AgentId) {
    updateDraft({ ...draft, agents: draft.agents.includes(id)
      ? draft.agents.filter(agent => agent !== id) : [...draft.agents, id] });
  }

  function next() {
    if (!canContinue(draft)) {
      const reason = draft.step === 0 ? 'source_required' : draft.step === 1 ? 'agent_required' : 'workflow_required';
      track('continue_blocked', { reason });
      setNotice(draft.step === 0 ? 'Choose at least one source to continue.' : draft.step === 1 ? 'Choose an agent, or enter one under Other.' : 'Choose a workflow to create your flow.');
      return;
    }
    track('step_completed');
    if (draft.step === 2) track('flow_created');
    goToStep(draft.step + 1);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(source);
      track('code_copied', { result: 'success' });
      setCopied(true); setNotice('Flow copied to clipboard.');
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopied(false), 2200);
    } catch { track('code_copied', { result: 'error', error_code: 'clipboard_unavailable' }); setNotice('Clipboard unavailable. Use Download to save your flow.'); }
  }

  function downloadCode() {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/typescript' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'software-factory.flow.ts'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    track('code_downloaded', { result: 'initiated' });
    setNotice('Downloaded software-factory.flow.ts.');
  }

  const navigation = <div className={`${s.navigation} ${draft.step === 2 ? s.workflowNavigation : ''}`}>
              <button type="button" className={s.previous} onClick={() => goToStep(draft.step - 1)}><ArrowLeft size={15} /> Back</button>
              <button type="button" className={s.primary} disabled={!hydrated} aria-disabled={!canContinue(draft)} onClick={next}>{draft.step === 2 ? 'Create my flow' : 'Continue'}<ArrowRight size={17} /></button>
            </div>;

  const codePanel = <section className={`ph-no-capture ph-sensitive ${s.codePanel} ${emptyPreview ? s.codePanelEmpty : ''}`} aria-label="Your flow taking shape">
          <div className={s.editorHeader}><div><Code2 size={15} /><span>software-factory.flow.ts</span></div>{started && ready && <span className={s.live}>Ready</span>}</div>
          <div className={s.editor} ref={editor} tabIndex={0} aria-label="Flow source code">
            <pre><code>{sections.map(({ id, code }) => <span key={id} data-section={id} className={`${s.codeSection} ${!emptyPreview && activeSection === id ? s.highlighted : ''}`}>{(code + '\n').split('\n').map((line, index) => {
              lineNumber++;
              return <span className={s.codeLine} key={`${index}:${line}`} style={{ '--line': Math.min(index, 20) } as CSSProperties}><span className={s.lineNumber} aria-hidden="true">{lineNumber}</span><span><SyntaxLine text={line} /></span>{'\n'}</span>;
            })}</span>)}</code></pre>
          </div>
          <div className={s.editorFooter}><span>{ready && <><Check size={13} /> Ready</>}</span><div><button type="button" disabled={emptyPreview} onClick={copyCode} aria-label="Copy flow code">{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied' : 'Copy'}</button><button type="button" disabled={emptyPreview} onClick={downloadCode}><Download size={15} /> Download</button></div></div>
        </section>;

  return <div className={s.page}>
    <div className={s.headerOuter}>
      <header className={s.header}>
        <div className={s.headerContent}>
          <Link href="/flows" className={s.logo} aria-label="Agent Relay"><LogoIcon /><LogoWordmark /></Link>
          <div className={s.headerProgress} role="progressbar" aria-label="Onboarding progress"
            aria-valuemin={0} aria-valuemax={ONBOARDING_STAGES.length} aria-valuenow={started ? routeStep + 1 : 0}
            aria-valuetext={started ? `Step ${routeStep + 1} of ${ONBOARDING_STAGES.length}: ${ready ? 'Connect your tools' : question.title}` : 'Ready to build your first flow'}>
            {ONBOARDING_STAGES.map((stage, index) => <span key={stage} aria-hidden="true" className={started && index <= routeStep ? s.progressActive : undefined} />)}
          </div>
        </div>
      </header>
    </div>
    <main className={s.main} onFocusCapture={event => {
      const field = event.target as HTMLInputElement;
      if (!/^(source-[a-z]+-[a-z]+|factory-task|other-coding-agent)$/.test(field.id)) return;
      fieldStart.current[field.id] = Date.now();
      track('field_focused', { field: field.id });
    }} onBlurCapture={event => {
      const field = event.target as HTMLInputElement;
      if (!/^(source-[a-z]+-[a-z]+|factory-task|other-coding-agent)$/.test(field.id)) return;
      track('field_completed', { field: field.id, filled: Boolean(field.value?.trim()), length_bucket: lengthBucket(field.value?.length ?? 0), editing_ms: Date.now() - (fieldStart.current[field.id] ?? Date.now()) });
    }}>
      <div className={s.workspace}>
      {!started ? <section className={s.welcome} aria-labelledby="welcome-title">
        <h1 id="welcome-title">Let’s build your first flow on Agent Relay.</h1>
        <p>A software factory is the easiest flow to set up. It’ll take about 5 minutes. Once you get the hang of Flows, you can build another one for other use cases.</p>
        <button type="button" className={s.primary} disabled={!hydrated} onClick={showQuestions}>
          {draft.step > 0 ? 'Continue building my flow' : 'Let’s get started'}<ArrowRight size={17} />
        </button>
      </section> : loadingStage ? <section className={s.builder} aria-busy="true"><p>Loading your flow…</p></section> : <section className={s.builder} aria-label="Build your first flow">
          {!ready ? <div key={draft.step} className={s.question}>
            <h1 tabIndex={-1} ref={questionHeading}>{question.title}</h1>
            <p className={s.description}>{question.description}</p>
            {comingSoonOnly && draft.step > 1 && <p className={s.exampleNote}>You’re building a Claude Code example. Your coming-soon preferences are saved.</p>}

            {draft.step === 0 && <SourcePicker draft={draft} onChange={updateDraft} onTrack={track} actions={navigation} />}

            {draft.step === 1 && <>
              <fieldset className={s.agentGroup}><legend>Select all you use</legend>
                <div className={s.agentGrid}>{CODING_AGENTS.filter(agent => agent.available).map(agent =>
                  <label className={`${s.agent} ${draft.agents.includes(agent.id) ? s.agentSelected : ''}`} key={agent.id}>
                    <AgentIcon id={agent.id} size={32} /><span>{agent.label}</span>
                    <input type="checkbox" checked={draft.agents.includes(agent.id)} onChange={() => toggleAgent(agent.id)} />
                  </label>
                )}</div>
              </fieldset>
              <details className={s.otherAgents} onToggle={event => track('help_toggled', { section: 'other_agents', open: event.currentTarget.open })}>
                <summary>Use another agent?<ChevronDown size={15} /></summary>
              <fieldset className={`${s.agentGroup} ${s.soonGroup}`}><legend>Coming soon
                <span className={s.infoWrap} onMouseEnter={() => { if (!showInfo) track('help_opened', { section: 'coming_soon', interaction: 'hover' }); setShowInfo(true); }} onMouseLeave={() => setShowInfo(false)}>
                  <button type="button" className={s.infoButton} aria-label="About coming soon agents" aria-describedby="coming-soon-info" onClick={() => setShowInfo(true)} onFocus={() => { if (!showInfo) track('help_opened', { section: 'coming_soon', interaction: 'focus' }); setShowInfo(true); }} onBlur={() => setShowInfo(false)} onKeyDown={event => { if (event.key === 'Escape') setShowInfo(false); }}><Info size={14} /></button>
                  <span id="coming-soon-info" role="tooltip" className={`${s.tooltip} ${showInfo ? s.tooltipOpen : ''}`}>We’ll use this answer to prioritize which coding agents we add.</span>
                </span>
              </legend><div className={s.soonGrid}>{CODING_AGENTS.filter(agent => !agent.available).map(agent =>
                <label className={`${s.agent} ${s.soonAgent} ${draft.agents.includes(agent.id) ? s.agentSelected : ''}`} key={agent.id}>
                  <AgentIcon id={agent.id} size={18} /><span>{agent.label}</span>
                  <input type="checkbox" checked={draft.agents.includes(agent.id)} onChange={() => toggleAgent(agent.id)} />
                </label>
              )}
                <label className={`${s.agent} ${s.soonAgent} ${otherSelected ? s.agentSelected : ''}`}>
                  <span className={s.agentIcon}><Ellipsis size={18} aria-hidden="true" /></span><span>Other</span>
                  <input type="checkbox" checked={otherSelected} onChange={event => updateDraft({ ...draft, otherAgentSelected: event.target.checked })} aria-controls="other-agent-field" />
                </label>
              </div>
                {otherSelected && <div id="other-agent-field" className={s.otherAgentField}>
                  <label htmlFor="other-coding-agent">Other agent</label>
                  <input id="other-coding-agent" type="text" maxLength={100} placeholder="Enter an agent’s name"
                    value={draft.otherAgent ?? ''} onChange={event => updateDraft({ ...draft, otherAgent: event.target.value })}
                    aria-describedby="other-agent-help" />
                  <p id="other-agent-help">Tell us which coding agent you’d like us to support.</p>
                </div>}
              </fieldset>
              </details>
              {comingSoonOnly && <p className={s.selectionNote}>You can still build an example with Claude Code while support for your tools is on the way.</p>}
            </>}

            {draft.step === 2 && <WorkflowPicker draft={draft} onChange={updateDraft} onTrack={track} actions={navigation} />}

            {draft.step === 1 && navigation}
          </div> : <div className={s.ready}>
            <h1 tabIndex={-1} ref={questionHeading}>Let’s run your first flow.</h1>
            <p className={s.runDescription}>Your software factory is built. Choose where to put it to work.</p>
            <RunOptions draft={draft} onNotice={setNotice} onTrack={track} getJourneyId={getJourneyId} markOutcome={markOutcome} />
            <details className={s.flowReview} onToggle={event => track('help_toggled', { section: 'review_flow', open: event.currentTarget.open })}>
              <summary>Review your flow<ChevronDown size={16} /></summary>
              <div className={s.reviewContent}>
                <div className={s.reviewHeading}><span>{workflow?.label}</span><button type="button" onClick={() => goToStep(2)}>Edit workflow</button></div>
                <section className={`ph-no-capture ph-sensitive ${s.connectionChecklist}`} aria-label="Your sources to connect">
                  <ul>{draft.sources.map(id => <li key={id}>
                    <SourceIcon id={id} /><div><strong>{sourceLabel(id)}</strong><p>{sourceSummary(id, draft.sourceSettings[id] ?? {})}</p></div><span>{id === 'markdown' ? 'No connection needed' : 'Connect in Cloud'}</span>
                  </li>)}</ul>
                  {comingSoonOnly && <p>This example uses Claude Code while support for your selected agents is on the way.</p>}
                  <button type="button" className={s.previous} onClick={() => goToStep(0)}>Edit sources and agents<ArrowRight size={13} /></button>
                </section>
              </div>
            </details>
          </div>}
        </section>}
        {hasPlanPreview ? <section className={`ph-no-capture ph-sensitive ${s.previewPane}`} aria-label="Workflow preview">
          <div className={s.previewSwitch} role="group" aria-label="Preview display">
            {(['plan', 'code'] as const).map(mode => <button key={mode} type="button" aria-pressed={previewMode === mode} aria-controls={`workflow-preview-${mode}`} onClick={() => {
              if (previewMode !== mode) { setPreviewMode(mode); track('preview_changed', { mode }); }
            }}>{mode === 'plan' ? 'Preview' : 'Code'}</button>)}
          </div>
          <div id="workflow-preview-plan" className={s.planPreview} hidden={!showingPlan} tabIndex={0} aria-label="Plan preview">
            <WorkflowPlan key={draft.workflow} draft={draft} onChange={updateDraft} onTrack={track} />
          </div>
          <div id="workflow-preview-code" hidden={showingPlan}>{codePanel}</div>
        </section> : codePanel}
      </div>
      <p className={s.notice} role="status">{notice}</p>
    </main>
  </div>;
}
