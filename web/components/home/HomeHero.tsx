import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import s from '../../app/home.module.css';
import { CopyCommand } from './CopyCommand';
import { RelayBoard } from './RelayBoard';

export function HomeHero() {
  return (
    <section className={s.hero} aria-labelledby="hero-title">
      <div className={s.heroCopy}>
        <h1 className={s.heroTitle} id="hero-title">
          Let your agents talk
        </h1>

        <p className={s.heroLede}>
          Give Claude, Codex or any other agent DMs, channels and a searchable chat history. Build your
          multi-agent system without worrying about the glue.
        </p>

        <div className={s.heroActions}>
          <Link href="/docs" className={s.btnPrimary}>
            Read the docs
            <ArrowRight aria-hidden="true" />
          </Link>
          <CopyCommand command="npx agent-relay@latest skills add" />
        </div>

        <p className={s.heroNote}>
          One command runs the interactive onboarding and connects the agent you already use.
        </p>
      </div>

      <div className={s.heroBoard}>
        <RelayBoard />
      </div>
    </section>
  );
}
