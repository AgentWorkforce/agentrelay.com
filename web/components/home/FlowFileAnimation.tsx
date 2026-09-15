'use client';

import { useEffect, useRef, useState } from 'react';
import s from './flow-file-animation.module.css';

const prefix = `import { flow } from "@relayflows/surface";

export default flow(
  "customer-reply",
  { budget: "$5/run" },
  async (f) => {
    await f.agent("researcher", {
      task: "Research and write findings.md",
    });

    `;
const correction = 'await f.agent("send-reply");';
const ending = `// Verify before drafting.
    await f.run("test -s findings.md");

    await f.agent("responder", {
      task: "Use findings.md to draft reply.md",
    });

    f.done("success");
  },
);`;
const agentPrefix = `export default defineAgent({
  triggers: {
    github: [
      { on: "pull_request.opened" },
      { on: "pull_request.synchronize" },
    ],
  },
  handler: async (ctx, event) => {
    `;
const agentEnding = `const context = await event.expand("full");
    await ctx.harness.run({
      cwd: ctx.sandbox.cwd,
      prompt: [
        "Review this team's active work.",
        "Spot overlapping changes.",
        "Suggest lessons worth sharing.",
        JSON.stringify(context.data),
      ].join("\\n"),
    });
  },
});`;

function buildFrames(start: string, mistake: string, end: string) {
  const frames: { text: string; delay: number }[] = [{ text: '', delay: 600 }];
  for (let i = 1; i <= start.length + mistake.length; i++) {
    frames.push({ text: (start + mistake).slice(0, i), delay: i === start.length + mistake.length ? 1100 : 22 });
  }
  for (let i = mistake.length - 1; i >= 0; i--) frames.push({ text: start + mistake.slice(0, i), delay: i === 0 ? 450 : 38 });
  for (let i = 1; i <= end.length; i++) frames.push({ text: start + end.slice(0, i), delay: i === end.length ? 4500 : 25 });
  return frames;
}
const flowFrames = buildFrames(prefix, correction, ending);
const agentFrames = buildFrames(agentPrefix, '', agentEnding);

function highlight(text: string) {
  return text.split(/("[^"\n]*"|\/\/[^\n]*|\b(?:import|from|export|default|async|await|const)\b)/g).map((part, i) => (
    <span key={i} className={part.startsWith('"') ? s.string : part.startsWith('//') ? s.comment : /^(import|from|export|default|async|await|const)$/.test(part) ? s.keyword : undefined}>{part}</span>
  ));
}

export function FlowFileAnimation({ variant = 'flow' }: { variant?: 'flow' | 'agent' } = {}) {
  const isAgent = variant === 'agent';
  const finalCode = isAgent ? agentPrefix + agentEnding : prefix + ending;
  const frames = isAgent ? agentFrames : flowFrames;
  const root = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState('');
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let visible = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (motion.matches) { setCode(finalCode); return; }
      if (!visible || document.hidden) return;
      timer = setTimeout(() => {
        frame = (frame + 1) % frames.length;
        setCode(frames[frame].text);
        schedule();
      }, frames[frame].delay);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, { threshold: 0.15 });
    if (root.current) observer.observe(root.current);
    motion.addEventListener('change', schedule);
    document.addEventListener('visibilitychange', schedule);
    return () => { clearTimeout(timer); observer.disconnect(); motion.removeEventListener('change', schedule); document.removeEventListener('visibilitychange', schedule); };
  }, [finalCode, frames]);
  return (
    <div ref={root} className={s.editor} role="img" aria-label={isAgent ? "agent.ts: a proactive agent reacts to pull requests, spots overlapping work, and suggests lessons for the team." : "flow.ts being written: a researcher creates findings, a premature reply step is backspaced and replaced with a file check, then a responder drafts the reply."}>
      <div className={s.header} aria-hidden="true"><div className={s.dots}><i /><i /><i /></div><span>{isAgent ? 'agent.ts' : 'flow.ts'}</span><small>TypeScript</small></div>
      <div className={s.body} aria-hidden="true">
        <div className={s.numbers}>{finalCode.split('\n').map((_, i) => <span key={i}>{i + 1}</span>)}</div>
        <pre><code>{highlight(code)}<span className={s.cursor} /></code></pre>
      </div>
      <div className={s.footer} aria-hidden="true"><span>{code === finalCode ? 'Saved' : 'Editing'}</span><span>UTF-8</span></div>
    </div>
  );
}
