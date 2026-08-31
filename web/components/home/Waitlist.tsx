import { WaitlistForm } from '../WaitlistForm';
import s from '../../app/landing.module.css';

export function Waitlist({
  title = 'Be the first to know',
  subtitle = 'Join the waitlist for early access when we release new products.',
}: {
  title?: string;
  subtitle?: string;
} = {}) {
  return (
    <section className={s.waitlistSection} aria-labelledby="waitlist-title">
      <div className={s.waitlistInner}>
        <div className={s.waitlistCopy}>
          <h2 id="waitlist-title" className={s.waitlistTitle}>
            {title}
          </h2>
          <p className={s.waitlistSubtitle}>{subtitle}</p>
        </div>
        <div className={s.waitlistFormPanel}>
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
