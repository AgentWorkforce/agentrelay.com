'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePostHog } from '@posthog/next';
import { ArrowLeft, ArrowRight, Check, CheckCheck, Code2, Copy, Download, Info,
  GitPullRequest, LockKeyhole, ShieldCheck, ChevronDown, Terminal, Pi as PiIcon, Ellipsis } from 'lucide-react';
import Claude from '@lobehub/icons/es/Claude';
import Codex from '@lobehub/icons/es/Codex';
import Google from '@lobehub/icons/es/Google';
import Gemini from '@lobehub/icons/es/Gemini';
import OpenCode from '@lobehub/icons/es/OpenCode';
import Cursor from '@lobehub/icons/es/Cursor';
import GithubCopilot from '@lobehub/icons/es/GithubCopilot';
import Windsurf from '@lobehub/icons/es/Windsurf';
import Goose from '@lobehub/icons/es/Goose';
import Grok from '@lobehub/icons/es/Grok';
import { LogoIcon, LogoWordmark } from '../../../components/SiteNav';
import { agentLabel, canContinue, cloudConnectionsHref, CODING_AGENTS, DEFAULT_FACTORY,
  FACTORY_DRAFT_KEY, LEGACY_FACTORY_DRAFT_KEY, factoryCodeSections, factorySource, primaryAgent, readFactoryDraft,
  ONBOARDING_STAGES, onboardingPath, accessibleOnboardingStep, otherAgentIsSelected,
  type AgentId, type FactoryDraft } from '../../../lib/flow-onboarding';
import { SourcePicker, SourceIcon } from './SourcePicker';
import { sourceLabel, sourceSummary } from '../../../lib/flow-sources';
import s from './onboarding.module.css';

