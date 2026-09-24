'use client';

import { Lock, ShieldCheck, Unplug } from 'lucide-react';
import Link from 'next/link';

import { FadeIn } from '../../../components/FadeIn';
import {
  FLOW_PLUGIN_BADGE_IMAGE_PATH,
  FLOW_PLUGIN_TRUST_TIER_COPY,
  FLOW_PLUGIN_TRUST_TIER_DISCLAIMER,
  flowPluginBadgeMarkdown,
  flowPluginInstallHref,
  flowPluginSourceUrl,
  getFlowPluginCatalog,
  pluginHasUnroutableTriggers,
  pluginInstallFlowUrl,
} from '../../../lib/flow-plugin-catalog';
import s from './plugins.module.css';

const CAPABILITIES = [
  {
    Icon: Lock,
    title: 'Pinned source',
    text: 'Every card is a sha and a content digest. Branches are never persisted; upgrades re-resolve.',
  },
  {
    Icon: ShieldCheck,
    title: 'Trust tiers, displayed only',
    text: 'First-party, verified, or community. The label never skips digest, compat, or event checks.',
  },
  {
    Icon: Unplug,
    title: 'Fail closed',
    text: 'A trigger the surface registry cannot route is plugin_event_unroutable, not a silent drop.',
  },
];

export function PluginsGallery() {
  const catalog = getFlowPluginCatalog();

  return (
    <div className={s.page}>
      <div className={s.heroSection}>
        <section className={s.hero}>
          <FadeIn direction="up">
            <div className={s.badge}>
              <span className={s.badgeDot} />
              FLOW PLUGINS
            </div>
          </FadeIn>

          <FadeIn direction="up" delay={60}>
            <h1 className={s.headline}>
              Install a plugin
              <br />
              onto a base flow
            </h1>
          </FadeIn>

          <FadeIn direction="up" delay={120}>
            <p className={s.subtitle}>
              A curated catalog of schema-2 flow extensions. Each card pins a public GitHub
              directory. Install controls appear only after every declared runtime dependency has
              merge and deployment evidence.
            </p>
          </FadeIn>

          <FadeIn direction="up" delay={180}>
            <nav className={s.pillNav}>
              <Link href="/docs/relayflows/plugins" className={s.pill}>
                Plugin contract
              </Link>
              <a
                href="https://github.com/AgentWorkforce/flows"
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
        {catalog.plugins.map((plugin, i) => {
          const installHref = flowPluginInstallHref(plugin);
          const flowUrl = pluginInstallFlowUrl(plugin);
          const pluginUrl = flowPluginSourceUrl(plugin);
          const tier = FLOW_PLUGIN_TRUST_TIER_COPY[plugin.tier];
          const badgeMarkdown =
            installHref && flowUrl &&
            flowPluginBadgeMarkdown({
              flowUrl,
              plugins: [pluginUrl],
            });

          return (
            <FadeIn key={plugin.name} direction="up" delay={Math.min(i, 6) * 40}>
              <article className={s.card}>
                <header className={s.cardHead}>
                  <h2 className={s.cardName}>{plugin.name}</h2>
                  <span className={s.tier} title={tier.summary}>
                    {tier.label}
                  </span>
                </header>
                <p className={s.cardDescription}>{plugin.description}</p>
                <div className={s.meta}>
                  {plugin.base.map((base) => (
                    <span key={base} className={s.chip}>
                      base: {base}
                    </span>
                  ))}
                  <span className={s.chip}>sha {plugin.ref.slice(0, 12)}</span>
                  <span className={s.chip}>sha256:{plugin.digest.slice(0, 12)}</span>
                  <span className={s.chip}>runtime {plugin.runtime.version}</span>
                </div>
                {plugin.activation.state === 'blocked' ? (
                  <p className={s.note}>
                    Catalog only: activation remains blocked until the Cloud capability adapter
                    and Relay native existing-session delivery are both merged and deployed.
                  </p>
                ) : null}
                {pluginHasUnroutableTriggers(plugin) ? (
                  <p className={s.note}>
                    Fail-closed: GitHub <code>pull_request.ready_for_review</code>,{' '}
                    <code>labeled</code>, and <code>unlabeled</code> are not in the surface
                    registry yet, so some Babysitter triggers remain{' '}
                    <code>plugin_event_unroutable</code>.
                  </p>
                ) : null}
                <div className={s.actions}>
                  {installHref ? (
                    <a
                      className={s.install}
                      href={installHref}
                      aria-label={`Install plugin ${plugin.name}`}
                    >
                      <img
                        src={FLOW_PLUGIN_BADGE_IMAGE_PATH}
                        alt="Install plugin"
                        width={140}
                        height={32}
                      />
                    </a>
                  ) : null}
                  <a
                    className={s.source}
                    href={pluginUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View source
                  </a>
                </div>
                {badgeMarkdown ? <pre className={s.snippet}>{badgeMarkdown}</pre> : null}
              </article>
            </FadeIn>
          );
        })}
      </div>

      <p className={s.disclaimer}>
        {FLOW_PLUGIN_TRUST_TIER_DISCLAIMER} <code>permissions.writes</code> is declared,
        UNENFORCED until gate 8.
      </p>
    </div>
  );
}
