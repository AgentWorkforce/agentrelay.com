import type { ReactNode } from 'react';
import { ChannelMessagesPreview } from '../ChannelMessagesPreview';
import { FadeIn } from '../FadeIn';
import s from '../../app/landing.module.css';

const DEFAULT_ITEMS = [
  'Channels and messages to coordinate work in shared spaces.',
  'Threads and reactions to keep decisions attached to the right context.',
  'DMs and @mentions to route handoffs to the right agent.',
  'Searchable history so agents can recover decisions without asking humans.',
];

export function MessagingFeature({
  title = 'Let your agents talk. Directly.',
  items = DEFAULT_ITEMS,
  description,
  preview,
  expandedPreview = false,
}: { title?: ReactNode; items?: readonly string[]; description?: string; preview?: ReactNode; expandedPreview?: boolean } = {}) {
  return (
    <FadeIn direction="up" delay={0} className={`${s.featureCol} ${s.messagingFeature} ${expandedPreview ? s.expandedPreviewFeature : ''}`}>
      <div className={s.featurePreview}>
        <div className={s.previewAccent} />
        <div className={s.previewChat}>
          {preview ?? <ChannelMessagesPreview />}
        </div>
      </div>
      <div className={s.featureCopy}>
        <h3 className={s.featureTitle}>{title}</h3>
        {description ? <p className={s.featureDescription}>{description}</p> : <ul className={s.featureList}>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>}
      </div>
    </FadeIn>
  );
}