const questions = [
  { title: 'Where should your issues and tickets come from?', description: 'Choose your sources, or start with a Markdown file. Connect any accounts later.' },
  { title: 'Which agents do you use?', description: 'Choose the tools you use. No accounts to connect yet.' },
  { title: 'How should your agent handle each ticket?', description: 'Your agent reads the incoming ticket. Add instructions for how it should approach the work.' },
  { title: 'Who should challenge the code?', description: 'A separate reviewer looks for bugs before the PR reaches you.' },
  { title: 'How persistent should it be?', description: 'Let your coding agent fix review comments and try again.' },
  { title: 'Keep the final say.', description: 'Your agents do the work. Nothing ships until you approve it.' },
];
const suggestions = ['Implement the ticket and add regression tests', 'Start with a plan, then implement the ticket', 'Keep changes small and update the tests'];

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
  const editor = useRef<HTMLDivElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousStep = useRef<number | null>(null);
  const posthog = usePostHog();
  const ready = draft.step === 6;
  const emptyPreview = !started || loadingStage || !draft.sources.length;
  const question = questions[Math.min(draft.step, 5)];
  const source = factorySource(draft);
  const sections = factoryCodeSections(emptyPreview ? DEFAULT_FACTORY : draft);
  const otherSelected = otherAgentIsSelected(draft);
  const requestedAgentCount = draft.agents.filter(id => id !== 'claude' && id !== 'codex').length + (otherSelected ? 1 : 0);
  const comingSoonOnly = requestedAgentCount > 0 && !draft.agents.some(id => id === 'claude' || id === 'codex');
  const builder = primaryAgent(draft);
  const activeSection = draft.step === 0 && draft.sources.length ? 'sources' : sections.filter(section => section.id !== 'end').at(-1)?.id;
  let lineNumber = 0;

  useEffect(() => {
    try { setDraft(readFactoryDraft(localStorage.getItem(FACTORY_DRAFT_KEY)) ?? readFactoryDraft(localStorage.getItem(LEGACY_FACTORY_DRAFT_KEY)) ?? DEFAULT_FACTORY); }
    catch { /* Browser storage is optional. */ }
    setHydrated(true);
    return () => { if (copyTimeout.current) clearTimeout(copyTimeout.current); };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(FACTORY_DRAFT_KEY, JSON.stringify({ ...answers, step: started ? accessibleStep : answers.step })); }
    catch { setNotice('Browser storage unavailable. Download to keep your draft.'); }
  }, [answers, hydrated, started, accessibleStep]);

  useEffect(() => {
    if (hydrated && started && accessibleStep !== routeStep) {
      router.replace(onboardingPath(accessibleStep) + window.location.search);
    }
  }, [hydrated, started, accessibleStep, routeStep, router]);

  useEffect(() => {
    if (!hydrated || loadingStage) return;
    if (!started) {
      if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
        try { posthog?.capture('flows_onboarding_intro_viewed'); }
        catch { /* Measurement is optional. */ }
      }
      return;
    }
    questionHeading.current?.focus({ preventScroll: true });
    if (previousStep.current !== null && previousStep.current !== draft.step &&
      window.matchMedia('(max-width: 760px)').matches) {
      questionHeading.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
    previousStep.current = draft.step;
    setNotice('');
    if (hydrated && draft.step < 6 && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      try { posthog?.capture('flows_onboarding_step_viewed', { step: draft.step + 1 }); }
      catch { /* Measurement is optional. */ }
    }
  }, [draft.step, hydrated, posthog, started, loadingStage]);

  useEffect(() => {
    const section = editor.current?.querySelector<HTMLElement>(`[data-section="${activeSection}"]`);
    if (section && editor.current) editor.current.scrollTop = section.offsetTop - 20;
  }, [activeSection, draft.step, started]);

  function showQuestions() {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      try { posthog?.capture('flows_onboarding_intro_completed'); }
      catch { /* Starting the wizard must not depend on analytics. */ }
    }
    goToStep(0);
  }

  function goToStep(step: number) {
    router.push(onboardingPath(step) + window.location.search);
  }

  function toggleAgent(id: AgentId) {
    setDraft(current => ({ ...current, agents: current.agents.includes(id)
      ? current.agents.filter(agent => agent !== id) : [...current.agents, id] }));
  }

  function next() {
    if (!canContinue(draft)) return;
    // Record only product preferences, never the user's task text.
    if (draft.step === 1 && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      try { posthog?.capture('flows_onboarding_agents_selected', {
        agents: draft.agents,
        requested_agents: draft.agents.filter(id => !CODING_AGENTS.find(agent => agent.id === id)!.available),
        other_agent: otherSelected ? draft.otherAgent?.trim() || undefined : undefined,
      }); } catch { /* Optional analytics must not block the wizard. */ }
    }
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      try {
        posthog?.capture('flows_onboarding_step_completed', { step: draft.step + 1 });
        if (draft.step === 5) posthog?.capture('flows_onboarding_completed');
      } catch { /* Measurement must not block completion. */ }
    }
    goToStep(draft.step + 1);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true); setNotice('Flow copied to clipboard.');
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopied(false), 2200);
    } catch { setNotice('Clipboard unavailable. Use Download to save your flow.'); }
  }

  function downloadCode() {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/typescript' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'software-factory.flow.ts'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Downloaded software-factory.flow.ts.');
  }

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
    <main className={s.main}>
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

            {draft.step === 0 && <SourcePicker draft={draft} onChange={setDraft} />}

            {draft.step === 1 && <>
              <fieldset className={s.agentGroup}><legend>Select all you use</legend>
                <div className={s.agentGrid}>{CODING_AGENTS.filter(agent => agent.available).map(agent =>
                  <label className={`${s.agent} ${draft.agents.includes(agent.id) ? s.agentSelected : ''}`} key={agent.id}>
                    <AgentIcon id={agent.id} size={32} /><span>{agent.label}</span>
                    <input type="checkbox" checked={draft.agents.includes(agent.id)} onChange={() => toggleAgent(agent.id)} />
                  </label>
                )}</div>
              </fieldset>
              <details className={s.otherAgents}>
                <summary>Use another agent?<ChevronDown size={15} /><span>{requestedAgentCount > 0 ? `${requestedAgentCount} selected` : 'See more'}</span></summary>
              <fieldset className={`${s.agentGroup} ${s.soonGroup}`}><legend>Coming soon
                <span className={s.infoWrap} onMouseEnter={() => setShowInfo(true)} onMouseLeave={() => setShowInfo(false)}>
                  <button type="button" className={s.infoButton} aria-label="About coming soon agents" aria-describedby="coming-soon-info" onClick={() => setShowInfo(true)} onFocus={() => setShowInfo(true)} onBlur={() => setShowInfo(false)} onKeyDown={event => { if (event.key === 'Escape') setShowInfo(false); }}><Info size={14} /></button>
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
                  <input type="checkbox" checked={otherSelected} onChange={event => setDraft({ ...draft, otherAgentSelected: event.target.checked })} aria-controls="other-agent-field" />
                </label>
              </div>
                {otherSelected && <div id="other-agent-field" className={s.otherAgentField}>
                  <label htmlFor="other-coding-agent">Other agent</label>
                  <input id="other-coding-agent" type="text" maxLength={100} placeholder="Enter an agent’s name"
                    value={draft.otherAgent ?? ''} onChange={event => setDraft({ ...draft, otherAgent: event.target.value })}
                    aria-describedby="other-agent-help" />
                  <p id="other-agent-help">Tell us which coding agent you’d like us to support.</p>
                </div>}
              </fieldset>
              </details>
              {comingSoonOnly && <p className={s.selectionNote}>You can still build an example with Claude Code while support for your tools is on the way.</p>}
              {draft.agents.filter(id => id === 'claude' || id === 'codex').length > 1 && <p className={s.selectionNote}>{agentLabel(builder)} will write the code. You’ll choose the reviewer next.</p>}
            </>}

            {draft.step === 2 && <div className={s.taskChoice}>
              <label htmlFor="factory-task">Instructions for your agent</label>
              <textarea id="factory-task" maxLength={600} rows={4} placeholder="e.g. Implement the ticket, follow the existing patterns, and add tests" value={draft.task} onChange={event => setDraft({ ...draft, task: event.target.value })} />
              <span className={s.suggestionLabel}>Or start with an example</span>
              <div className={s.suggestions}>{suggestions.map(task => <button type="button" key={task} onClick={() => setDraft({ ...draft, task })}>{task}<ArrowRight size={14} /></button>)}</div>
            </div>}

            {draft.step === 3 && <fieldset className={s.reviewerGroup}><legend>Choose a reviewer</legend>
              {(['claude', 'codex'] as const).map(id => <label key={id} className={`${s.option} ${draft.reviewer === id ? s.optionSelected : ''}`}>
                <AgentIcon id={id} size={26} /><span><strong>{agentLabel(id)}</strong><small>{id === builder ? 'A separate session with fresh context' : 'A different agent from your implementer'}</small></span>
                <input type="radio" name="reviewer" value={id} checked={draft.reviewer === id} onChange={() => setDraft({ ...draft, reviewer: id })} />
              </label>)}
            </fieldset>}

            {draft.step === 4 && <fieldset className={s.roundsGroup}><legend>Maximum review rounds</legend>
              {([{ rounds: 1, label: 'Just one review', detail: 'Stop and hand it to me if there’s feedback.' },
                { rounds: 3, label: 'Work through the feedback', detail: 'Up to 3 reviews, with fixes in between.' },
                { rounds: 5, label: 'Keep working at it', detail: 'Up to 5 reviews for a more involved change.' }] as const).map(({ rounds, label, detail }) =>
                <label key={rounds} className={`${s.option} ${draft.rounds === rounds ? s.optionSelected : ''}`}><span className={s.roundNumber}>{rounds}</span><span><strong>{label}</strong><small>{detail}</small></span><input type="radio" name="rounds" checked={draft.rounds === rounds} onChange={() => setDraft({ ...draft, rounds })} /></label>
              )}
            </fieldset>}

            {draft.step === 5 && <div className={s.approvalChoice}>
              <div className={s.approvalVisual} aria-hidden="true"><Code2 /><span /><ShieldCheck /><span /><LockKeyhole /></div>
              <label className={`${s.option} ${draft.approval ? s.optionSelected : ''}`}><LockKeyhole size={27} /><span><strong>Require my approval</strong><small>Pause for me before the PR can be merged.</small></span><input type="checkbox" checked={draft.approval} onChange={event => setDraft({ ...draft, approval: event.target.checked })} /></label>
              <p>The flow prepares the PR. You review the result and merge it in GitHub when you’re ready.</p>
            </div>}

            <div className={s.navigation}>
              <button type="button" className={s.previous} onClick={() => goToStep(draft.step - 1)}><ArrowLeft size={15} /> Back</button>
              <button type="button" className={s.primary} disabled={!hydrated || !canContinue(draft)} onClick={next}>{draft.step === 5 ? 'Finish my flow' : 'Continue'}<ArrowRight size={17} /></button>
            </div>
          </div> : <div className={s.ready}>
            <span className={s.readyIcon}><CheckCheck size={30} /></span>
            <h1 tabIndex={-1} ref={questionHeading}>You just built your first flow.</h1>
            <p>{agentLabel(builder)} builds. {agentLabel(draft.reviewer!)} reviews. The feedback loop handles revisions, and you give the final approval.</p>
            <div className={s.readySummary}><GitPullRequest size={20} /><span>From incoming tickets to reviewed pull requests.</span></div>
            <section className={s.connectionChecklist} aria-label="Your connections to set up">
              <h2>{draft.sources.every(id => id === 'markdown') ? 'Your source is ready' : 'Your sources for this flow'}</h2>
              <ul>{draft.sources.map(id => <li key={id}>
                <SourceIcon id={id} /><div><strong>{sourceLabel(id)}</strong><p>{sourceSummary(id, draft.sourceSettings[id] ?? {})}</p></div><span>{id === 'markdown' ? 'No connection needed' : 'Not connected'}</span>
              </li>)}</ul>
              <p>We’ve saved your choices and filters in this browser and your flow file.</p>
            </section>
            <a href={cloudConnectionsHref()} className={s.google} onClick={() => {
              if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
                try { posthog?.capture('flows_onboarding_sign_in_clicked'); }
                catch { /* Sign-in must remain available without analytics. */ }
              }
            }}><Google.Color size={18} /> Continue with Google <ArrowRight size={17} /></a>
            <p className={s.handoffNote}>{draft.sources.every(id => id === 'markdown') ? 'Download your flow to run it with your Markdown file, or continue in Cloud to set up your coding tools.' : 'Next: sign in to Cloud and connect your tools. Download your flow to bring it with you.'}</p>
            <button type="button" className={s.previous} onClick={() => goToStep(0)}><ArrowLeft size={14} /> Review my answers</button>
          </div>}
        </section>}
        <section className={`${s.codePanel} ${emptyPreview ? s.codePanelEmpty : ''}`} aria-label="Your flow taking shape">
          <div className={s.editorHeader}><div><Code2 size={15} /><span>software-factory.flow.ts</span></div>{started && ready && <span className={s.live}>Ready</span>}</div>
          <div className={s.editor} ref={editor} tabIndex={0} aria-label="Flow source code">
            <pre><code>{sections.map(({ id, code }) => <span key={id} data-section={id} className={`${s.codeSection} ${!emptyPreview && activeSection === id ? s.highlighted : ''}`}>{(code + '\n').split('\n').map((line, index) => {
              lineNumber++;
              return <span className={s.codeLine} key={`${index}:${line}`} style={{ '--line': Math.min(index, 20) } as CSSProperties}><span className={s.lineNumber} aria-hidden="true">{lineNumber}</span><span><SyntaxLine text={line} /></span>{'\n'}</span>;
            })}</span>)}</code></pre>
          </div>
          <div className={s.editorFooter}><span>{ready && <><Check size={13} /> Ready</>}</span><div><button type="button" disabled={emptyPreview} onClick={copyCode} aria-label="Copy flow code">{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied' : 'Copy'}</button><button type="button" disabled={emptyPreview} onClick={downloadCode}><Download size={15} /> Download</button></div></div>
        </section>
      </div>
      <p className={s.notice} role="status">{notice}</p>
    </main>
  </div>;
}
