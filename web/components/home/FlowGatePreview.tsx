'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, FileCheck2, LockKeyhole, Terminal } from 'lucide-react';
import ClaudeCode from '@lobehub/icons/es/ClaudeCode';
import Image from 'next/image';
import Grok from '@lobehub/icons/es/Grok';
import Codex from '@lobehub/icons/es/Codex';
import s from './flow-gate-preview.module.css';

export function FlowGatePreview() {
  const [phase, setPhase] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = false;
    let current = 0;
    const delays = [1200, 1400, 3200, 1400, 2200, 2400];
    const start = () => {
      clearTimeout(timer);
      if (media.matches) { setPhase(2); return; }
      if (!visible || document.hidden) return;
      timer = setTimeout(() => {
        current = (current + 1) % delays.length;
        setPhase(current);
        start();
      }, delays[current]);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; start(); }, { threshold: 0.2 });
    if (root.current) observer.observe(root.current);
    media.addEventListener('change', start);
    document.addEventListener('visibilitychange', start);
    return () => { clearTimeout(timer); observer.disconnect(); media.removeEventListener('change', start); document.removeEventListener('visibilitychange', start); };
  }, []);
  const passed = phase === 5;
  const stages = [
    { label: 'Gmail', task: 'Receive mail', step: 0, x: 7, y: 45, icon: <Image src="/integration-logos/gmail.svg" alt="" width={21} height={21} /> },
    { label: 'Script', task: 'Classify', step: 1, x: 23, y: 45, icon: <Terminal size={19} /> },
    { label: 'Grok', task: 'Research competitors', step: 2, x: 43, y: 0, icon: <Grok size={21} /> },
    { label: 'Claude', task: 'Review backlog', step: 2, x: 43, y: 90, icon: <ClaudeCode size={21} /> },
    { label: 'Script', task: 'Verify conclusions', step: 3, x: 70, y: 45, icon: <Terminal size={19} /> },
    { label: 'Codex', task: 'Draft response', step: 4, x: 92, y: 45, icon: <Codex size={21} /> },
  ];
  const messages = [
    ['GMAIL', 'Customer email received.'],
    ['SCRIPT', 'Classifying the request.'],
    ['AGENTS', 'Researching competitors and reviewing backlog.'],
    ['SCRIPT', 'Verifying conclusions from both agents.'],
    ['CODEX', 'Drafting a response from the findings.'],
    ['CODEX', 'Response draft ready.'],
  ];
  const status = [
    'Email received. Classification is next.',
    'Running the classification script.',
    'Verification waits for both agent outputs.',
    'Requirements met. Codex can start.',
    'Codex is preparing the response.',
    'Response draft ready. Flow complete.',
  ];
  return (
    <div ref={root} className={s.panel} role="img" aria-label="Email workflow: Gmail receives mail, a script classifies it, Grok researches competitors and Claude reviews the backlog in parallel. A script verifies conclusions from both outputs, then Codex drafts a response.">
      <div aria-hidden="true" className={s.content}>
        <div className={s.branchNodes}>
          <svg className={s.branchLines} viewBox="0 0 100 168" preserveAspectRatio="none">
            <path className={phase >= 1 ? s.pathDone : ''} d="M7 63 L23 63" />
            <path className={phase >= 2 ? s.pathDone : ''} d="M23 63 L43 18 M23 63 L43 108" />
            <path className={phase >= 3 ? s.pathDone : ''} d="M43 18 L70 63 M43 108 L70 63" />
            <path className={phase >= 4 ? s.pathDone : ''} d="M70 63 L92 63" />
          </svg>
          {stages.map((stage) => (
            <div key={`${stage.label}-${stage.task}`} className={`${s.node} ${s.branchNode}`} style={{ left: `${stage.x}%`, top: stage.y }}>
              <span className={stage.step < phase ? s.complete : stage.step === phase ? s.active : s.locked}>{stage.icon}</span>
              <b>{stage.label}</b><small>{stage.task}</small>
            </div>
          ))}
        </div>
        <div className={s.agent}><span>{messages[phase][0]}</span><span>{messages[phase][1]}</span><Check size={14} /></div>
        <div className={s.requirements}>
          {[
            { file: 'classification.json', ready: phase >= 2, waiting: 'Classifying' },
            { file: 'research + backlog', ready: phase >= 3, waiting: 'Awaiting both' },
            { file: 'response.md', ready: phase >= 5, waiting: 'Pending' },
          ].map((item) => (
            <div key={item.file} className={`${s.row} ${!item.ready && phase === 2 && item.file === 'research + backlog' ? s.missing : ''}`}>
              <code>{item.file}</code><span className={item.ready ? s.good : s.pending}>{item.ready ? <><Check size={14} /> Ready</> : item.waiting}</span>
            </div>
          ))}
        </div>
        <div className={`${s.status} ${passed ? s.success : ''}`} key={phase}>
          {passed ? <FileCheck2 size={17} /> : <LockKeyhole size={17} />}<span>{status[phase]}</span>
        </div>
      </div>
    </div>
  );
}
