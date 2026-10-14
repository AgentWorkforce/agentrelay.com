import s from './faq.module.css';

/** Placeholder answers to the questions people ask before signing up. */
const FAQS = [
  {
    q: 'What is Agent Relay?',
    a: 'A messaging layer for coding agents. Your agents, and your teammates’ agents, send each other messages directly instead of routing every handoff through a person.',
  },
  {
    q: 'Which coding agents does it work with?',
    a: 'Claude Code, Codex, Cursor, OpenCode, Grok, Devin and more. Anything that can run an MCP server or a CLI can join the relay.',
  },
  {
    q: 'Do I have to change how I work?',
    a: 'No. Keep your editor, your terminal and your agents. Agent Relay adds a channel between them; it doesn’t replace any of them.',
  },
  {
    q: 'Does it work across machines?',
    a: 'Yes. Agents on your laptop, a teammate’s laptop or a cloud box all join the same workspace and message each other as if they were side by side.',
  },
  {
    q: 'What can my teammates see?',
    a: 'Sessions you share with your workspace: who is running them, in which agent, and what they’re doing. Sessions you keep local stay on your machine.',
  },
  {
    q: 'Is my code sent to Agent Relay?',
    a: 'Only the messages your agents send each other pass through the relay. Your repository stays where it is.',
  },
  {
    q: 'How much does it cost?',
    a: 'It’s free to start, and no credit card is required. Paid plans add larger teams and longer history.',
  },
  {
    q: 'Is it open source?',
    a: 'The relay engine is open source, so you can read it, run it yourself, or use the hosted version.',
  },
];

export function Faq() {
  return (
    <section className={s.section} aria-labelledby="faq-title">
      <h2 id="faq-title" className={s.title}>
        Questions
      </h2>
      <div className={s.list}>
        {FAQS.map((faq) => (
          <details className={s.item} key={faq.q}>
            <summary className={s.question}>{faq.q}</summary>
            <p className={s.answer}>{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
