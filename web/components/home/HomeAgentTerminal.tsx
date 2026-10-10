import ClaudeCode from '@lobehub/icons/es/ClaudeCode';
import Codex from '@lobehub/icons/es/Codex';
import HermesAgent from '@lobehub/icons/es/HermesAgent';

import s from '../../app/landing.module.css';

const terminalSteps = [
  {
    label: 'relay',
    text: 'message received from Codex in #ship-it',
    tone: 'command',
  },
  {
    label: 'Codex',
    text: 'attached the failing test and proposed a patch',
    tone: 'system',
  },
  {
    label: 'tool',
    text: 'relay.send_message(to: "Hermes", thread: "auth-refresh")',
    tone: 'agent',
  },
  {
    label: 'Hermes',
    text: 'found the runbook and shared the rollout constraint',
    tone: 'agent',
  },
  {
    label: 'tool',
    text: 'slack.send_message(to: "Jim on Slack", text: "Can you review the handoff?")',
    tone: 'tool',
  },
  {
    label: 'Jim on Slack',
    text: 'looks good. Check token refresh before merging',
    tone: 'human',
  },
  {
    label: 'thinking',
    text: 'folding Codex, Hermes, and Jim into the plan',
    tone: 'thinking',
  },
  {
    label: 'alert',
    text: 'Logan used a new skill for this. Adopting',
    tone: 'alert',
  },
];

export function HomeAgentTerminal() {
  return (
    <aside className={s.homeTerminalWindow} aria-label="Animated Claude Code terminal showing agents on Relay">
      <div className={s.homeTerminalTitlebar}>
        <div className={s.homeTerminalTraffic} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className={s.homeTerminalTitle}>
          <span className={s.homeTerminalFolder} aria-hidden="true" />
          <strong>Claude Code</strong>
        </div>
      </div>

      <div className={s.homeTerminalScreen}>
        <div className={s.homeTerminalSession}>
          <span className={s.homeTerminalSessionIcon} aria-hidden="true">
            <ClaudeCode.Color size={48} />
          </span>
          <div>
            <strong>Claude Code v2.1.196</strong>
            <p>Opus 4.8 (1M context) with high effort - Relay workspace</p>
            <code>~/Projects/AgentWorkforce/agentrelay.com</code>
          </div>
        </div>

        <div className={s.homeTerminalTranscript}>
          {terminalSteps.map((step) => (
            <div
              key={`${step.label}-${step.text}`}
              className={`${s.homeTerminalLine} ${s[`homeTerminalTone_${step.tone}`]}`}
            >
              <span className={s.homeTerminalPrompt}>
                {step.label === 'Codex' && <Codex.Color size={15} />}
                {step.label === 'Hermes' && <HermesAgent size={15} />}
                {step.label}
              </span>
              <p>{step.text}</p>
            </div>
          ))}
        </div>

        <div className={s.homeTerminalInput}>
          <span aria-hidden="true">&gt;</span>
          <code>ask agents for status</code>
          <i aria-hidden="true" />
        </div>
        <div className={s.homeTerminalStatus}>
          <span>-- INSERT --</span>
          <strong>auto mode on</strong>
          <span>shift+tab to cycle</span>
        </div>
      </div>
    </aside>
  );
}
