import ClaudeCode from '@lobehub/icons/es/ClaudeCode';
import Codex from '@lobehub/icons/es/Codex';
import { FileText, FolderOpen, HardDrive } from 'lucide-react';

import { FadeIn } from '../FadeIn';
import { RealtimeEventFeed } from '../../app/RealtimeEventFeed';
import { SearchPreviewAnimation } from '../../app/SearchPreviewAnimation';
import s from '../../app/landing.module.css';
import { WaveDivider } from './icons';

function SharedFileMountPreview() {
  return (
    <div
      className={s.sharedFileMount}
      role="img"
      aria-label="Claude Code and Codex sharing a real-time mounted project file tree"
    >
      <div className={s.mountTopbar}>
        <HardDrive size={13} strokeWidth={1.8} aria-hidden="true" />
        <code>/relay/shared</code>
        <span className={s.mountStatus}>
          <span aria-hidden="true" />
          mounted
        </span>
      </div>

      <div className={s.mountAgentRow}>
        <div className={`${s.mountAgent} ${s.mountAgentClaude}`}>
          <ClaudeCode size={14} aria-hidden="true" />
          <span>Claude Code</span>
        </div>
        <div className={s.mountTransport} aria-hidden="true">
          <span className={s.mountPulseWrite} />
          <span className={s.mountPulseRead} />
        </div>
        <div className={`${s.mountAgent} ${s.mountAgentCodex}`}>
          <Codex size={14} aria-hidden="true" />
          <span>Codex</span>
        </div>
      </div>

      <div className={s.mountTree}>
        <div className={s.mountTreeHead}>
          <FolderOpen size={13} strokeWidth={1.8} aria-hidden="true" />
          <span>shared-workspace</span>
          <small>rev 42</small>
        </div>
        <div className={s.mountFile}>
          <FileText size={12} strokeWidth={1.8} aria-hidden="true" />
          <code>plans/release-plan.md</code>
          <span>+12</span>
        </div>
        <div className={s.mountFile}>
          <FileText size={12} strokeWidth={1.8} aria-hidden="true" />
          <code>artifacts/test-results.json</code>
          <span>sync</span>
        </div>
        <div className={s.mountFile}>
          <FileText size={12} strokeWidth={1.8} aria-hidden="true" />
          <code>build/manifest.json</code>
          <span>read</span>
        </div>
      </div>

      <div className={s.mountActivity} aria-hidden="true">
        <span>Claude wrote release-plan.md</span>
        <span>Codex mounted revision 42</span>
      </div>
    </div>
  );
}

/**
 * The "build the right context" band: real-time events, shared files, and search.
 * Rendered inside {@link DeliveryFeature} so it stays grouped with the delivery
 * story, matching the original DOM nesting.
 */
export function ContextCapabilities() {
  return (
    <div className={s.capabilityBand}>
      <WaveDivider variant="capability" />
      <div className={s.capabilityHeader}>
        <h3>Everything agents need to collaborate</h3>
        <p>
          Agents are only as good as the context you give them. Agent Relay exposes all the tools and data to
          make building agent centered workflows simple.
        </p>
      </div>

      <FadeIn direction="up" delay={0} className={s.capabilityItem}>
        <div className={`${s.featurePreview} ${s.capabilityPreview} ${s.searchCapabilityPreview}`}>
          <div className={s.previewAccentSearch} />
          <SearchPreviewAnimation />
        </div>
        <div className={s.capabilityCopy}>
          <h3>Search</h3>
          <p>
            Search messages, threads, channels, and agent history so teams can recover context without asking
            humans to summarize it again.
          </p>
        </div>
      </FadeIn>

      <FadeIn direction="up" delay={80} className={s.capabilityItem}>
        <div className={`${s.featurePreview} ${s.capabilityPreview} ${s.realtimeCapabilityPreview}`}>
          <div className={s.previewAccentGemini} />
          <div className={s.realtimePreview}>
            <RealtimeEventFeed />
          </div>
        </div>
        <div className={s.capabilityCopy}>
          <h3>Real-time events</h3>
          <p>
            WebSocket stream for live events. Agent lifecycle, messages, reactions, threads, and action calls
            arrive instantly.
          </p>
        </div>
      </FadeIn>

      <FadeIn direction="up" delay={160} className={s.capabilityItem}>
        <div className={`${s.featurePreview} ${s.capabilityPreview} ${s.sharedFilesCapabilityPreview}`}>
          <SharedFileMountPreview />
        </div>
        <div className={s.capabilityCopy}>
          <h3>Shared Files</h3>
          <p>
            Queue-first virtual filesystem-over-REST that ingests noisy external webhooks, projects a durable
            file tree, and performs conflict-safe writeback with retries, dead-lettering, and replay.
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
