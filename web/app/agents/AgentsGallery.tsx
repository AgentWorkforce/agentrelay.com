'use client';

import Link from 'next/link';
import { Box, Database, Zap } from 'lucide-react';

import { FadeIn } from '../../components/FadeIn';
import { BuildYourOwn } from '../../components/agents/BuildYourOwn';
import { IntegrationLogos } from '../../components/agents/IntegrationLogos';
import { AGENTS } from '../../lib/agents';
import s from './agents.module.css';

const CAPABILITIES = [
  {
    Icon: Box,
    title: 'Its own sandbox',
    text: 'Every agent runs isolated in its own cloud sandbox — no shared state, no blast radius.',
  },
  {
    Icon: Database,
    title: 'Persistent memory',
    text: 'Agents remember context across runs with scoped, expiring workspace memory.',
  },
  {
    Icon: Zap,
    title: 'One-click deploy',
    text: 'Launch on Agent Relay Cloud, or fork the source and run it yourself.',
  },
];

export function AgentsGallery() {
  return (
    <div className={s.page}>
      <div className={s.heroSection}>
        <section className={s.hero}>
          <FadeIn direction="up">
            <div className={s.badge}>
              <span className={s.badgeDot} />
              AGENT GALLERY
            </div>
          </FadeIn>

          <FadeIn direction="up" delay={60}>
            <h1 className={s.headline}>
              Proactive agents,
              <br />
              ready to deploy
            </h1>
          </FadeIn>

          <FadeIn direction="up" delay={120}>
            <p className={s.subtitle}>
              A gallery of open-source agents that watch your repos, inbox, and stack — then act. Pick one,
              fork it, and launch it on Agent Relay in one click.
            </p>
          </FadeIn>

          <FadeIn direction="up" delay={180}>
            <nav className={s.pillNav}>
              <Link href="/agents/use-cases" className={s.pill}>
                Browse use cases
              </Link>
              <a
                href="https://github.com/AgentWorkforce/agents"
                target="_blank"
                rel="noopener noreferrer"
                className={s.pill}
              >
                View on GitHub
              </a>
            </nav>
          </FadeIn>
        </section>
      </div>

      <div className={s.capabilities}>
        {CAPABILITIES.map(({ Icon, ...cap }, i) => (
          <FadeIn key={cap.title} direction="up" delay={i * 70}>
            <div className={s.capCard}>
              <span className={s.capIcon}>
                <Icon aria-hidden="true" />
              </span>
              <div>
                <h3 className={s.capTitle}>{cap.title}</h3>
                <p className={s.capText}>{cap.text}</p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>

      <div className={s.gallery}>
        <div className={s.listHead} aria-hidden="true">
          <span>Agent</span>
          <span>Integrations</span>
        </div>
        <ul className={s.list}>
          {AGENTS.map((agent, i) => (
            <li key={agent.slug} className={s.row}>
              <FadeIn direction="up" delay={Math.min(i, 6) * 40}>
                <Link href={`/agents/${agent.slug}`} className={s.rowLink}>
                  <span className={s.rowMain}>
                    <span className={s.rowName}>{agent.name}</span>
                    <span className={s.rowTagline}>{agent.tagline}</span>
                    {/* Its own reserved line, so revealing it on hover/focus
                        never shifts the row or hides the tagline. */}
                    <span className={s.rowTrigger}>
                      <span
                        className={agent.trigger.kind === 'schedule' ? s.kindSchedule : s.kindEvent}
                      >
                        {agent.trigger.kind}
                      </span>
                      <span className={s.rowTriggerText}>{agent.trigger.summary}</span>
                    </span>
                  </span>

                  <IntegrationLogos
                    integrations={agent.integrations}
                    className={s.rowLogos}
                    logoClassName={s.rowLogo}
                    chipClassName={s.chip}
                  />

                  <span className={s.rowArrow} aria-hidden="true">
                    →
                  </span>
                </Link>
              </FadeIn>
            </li>
          ))}
        </ul>
      </div>

      <BuildYourOwn />

      <div className={s.poweredWrapper}>
        <FadeIn direction="up">
          <div className={s.poweredCard}>
            <span className={s.poweredEyebrow}>Powered by Agent Relay</span>
            <p className={s.poweredText}>
              Every agent runs on the Agent Relay platform — identity, shared files, messaging, and scheduling
              out of the box. Fork one to your repo and make it yours.
            </p>
            <Link href="/agents/use-cases" className={s.pill}>
              See what they can do →
            </Link>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
