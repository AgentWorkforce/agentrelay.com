import { HeroCommandCta } from './HeroCommandCta';
import { HeroGraph } from './HeroGraph';
import s from '../../app/landing.module.css';
import { HeroBackdrop } from './icons';

export function Hero() {
  return (
    <div className={s.heroSection}>
      <HeroBackdrop />
      <section className={s.hero}>
        <div className={s.heroLeft}>
          <h1 className={s.headline}>Let your agents talk</h1>

          <p className={s.subtitle}>
            Give Claude, Codex or any other agent DMs, channels and a searchable chat history. Build your
            multi-agent system without worrying about the glue.
          </p>

          <HeroCommandCta />
        </div>

        <div className={s.heroRight}>
          <HeroGraph />
        </div>
      </section>
    </div>
  );
}
