'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, GitPullRequest, LockKeyhole, Mail, Pause, Play, Terminal, X } from 'lucide-react';
import ClaudeCode from '@lobehub/icons/es/ClaudeCode';
import Claude from '@lobehub/icons/es/Claude';
import Codex from '@lobehub/icons/es/Codex';
import Grok from '@lobehub/icons/es/Grok';
import {
  CANVAS_HEIGHT, CANVAS_WIDTH, NODE_WIDTH, workflowCameraTarget,
  workflowDuration, workflowEdges, workflowGatePassed, workflowNodes, workflowPhases, type WorkflowNode,
} from '../../lib/feature-request-demo';
import s from './flow-gate-preview.module.css';
import home from '../../app/landing.module.css';

function ProductIcon({ name }: { name: string }) {
  if (name === 'claude-code') return <ClaudeCode size={25} />;
  if (name === 'claude') return <Claude size={25} />;
  if (name === 'codex') return <Codex size={25} />;
  if (name === 'grok') return <Grok size={25} />;
  if (name === 'script') return <Terminal size={23} />;
  return <Image src={`/integration-logos/${name}.svg`} alt="" width={24} height={24} />;
}

function CodingTerminal({ node }: { node: WorkflowNode }) {
  const claude = node.icon === 'claude-code';
  const reviewing = node.detail === 'review';
  const file = node.id.startsWith('frontend') ? 'sso-settings.tsx' : 'saml-provider.ts';
  return <div className={s.codingTerminal} data-agent={claude ? 'claude' : 'codex'}>
    <div className={s.terminalOutput}>
      <span>› {reviewing ? 'Review' : 'Read'} {file}</span>
      <span>└ {reviewing ? 'Checking edge cases…' : 'Applying changes…'}</span>
      <span className={s.terminalResult}>{reviewing ? '✓ Assertions checked' : '+ ' + (node.detail === 'frontend' ? 'SSO settings updated' : 'SAML handler updated')}</span>
    </div>
    <div className={s.terminalWorking}><span className={claude ? home.heroTermActivityGlyph : home.heroCodexWorkingMarker}>{claude ? '✻' : '•'}</span><b>{claude ? 'Thinking' : 'Working'}</b><span className={home.heroTermCursor} /></div>
    <div className={s.terminalFinished}><Check size={10} />{reviewing ? 'Review complete' : 'Changes ready'}</div>
  </div>;
}

function NodeDetail({ node }: { node: WorkflowNode }) {
  switch (node.detail) {
    case 'email':
      return <div className={s.email}><span className={s.avatar}>JL</span><div><b>Can you add SSO?</b><span className={s.skeleton} /><span className={s.skeleton} /></div></div>;
    case 'classification':
      return <div className={s.classification}><Terminal size={11} /><span>feature / enterprise / auth</span></div>;
    case 'research':
      return <div className={s.research}>{['SAML', 'SCIM', 'SSO'].map((label, i) => <div key={label}><span>{label}</span>{[0, 1, 2].map((j) => <i key={j} data-filled={j !== i % 2} />)}</div>)}</div>;
    case 'retention':
      return <div className={s.retention}><span>Renewal risk</span><div>{Array.from({ length: 12 }, (_, i) => <i key={i} data-filled={i < 8} />)}</div></div>;
    case 'priority':
      return <div className={s.gateStatus}><span className={s.waitLabel}><LockKeyhole size={12} /> Evidence required</span><span className={s.passLabel}><Check size={12} /> P1 · Build approved</span></div>;
    case 'human':
      return <div className={`${s.gateStatus} ${s.humanStatus}`}><span className={s.waitLabel}><LockKeyhole size={12} /> Waiting for {node.icon === 'will' ? 'Will' : 'Khaliq'}</span><span className={s.passLabel}><Check size={12} /> Approved in Slack</span></div>;
    case 'frontend':
    case 'backend':
    case 'review':
      return <CodingTerminal node={node} />;
    case 'tests':
      return <><div className={s.tests}>{Array.from({ length: 8 }, (_, j) => <span key={j} style={{ animationDelay: `${j * 200}ms` }}><Check size={10} /></span>)}</div><div className={s.gateStatus}><span className={s.waitLabel}><LockKeyhole size={12} /> All checks required</span><span className={s.passLabel}><Check size={12} /> Checks passed</span></div></>;
    case 'pull-request':
      return <div className={s.pullRequest}><GitPullRequest size={14} /><span>Enterprise SSO</span><span className={s.prNumber}>#249</span></div>;
    case 'draft':
      return <div className={s.draft}><Mail size={12} /><div><span className={s.skeleton} /><span className={s.skeleton} /><span className={s.skeleton} /></div></div>;
    case 'crm-draft':
      return <div className={s.draft}><Image src="/integration-logos/hubspot.svg" alt="HubSpot" width={14} height={14} /><div><span className={s.skeleton} /><span className={s.skeleton} /></div></div>;
    case 'crm':
      return <div className={s.crm}><b>Enterprise account</b><span>Feature request <i>SSO</i></span><span>Status <i>Approved</i></span></div>;
    case 'sent':
      return <div className={s.message}><b>Re: Enterprise SSO</b><div><Mail size={12} /><span>Your feature is approved.</span><Check size={12} /></div></div>;
    case 'slack':
      return <div className={s.message}><b>#engineering</b><div><Check size={12} /><span>CRM updated · customer emailed</span></div></div>;
  }
}

