import Link from 'next/link';
import HermesAgent from '@lobehub/icons/es/HermesAgent';
import OpenClaw from '@lobehub/icons/es/OpenClaw';
import { ArrowRight } from 'lucide-react';
import { SiSwift } from 'react-icons/si';

import { AGENT_TOOL_LABELS, AgentToolLogo } from '../AgentToolLogos';
import { InstallCommand } from '../InstallCommand';
import s from '../../app/landing.module.css';
import { GitHubIcon, PythonLogo, TypeScriptLogo } from './icons';

export function QuickStart() {
  return (
    <section className={s.installSection} aria-labelledby="install-title">
      <div className={s.installInner}>
        <div className={s.installCopyColumn}>
          <div className={s.installHeader}>
            <div className={s.installHeaderText}>
              <div className={s.installTitleRow}>
                <h2 id="install-title" className={s.installTitle}>
                  Make it yours with the SDK
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

        <div className={s.installVisual} role="img" aria-label="Supported agent and SDK logos">
          <div className={s.installVisualOrbit} aria-hidden="true">
            <svg className={s.installConnectionLayer} viewBox="0 0 320 220" focusable="false">
              <path
                className={s.installConnectionLine}
                d="M77 34H243M77 110H243M77 186H243M77 34V186M160 34V186M243 34V186"
              />
              <path className={s.installConnectionLineSoft} d="M77 34L243 186M243 34L77 186" />
              <circle
                className={`${s.installConnectionPulse} ${s.installConnectionPulseOne}`}
                cx="77"
                cy="34"
                r="3"
              />
              <circle
                className={`${s.installConnectionPulse} ${s.installConnectionPulseTwo}`}
                cx="243"
                cy="110"
                r="3"
              />
              <circle
                className={`${s.installConnectionPulse} ${s.installConnectionPulseThree}`}
                cx="160"
                cy="34"
                r="3"
              />
              <circle
                className={`${s.installConnectionPulse} ${s.installConnectionPulseFour}`}
                cx="243"
                cy="186"
                r="3"
              />
            </svg>
            <div className={s.installAgentLogos}>
              <span className={s.installAgentLogo} title={AGENT_TOOL_LABELS.claude}>
                <AgentToolLogo className={s.installAgentLogoIcon} provider="claude" />
              </span>
              <span className={s.installAgentLogo} title={AGENT_TOOL_LABELS.codex}>
                <AgentToolLogo className={s.installAgentLogoIcon} provider="codex" />
              </span>
              <span className={s.installAgentLogo} title={AGENT_TOOL_LABELS.gemini}>
                <AgentToolLogo className={s.installAgentLogoIcon} idPrefix="install-agent-gemini" provider="gemini" />
              </span>
              <span className={s.installAgentLogo} title="Python">
                <PythonLogo className={s.installAgentLogoIcon} />
              </span>
              <span className={s.installAgentLogo} title="TypeScript">
                <TypeScriptLogo className={s.installAgentLogoIcon} />
              </span>
              <span className={s.installAgentLogo} title="OpenClaw">
                <OpenClaw.Color className={s.installAgentLogoIcon} size="2.8rem" />
              </span>
              <span className={s.installAgentLogo} title="Swift">
                <SiSwift aria-hidden="true" className={s.installAgentLogoIcon} />
              </span>
              <span className={s.installAgentLogo} title="GitHub">
                <GitHubIcon className={s.installAgentLogoIcon} size={45} />
              </span>
              <span className={s.installAgentLogo} title="HermesAgent">
                <HermesAgent className={s.installAgentLogoIcon} size="2.8rem" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
