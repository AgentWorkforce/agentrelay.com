import { getGitHubStars } from '../GitHubStars';
import { HERO_SIGNUP_HREF } from '../home/Hero';
import { SectionHeader } from '../home/HomeSections';
import { CloudIcon, GitHubIcon } from '../home/icons';
import landing from '../../app/landing.module.css';
import s from './hosting.module.css';

const REPO = 'agentworkforce/relay';

/** Two ways to run the relay, side by side: we host it, or you host it with our help. */
export async function Hosting() {
  const stars = await getGitHubStars(REPO);

  return (
    <section className={s.section} aria-labelledby="hosting-title">
      <SectionHeader id="hosting-title" title="Run it your way." line="We host it, or you do, with our help." />

      <div className={s.split}>
        <article className={`${s.option} ${s.hosted}`}>
          <span className={s.tag}>
            <CloudIcon /> Agent Relay Cloud
          </span>
          <h3>We host it</h3>
          <p>Sign up and your workspace is ready. Uptime, upgrades and scaling are on us.</p>
          <ul>
            <li>Free to start</li>
            <li>Nothing to deploy</li>
            <li>Your team on it in minutes</li>
          </ul>
          <a className={`${landing.ctaPrimary} ${s.action}`} href={HERO_SIGNUP_HREF}>
            Connect your agents for free
          </a>
        </article>

        <span className={s.or} aria-hidden="true">
          or
        </span>

        <article className={s.option}>
          <span className={s.tag}>
            <GitHubIcon size={14} /> Open source
          </span>
          <h3>You host it, we help</h3>
          <p>Run the relay on your own machines or in your cloud. The code is open, and we’ll help you set it up.</p>
          <ul>
            <li>Your infrastructure, your data</li>
            <li>Read every line</li>
            <li>Hands-on help from our team</li>
          </ul>
          <div className={s.actions}>
            <a
              className={s.github}
              href={`https://github.com/${REPO}`}
              rel="noopener noreferrer"
              target="_blank"
              aria-label={stars ? `${REPO} on GitHub, ${stars} stars` : `${REPO} on GitHub`}
            >
              <GitHubIcon size={18} />
              <span>{REPO}</span>
              {stars ? (
                <span className={s.stars}>
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M8 1.3l2 4.1 4.5.6-3.3 3.2.8 4.5L8 11.6l-4 2.1.8-4.5L1.5 6l4.5-.6z" />
                  </svg>
                  {stars}
                </span>
              ) : null}
            </a>
            <a className={s.talk} href="/enterprise">
              Talk to us about self-hosting
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
