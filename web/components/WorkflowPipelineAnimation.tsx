'use client';

import ClaudeCode from '@lobehub/icons/es/ClaudeCode';
import Codex from '@lobehub/icons/es/Codex';
import Gemini from '@lobehub/icons/es/Gemini';
import { Braces, Check, Mail, PauseCircle, UserRoundCheck } from 'lucide-react';

import s from './node-relay.module.css';

const paths: ReadonlyArray<{
  d: string;
  phase:
    | 'trigger'
    | 'agents'
    | 'join'
    | 'teamPlanner'
    | 'teamBuilder'
    | 'teamReviewer'
    | 'teamLoop'
    | 'publish'
    | 'email';
}> = [
  { d: 'M360 67 V86', phase: 'trigger' },
  { d: 'M360 129 V137 H230 V145', phase: 'agents' },
  { d: 'M360 137 H490 V145', phase: 'agents' },
  { d: 'M230 229 V246 H360 V260', phase: 'join' },
  { d: 'M490 229 V246 H360 V260', phase: 'join' },
  { d: 'M360 329 V340 H194 V354', phase: 'teamPlanner' },
  { d: 'M288 377 H432', phase: 'teamBuilder' },
  { d: 'M526 400 V412 C526 423 500 423 454 423', phase: 'teamReviewer' },
  { d: 'M266 423 C220 423 194 412 194 400', phase: 'teamLoop' },
  { d: 'M360 446 V452 H400 V458', phase: 'publish' },
  { d: 'M400 508 V522', phase: 'email' },
];

export function WorkflowPipelineAnimation() {
  return (
    <div
      className={`${s.container} ${s.pipelineContainer}`}
      role="img"
      aria-label="A vertical durable workflow showing Claude Code and Codex working in parallel, joining at a human approval gate, three agents handing work around a review loop, a deterministic publish step, and an email action"
    >
      <svg className={s.pipelineCanvas} viewBox="0 0 720 580" preserveAspectRatio="none" aria-hidden="true">
        {paths.map((path) => (
          <g key={path.d}>
            <path d={path.d} className={s.pipelinePath} />
            <path
              d={path.d}
              pathLength="1"
              className={`${s.pipelineSignal} ${s[`pipelineSignal_${path.phase}`]}`}
            />
          </g>
        ))}
      </svg>

      <div className={`${s.pipelineStage} ${s.pipelineTrigger}`}>
        <img src="/integration-logos/slack.svg" alt="" />
        <div>
          <strong>Slack request</strong>
          <span>Workflow triggered</span>
        </div>
      </div>

      <div className={`${s.pipelineStage} ${s.pipelineDeterministic} ${s.pipelineNormalize}`}>
        <Braces aria-hidden="true" />
        <div>
          <strong>Validate input</strong>
          <span>Schema and idempotency check</span>
        </div>
        <Check aria-hidden="true" className={s.pipelineCheck} />
      </div>

      <div className={`${s.pipelineStage} ${s.pipelineAgentWork} ${s.pipelineAgentClaude}`}>
        <div className={s.pipelineAgentHeader}>
          <span className={s.pipelineAgentIdentity}>
            <ClaudeCode.Color size={16} />
            Claude Code
          </span>
        </div>
        <div className={s.pipelineAgentBody}>
          <div className={s.pipelineTerminalPrompt}>
            <span aria-hidden="true">❯</span>
            <code>Draft release plan</code>
            <i aria-hidden="true" />
          </div>
          <div className={s.pipelineTerminalActivity} aria-hidden="true">
            <span className={s.pipelineTerminalPhase}>
              <b>✻</b>
              Read(issue #341)
            </span>
            <span className={s.pipelineTerminalPhase}>
              <b>⏺</b>
              Bash(npm test)
            </span>
            <span className={s.pipelineTerminalPhase}>
              <b>⏺</b>
              Write(release-plan.md)
            </span>
          </div>
          <span className={s.pipelineTerminalA11y}>Reading the issue, testing the repository, and writing release-plan.md</span>
        </div>
        <div className={s.pipelineAgentOutput}>
          <span>ANSWER</span>
          <strong>release-plan.md</strong>
        </div>
      </div>

      <div className={`${s.pipelineStage} ${s.pipelineAgentWork} ${s.pipelineAgentCodex}`}>
        <div className={s.pipelineAgentHeader}>
          <span className={s.pipelineAgentIdentity}>
            <Codex.Color size={16} />
            Codex
          </span>
        </div>
        <div className={s.pipelineAgentBody}>
          <div className={s.pipelineTerminalPrompt}>
            <span aria-hidden="true">›</span>
            <code>Review release plan</code>
            <i aria-hidden="true" />
          </div>
          <div className={s.pipelineTerminalActivity} aria-hidden="true">
            <span className={s.pipelineTerminalPhase}>
              <b>✻</b>
              Read(release-plan.md)
            </span>
            <span className={s.pipelineTerminalPhase}>
              <b>⏺</b>
              Bash(git diff --check)
            </span>
            <span className={s.pipelineTerminalPhase}>
              <b>⏺</b>
              Write(review-notes.md)
            </span>
          </div>
          <span className={s.pipelineTerminalA11y}>Reviewing the release plan, checking the diff, and writing review-notes.md</span>
        </div>
        <div className={s.pipelineAgentOutput}>
          <span>ANSWER</span>
          <strong>review-notes.md</strong>
        </div>
      </div>

      <span className={`${s.pipelineTransition} ${s.pipelineArtifactTransition}`}>agents.complete</span>

      <div className={`${s.pipelineStage} ${s.pipelineHumanGate}`}>
        <PauseCircle aria-hidden="true" />
        <div>
          <strong>Review required</strong>
          <span>Inspect both artifacts, steer either agent, then resume.</span>
        </div>
        <span className={s.pipelineGateActions}>
          <small>Reject</small>
          <small>Approve</small>
        </span>
      </div>

      <span className={`${s.pipelineTransition} ${s.pipelineApprovedTransition}`}>approved</span>

      <div className={`${s.pipelineStage} ${s.pipelineTeamAgent} ${s.pipelineTeamPlanner}`}>
        <ClaudeCode.Color size={16} aria-hidden="true" />
        <div>
          <strong>Planner</strong>
          <span>Refine the plan</span>
        </div>
      </div>

      <div className={`${s.pipelineStage} ${s.pipelineTeamAgent} ${s.pipelineTeamBuilder}`}>
        <Codex.Color size={16} aria-hidden="true" />
        <div>
          <strong>Builder</strong>
          <span>Build the change</span>
        </div>
      </div>

      <div className={`${s.pipelineStage} ${s.pipelineTeamAgent} ${s.pipelineTeamReviewer}`}>
        <Gemini.Color size={16} aria-hidden="true" />
        <div>
          <strong>Reviewer</strong>
          <span>Review and return</span>
        </div>
      </div>

      <span className={`${s.pipelineTransition} ${s.pipelinePassedTransition}`}>handoffs.complete</span>

      <div className={`${s.pipelineStage} ${s.pipelineDeterministic} ${s.pipelinePublish}`}>
        <Braces aria-hidden="true" />
        <div>
          <strong>Publish release</strong>
          <span>Run versioned deployment code</span>
        </div>
        <Check aria-hidden="true" className={s.pipelineCheck} />
      </div>

      <div className={`${s.pipelineStage} ${s.pipelineEmail}`}>
        <Mail aria-hidden="true" />
        <div>
          <strong>Email sent</strong>
          <span>Stakeholders notified</span>
        </div>
        <UserRoundCheck aria-hidden="true" className={s.pipelineCheck} />
      </div>
    </div>
  );
}
