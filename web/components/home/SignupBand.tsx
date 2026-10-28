import { teamsGoogleAuthHref } from '../../lib/teams-cloud';
import s from '../../app/landing.module.css';

export function SignupBand() {
  return (
    <section className={s.signupSection} aria-labelledby="signup-title">
      <div className={s.signupInner}>
        <div className={s.signupCopy}>
          <h2 id="signup-title" className={s.signupTitle}>
            Start building with Agent Relay
          </h2>
          <p className={s.signupSubtitle}>
            Sign in to connect your agents and start working together.
          </p>
        </div>
        <div className={s.signupActions}>
          <a className={s.ctaPrimary} href={teamsGoogleAuthHref('signup_band')}>
            Get started
          </a>
        </div>
      </div>
    </section>
  );
}
