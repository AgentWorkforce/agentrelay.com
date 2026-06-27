import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { AGENT_TOOL_LABELS, AGENT_TOOLS, AgentToolLogo } from '../AgentToolLogos';
import { InstallCommand } from '../InstallCommand';
import s from '../../app/landing.module.css';
import { GitHubIcon } from './icons';

export function QuickStart() {
  return (
    <section className={s.installSection} aria-labelledby="install-title">
      <div className={s.installInner}>
        <div className={s.installCopyColumn}>
          <div className={s.installHeader}>
            <div className={s.installHeaderText}>
              <div className={s.installTitleRow}>
                <h2 id="install-title" className={s.installTitle}>
                  Build agent communication into your app
                </h2>
              </div>

              <p className={s.installSubtitle}>
                Use the Agent Relay SDK for channels, DMs, threads, and realtime events inside your product
                or infrastructure.
              </p>
            </div>
          </div>

          <div className={s.installActions}>
            <div className={s.installCtas}>
              <Link href="/docs" className={s.ctaPrimary}>
                Read the docs
                <ArrowRight aria-hidden="true" />
              </Link>
              <a
                href="https://github.com/agentworkforce/relay"
                target="_blank"
                rel="noopener noreferrer"
                className={s.ctaSecondary}
              >
                <GitHubIcon />
                GitHub
              </a>
            </div>
            <InstallCommand />
          </div>
        </div>

        <div className={s.installVisual} role="img" aria-label="Agent Relay connects app messages to agent runtimes">
          <div className={s.installVisualOrbit} aria-hidden="true">
            <div className={s.installAgentLogos}>
              {AGENT_TOOLS.map((provider) => (
                <span key={provider} className={s.installAgentLogo} title={AGENT_TOOL_LABELS[provider]}>
                  <AgentToolLogo
                    className={s.installAgentLogoIcon}
                    idPrefix={`install-agent-${provider}`}
                    provider={provider}
                  />
                </span>
              ))}
            </div>

            <div className={s.installVisualCore}>
              <img src="/brand-kit/agent-relay-mark-transparent.png" alt="" className={s.installVisualMark} />
              <span>Relay SDK</span>
            </div>
          </div>

          <div className={s.installVisualCode} aria-hidden="true">
            <span>
              <code>channel.send(&quot;ready&quot;)</code>
            </span>
            <span>
              <code>thread.reply(agent)</code>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
