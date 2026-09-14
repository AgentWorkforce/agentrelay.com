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
const finalCode = prefix + ending;
const frames: { text: string; delay: number }[] = [{ text: '', delay: 600 }];
for (let i = 1; i <= prefix.length + correction.length; i++) {
  frames.push({ text: (prefix + correction).slice(0, i), delay: i === prefix.length + correction.length ? 1100 : 22 });
}
for (let i = correction.length - 1; i >= 0; i--) frames.push({ text: prefix + correction.slice(0, i), delay: i === 0 ? 450 : 38 });
for (let i = 1; i <= ending.length; i++) frames.push({ text: prefix + ending.slice(0, i), delay: i === ending.length ? 4500 : 25 });

function highlight(text: string) {
  return text.split(/("[^"\n]*"|\/\/[^\n]*|\b(?:import|from|export|default|async|await|const)\b)/g).map((part, i) => (
    <span key={i} className={part.startsWith('"') ? s.string : part.startsWith('//') ? s.comment : /^(import|from|export|default|async|await|const)$/.test(part) ? s.keyword : undefined}>{part}</span>
  ));
}

export function FlowFileAnimation() {
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
  }, []);
  return (
    <div ref={root} className={s.editor} role="img" aria-label="flow.ts being written: a researcher creates findings, a premature reply step is backspaced and replaced with a file check, then a responder drafts the reply.">
      <div className={s.header} aria-hidden="true"><div className={s.dots}><i /><i /><i /></div><span>flow.ts</span><small>TypeScript</small></div>
      <div className={s.body} aria-hidden="true">
        <div className={s.numbers}>{finalCode.split('\n').map((_, i) => <span key={i}>{i + 1}</span>)}</div>
        <pre><code>{highlight(code)}<span className={s.cursor} /></code></pre>
      </div>
      <div className={s.footer} aria-hidden="true"><span>{code === finalCode ? 'Saved' : 'Editing'}</span><span>UTF-8</span></div>
    </div>
  );
}
