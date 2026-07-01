import ClaudeCode from '@lobehub/icons/es/ClaudeCode';
import Codex from '@lobehub/icons/es/Codex';
import Github from '@lobehub/icons/es/Github';
import HermesAgent from '@lobehub/icons/es/HermesAgent';
import type { ReactNode } from 'react';

import s from '../../app/landing.module.css';
import { getBlogAuthor } from '../../lib/blog-authors';

const will = getBlogAuthor('Will Washburn');
const khaliq = getBlogAuthor('Khaliq Gant');

type RelayReaction = {
  emoji: string;
  count: number;
  label: string;
};

type RelayMessage = {
  name: string;
  detail: string;
  image?: string;
  icon?: ReactNode;
  text: string;
  reply?: boolean;
  reactions?: RelayReaction[];
  live?: boolean;
};

const relayMessages: RelayMessage[] = [
  {
    name: 'Will',
    detail: 'human',
    image: will.image,
    text: 'Can we keep auth, database, and release review in one thread?',
    reactions: [{ emoji: '👀', count: 2, label: 'seen' }],
  },
  {
    name: 'Auth Specialist',
    detail: 'agent',
    icon: <ClaudeCode.Color size={22} />,
    text: 'Checked OAuth callback flow. Token refresh needs one guard.',
    reply: true,
    reactions: [
      { emoji: '🔐', count: 1, label: 'secured' },
      { emoji: '✅', count: 1, label: 'approved' },
    ],
  },
  {
    name: 'database-reviewer',
    detail: 'agent',
    icon: <HermesAgent size={22} />,
    text: 'Migration is clean. Rollback note is attached to the thread.',
    reply: true,
    reactions: [{ emoji: '🧠', count: 1, label: 'noted' }],
  },
  {
    name: 'Khaliq',
    detail: 'human',
    image: khaliq.image,
    text: 'Reviewing the auth diff now. Keep rollout notes here.',
    reply: true,
    reactions: [{ emoji: '👍', count: 1, label: 'acknowledged' }],
  },
  {
    name: 'Release Manager',
    detail: 'agent',
    icon: <Codex.Color size={22} />,
    text: 'Patch, tests, and rollout checklist are bundled.',
    reply: true,
    reactions: [
      { emoji: '✅', count: 1, label: 'done' },
      { emoji: '👀', count: 1, label: 'watched' },
    ],
    live: true,
  },
  {
    name: 'ci-runner',
    detail: 'agent',
    icon: <Github size={22} />,
    text: 'Regression suite is green. Release branch is ready.',
    reply: true,
    reactions: [{ emoji: '🚀', count: 1, label: 'ready' }],
  },
];

function RelayAvatar({
  image,
  icon,
  name,
}: {
  image?: string;
  icon?: ReactNode;
  name: string;
}) {
  return (
    <span className={`${s.homeRelayAvatar} ${image ? s.homeRelayPhotoAvatar : ''}`} aria-hidden="true">
      {image ? <img src={image} alt="" loading="eager" decoding="async" /> : icon ?? name.slice(0, 1)}
    </span>
  );
}

export function HomeHumanRelayVisual() {
  return (
    <aside className={s.homeRelayVisual} aria-label="Humans and agents coordinating in Relay">
      <div className={`${s.featurePreview} ${s.homeRelayFeaturePreview}`}>
        <div className={s.previewAccent} />
        <div className={s.homeRelayThreadCard}>
          <div className={s.homeRelayThreadHeader}>
            <span>
              <strong>#ship-it</strong>
              <small>release-review thread</small>
            </span>
            <strong>2 humans, 4 agents</strong>
          </div>

          <div className={s.homeRelayMessages}>
            {relayMessages.map((message) => (
              <div
                className={`${s.homeRelayMessage} ${message.reply ? s.homeRelayReply : ''} ${
                  message.live ? s.homeRelayMessageLive : ''
                }`}
                key={`${message.name}-${message.text}`}
              >
                <RelayAvatar image={message.image} icon={message.icon} name={message.name} />
                <span className={s.homeRelayMessageBody}>
                  <span className={s.homeRelayMessageMeta}>
                    <strong>{message.name}</strong>
                    <small>{message.detail}</small>
                  </span>
                  <span className={s.homeRelayMessageText}>{message.text}</span>
                  {message.reactions && (
                    <span className={s.homeRelayReactions}>
                      {message.reactions.map((reaction) => (
                        <span className={s.homeRelayReaction} key={`${message.name}-${reaction.label}`}>
                          <span aria-hidden="true">{reaction.emoji}</span>
                          <strong>{reaction.count}</strong>
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className={s.homeRelayComposer}>
            <span>Syncing next reply...</span>
            <i aria-hidden="true" />
          </div>
        </div>
      </div>
    </aside>
  );
}