export function FlowGatePreview() {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const timeline = useRef<HTMLInputElement>(null);
  const scrubbing = useRef(false);
  const clock = useRef(0);
  const camera = useRef(0);
  const markerId = useId();
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 5>(1);
  const [reduced, setReduced] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const phase = workflowPhases[phaseIndex];

  useEffect(() => {
    const element = root.current;
    const canvas = track.current;
    const windowElement = viewport.current;
    if (!element || !canvas || !windowElement) return;
    element.style.setProperty('--work-speed', String(speed));
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const paths = Array.from(canvas.querySelectorAll<SVGPathElement>('[data-route]'));
    const routeMap = new Map(workflowEdges.map((edge, i) => [edge.id, { path: paths[i], length: paths[i].getTotalLength() }]));
    const pulses = Array.from(canvas.querySelectorAll<SVGGElement>('[data-pulse]'));
    const cards = Array.from(canvas.querySelectorAll<HTMLElement>('[data-node]'));
    let visible = false;
    let frame = 0;
    let previous: number | undefined;
    let lastIndex = -1;

    const render = (delta: number) => {
      let time = clock.current;
      let index = 0;
      while (time >= workflowPhases[index].duration && index < workflowPhases.length - 1) time -= workflowPhases[index++].duration;
      const current = workflowPhases[index];
      if (index !== lastIndex) {
        lastIndex = index;
        setPhaseIndex(index);
        element.dataset.phase = current.name;
        cards.forEach((card, i) => {
          const id = workflowNodes[i].id;
          card.dataset.state = current.failed?.includes(id) ? 'failed' : current.done.includes(id) ? 'done' : current.active.includes(id) ? 'active' : 'waiting';
        });
        paths.forEach((path, i) => { path.dataset.traversing = String(current.routes.includes(workflowEdges[i].id)); });
      }
      const target = workflowCameraTarget(index, windowElement.clientWidth);
      camera.current = media.matches ? target : camera.current + (target - camera.current) * (1 - Math.exp(-delta / 480));
      canvas.style.transform = `translate3d(${-camera.current}px, 0, 0)`;
      canvas.style.opacity = media.matches || paused || scrubbing.current ? '1' : String(Math.min(1, (clock.current + 100) / 400, (workflowDuration - clock.current) / 400));
      element.style.setProperty('--progress', `${clock.current / workflowDuration * 100}%`);
      if (timeline.current) timeline.current.value = String(clock.current);
      pulses.forEach((pulse, i) => {
        const route = routeMap.get(current.routes[i]);
        pulse.style.opacity = !route || media.matches ? '0' : '1';
        if (!route) return;
        const progress = Math.min(1, time / Math.min(1600, current.duration * .6));
        const point = route.path.getPointAtLength(route.length * progress);
        pulse.setAttribute('transform', `translate(${point.x} ${point.y})`);
      });
    };
    const tick = (now: number) => {
      const delta = previous === undefined ? 16 : now - previous;
      previous = now;
      clock.current += delta * speed;
      if (clock.current >= workflowDuration) { clock.current = 0; camera.current = 0; }
      render(delta * speed);
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      previous = undefined;
      setReduced(media.matches);
      const running = visible && !document.hidden && !media.matches && !paused && !scrubbing.current;
      element.dataset.running = String(running);
      render(media.matches ? 1000 : 16);
      if (running) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .2 });
    const resize = new ResizeObserver(sync);
    observer.observe(element);
    resize.observe(windowElement);
    media.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    element.addEventListener('workflow-seek', sync);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      media.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
      element.removeEventListener('workflow-seek', sync);
    };
  }, [paused, speed]);

  const seek = (milliseconds: number) => {
    clock.current = Math.max(0, Math.min(workflowDuration, milliseconds));
    let remaining = clock.current;
    let index = 0;
    while (index < workflowPhases.length - 1 && remaining >= workflowPhases[index].duration) remaining -= workflowPhases[index++].duration;
    if (viewport.current) camera.current = workflowCameraTarget(index, viewport.current.clientWidth);
    root.current?.dispatchEvent(new Event('workflow-seek'));
  };

  const finishScrubbing = () => {
    scrubbing.current = false;
    root.current?.dispatchEvent(new Event('workflow-seek'));
  };

  return (
    <div ref={root} className={s.graph} data-phase="intake" data-running="false">
      <div ref={viewport} className={s.viewport} style={{ height: CANVAS_HEIGHT }} role="img" aria-label="A Gmail SSO feature request is classified by a script. Grok researches competitor functionality while Claude evaluates customer retention risk. A priority agent requires both outputs. A human gate waits for Will Washburn to approve in Slack. Will asks whether SSO can ship before the customer's renewal, sending the flow back to Codex to revise the plan before returning for his approval. Claude Code and Codex implement and review the feature through revision loops and tests. After the review cycles and tests, GitHub opens the reviewed pull request, then a human gate waits for Khaliq Gant to approve in Slack. Both human gates show their real profile photos alongside Slack. After approval, two separate Claude agents update HubSpot CRM and send a customer email through Gmail. Both updates must finish before the flow notifies Slack.">
        <div ref={track} className={s.track} style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }} aria-hidden="true">
          <svg className={s.connections} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
            <defs><marker id={markerId} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 1 L7 4 L1 7" fill="none" stroke="#9e9388" strokeWidth="1.2" /></marker></defs>
            {workflowEdges.map((edge) => <path key={edge.id} data-route={edge.id} data-loop={edge.loop} d={edge.d} markerEnd={edge.loop ? `url(#${markerId})` : undefined} />)}
            {workflowNodes.filter((node) => 'gate' in node).map((node) => <path key={node.id} className={s.gateStop} data-open={workflowGatePassed(node.id, phase)} d={`M${node.x - 12} ${node.y + 22} V${node.y + 62}`} />)}
            {[0, 1].map((i) => <g key={i} data-pulse={i} className={s.pulse}><circle r="9" opacity=".12" /><circle r="3" /></g>)}
          </svg>
          {workflowNodes.map((node, i) => (
            <div key={node.id} className={`${s.nodeGroup} ${'gate' in node ? s.gateGroup : ''} ${node.detail === 'human' ? s.humanGroup : ''}`} style={{ left: node.x, top: node.y, width: NODE_WIDTH }} data-node={node.id} data-state={i === 0 ? 'active' : 'waiting'} data-gate-state={'gate' in node ? (workflowGatePassed(node.id, phase) ? 'passed' : 'locked') : undefined}>
              <div className={s.node}>
                <span className={`${s.icon} ${node.icon.startsWith('claude') ? s.claude : ''} ${node.icon === 'github' ? s.github : ''}`}>
                  {'photo' in node ? <span className={s.person}><Image src={node.photo} alt={node.name} width={44} height={44} className={s.portrait} /><span className={s.slackBadge}><Image src="/integration-logos/slack.svg" alt="Slack" width={15} height={15} /></span></span> : <ProductIcon name={node.icon} />}
                </span>
                <span className={s.nodeText}><b>{node.name}</b><small>{node.action}</small></span>
                <span className={s.stateIcon}><Check size={12} /><X size={12} /></span>
              </div>
              {'gate' in node && <span className={s.required}><LockKeyhole size={9} />{node.detail === 'human' ? 'HUMAN APPROVAL' : node.id === 'priority' ? 'PRIORITY GATE' : 'REQUIRED CHECKS'}</span>}
              {phase.feedback?.node === node.id ? <div className={s.feedback}><div><Image src="/authors/will.png" alt="" width={18} height={18} /><b>Will</b><Image src="/integration-logos/slack.svg" alt="Slack" width={12} height={12} /></div><p>{phase.feedback.question}</p>{phase.feedback.answer && <span className={s.feedbackAnswer}><Codex size={13} />{phase.feedback.answer}</span>}</div> : <NodeDetail node={node} />}
            </div>
          ))}
        </div>
      </div>
      <div className={s.footer}>
        <input ref={timeline} className={s.timeline} type="range" min={0} max={workflowDuration} step={100} defaultValue={0} aria-label="Workflow timeline" onChange={(event) => seek(event.currentTarget.valueAsNumber)} onPointerDown={(event) => { scrubbing.current = true; event.currentTarget.setPointerCapture(event.pointerId); root.current?.dispatchEvent(new Event('workflow-seek')); }} onPointerUp={finishScrubbing} onPointerCancel={finishScrubbing} onLostPointerCapture={finishScrubbing} onKeyDown={(event) => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) setPaused(true); }} />
        <div className={s.controls}><button className={s.speed} type="button" aria-label={`Playback speed ${speed}x. Change to ${speed === 1 ? 2 : speed === 2 ? 5 : 1}x`} onClick={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 5 : 1)}>{speed}x</button>{!reduced && <button type="button" aria-label={paused ? 'Play workflow' : 'Pause workflow'} onClick={() => setPaused(!paused)}>{paused ? <Play size={13} /> : <Pause size={13} />}</button>}</div>
      </div>
    </div>
  );
}
