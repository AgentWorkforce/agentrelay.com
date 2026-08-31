import Link from 'next/link';

import { HeroCommandCta } from './HeroCommandCta';
import { HeroGraph } from './HeroGraph';
import s from '../../app/landing.module.css';
import { HeroBackdrop } from './icons';

export function Hero({
  headline = 'Let your agents talk',
  subtitle = 'Give Claude, Codex or any other agent DMs, channels and a searchable chat history. Build your multi-agent system without worrying about the glue.',
  commandIntro,
  command,
  ctaLabel,
  ctaHref,
  graphVariant = 'messaging',
}: {
  headline?: string;
  subtitle?: string;
  commandIntro?: string;
  command?: string;
  ctaLabel?: string;
  ctaHref?: string;
  graphVariant?: 'messaging' | 'workflows';
} = {}) {
  return (
    <div className={s.heroSection}>
      <HeroBackdrop variant={graphVariant} />
      <section className={s.hero}>
        <div className={s.heroLeft}>
          <div className={s.heroCopyGroup}>
            <h1 className={`${s.headline} ${graphVariant === 'workflows' ? s.workflowHeadline : ''}`}>
              {headline}
            </h1>

            <p className={s.subtitle}>{subtitle}</p>
          </div>

          {ctaLabel && ctaHref ? (
            <div className={s.heroPrimaryCtaWrap}>
              <Link href={ctaHref} className={`${s.ctaPrimary} ${s.heroStartCta}`}>
                {ctaLabel}
              </Link>
            </div>
          ) : (
            <HeroCommandCta intro={commandIntro} command={command} />
          )}
        </div>

        <div className={`${s.heroRight} ${graphVariant === 'workflows' ? s.heroRightWorkflows : ''}`}>
          <HeroGraph variant={graphVariant} />
        </div>
      </section>
    </div>
  );
}
