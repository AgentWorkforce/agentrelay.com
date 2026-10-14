import Image from 'next/image';

import switchboard from '../../public/home-8/bell-switchboard.jpg';
import { SIGNUP_HREF } from '../home/HomeSections';
import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import { AgentList } from './AgentList';
import { Closing } from './Closing';
import { Demo } from './Demo';
import { DevStages } from './DevStages';
import { Hero } from './Hero';
import { RevealRoot } from './Reveal';
import { SharedSessions } from './SharedSessions';
import s from './home-8.module.css';

const PHOTO_SOURCE =
  'https://commons.wikimedia.org/wiki/File:Photograph_of_Women_Working_at_a_Bell_System_Telephone_Switchboard_(3660047829).jpg';

export function HomeEight() {
  return (
    <RevealRoot>
      <SiteNav
        singleAction
        actions={
          <a className={s.navCta} href={SIGNUP_HREF}>
            Sign up
          </a>
        }
      />

      <main>
        <Hero signupHref={SIGNUP_HREF} />

        <section className={s.intro} aria-labelledby="h8-intro">
          <div className={s.introText}>
            <h2 id="h8-intro" className={s.h2} data-reveal>
              Right now, you are the switchboard
            </h2>
            <div className={s.introCopy} data-reveal>
              <p className={s.introLead}>
                Claude Code finishes the migration. You copy its summary, switch windows and paste it into Codex.
              </p>
              <p>Codex has a question. You copy that back.</p>
              <p>Your teammate’s agent fixed the same bug yesterday. You find out at standup.</p>
              <p>
                Every handoff waits for you. Agent Relay takes you off the board: agents address each other by name,
                and the message lands in the session that needs it.
              </p>
            </div>
          </div>
          <figure className={s.introFigure} data-reveal>
            <div className={s.introPhoto}>
              <Image
                src={switchboard}
                alt="A long row of telephone operators in headsets plugging cords into a Bell System international switchboard"
                sizes="(max-width: 760px) 100vw, 58vw"
                className={s.introImg}
              />
            </div>
            <figcaption className={s.caption}>
              Operators at a Bell System international switchboard, connecting every call by hand. U.S. National
              Archives.
            </figcaption>
          </figure>
        </section>

        <section className={s.showcase} id="demo" aria-labelledby="h8-demo">
          <div className={s.showcaseText} data-reveal>
            <h2 id="h8-demo" className={s.h2}>
              Agents message agents
            </h2>
            <p className={s.body}>
              Pick who talks to whom and where it runs. The message arrives inside the recipient’s live session, and
              the reply comes straight back.
            </p>
            <p className={s.small}>Across tools, across machines, across teammates.</p>
          </div>
          <div className={s.showcaseDemo} data-reveal>
            <Demo />
          </div>
        </section>

        <section className={s.sharedSection} aria-label="Shared sessions">
          <SharedSessions />
        </section>

        <section className={s.agents} aria-labelledby="h8-agents">
          <div className={s.agentsHead} data-reveal>
            <h2 id="h8-agents" className={s.h2Two}>
              <span className={s.soft}>Works with the agent</span> you already use
            </h2>
            <a className={s.button} href={SIGNUP_HREF}>
              Sign up
            </a>
          </div>
          <div data-reveal>
            <AgentList />
          </div>
        </section>

        <section className={s.devSection} aria-label="For developers">
          <DevStages />
        </section>

        <Closing signupHref={SIGNUP_HREF} />

        <p className={s.credits}>
          Photograph:{' '}
          <a href={PHOTO_SOURCE} rel="noopener noreferrer">
            “Photograph of Women Working at a Bell System Telephone Switchboard”
          </a>
          , The U.S. National Archives, no known copyright restrictions, via Wikimedia Commons.
        </p>
      </main>

      <SiteFooter />
    </RevealRoot>
  );
}
