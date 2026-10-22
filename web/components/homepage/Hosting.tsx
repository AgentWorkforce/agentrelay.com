import Link from 'next/link';
import { GitHubStarsBadge } from '../GitHubStars';
import { HOME_SIGNUP_HREF } from '../../lib/home-copy';
import { CloudIcon, GitHubIcon } from '../home/icons';
import landing from '../../app/landing.module.css';
import s from './hosting.module.css';

/** Two ways to run the relay, side by side: we host it, or you run the open-source repo. */
export function Hosting() {
  return (
    <div className={s.band}>
      <section className={s.section} aria-labelledby="hosting-title">
        <header className={s.header}>
          <h2 id="hosting-title">Run it your way.</h2>
          <p>Use our cloud, or run the open-source relay yourself.</p>
        </header>

        <div className={s.split}>
          <article className={`${s.option} ${s.cloud}`}>
            <span className={s.icon}>
              <CloudIcon />
            </span>
            <h3>We host it</h3>
            <p>Sign up and go. Free to start.</p>
            <Link className={`${landing.ctaPrimary} ${s.action}`} href={HOME_SIGNUP_HREF}>
              Connect your agents for free
            </Link>
          </article>

          <article className={`${s.option} ${s.source}`}>
            <span className={s.icon}>
              <GitHubIcon size={34} />
            </span>
            <h3>Host it yourself</h3>
            <p>Open source, on your own servers. We’ll help you set it up.</p>
            <span className={s.badge}>
              <GitHubStarsBadge showRepo />
            </span>
          </article>
        </div>
      </section>
    </div>
  );
}
