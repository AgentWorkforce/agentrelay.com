import { AgentToolLogo } from '../AgentToolLogos';
import { Grok } from '../brand-icons';
import type { TerminalStyle } from './HeroTerminalMarquee';
import s from '../../app/landing.module.css';

type PhoneAgent = 'dots' | 'grokbot' | 'muse';

export type PhoneCard = {
  kind: 'phone';
  agent: PhoneAgent;
  /** The named agent inside the app, as the app's header shows it. */
  bot: string;
  /** What the person asked from their phone. */
  ask: string;
  /** The agent's reply, then the relay hop that ties it to the band. */
  reply: string;
  relay: string;
};

export const PHONE_META: Record<PhoneAgent, { cycle: string; label: string }> = {
  dots: { cycle: '8.8s', label: 'ChatGPT' },
  grokbot: { cycle: '8.5s', label: 'GrokBot' },
  muse: { cycle: '9.1s', label: 'Muse' },
};

function MuseMark() {
  return (
    <svg className={s.heroPhoneMark} viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PhoneMark({ agent, idPrefix }: { agent: PhoneAgent; idPrefix: string }) {
  if (agent === 'grokbot') return <Grok className={s.heroPhoneMark} />;
  if (agent === 'muse') return <MuseMark />;
  return <AgentToolLogo className={s.heroPhoneMark} idPrefix={idPrefix} provider="codex" />;
}

function cycleLine(delay: string): TerminalStyle {
  return { '--line-delay': delay };
}

/**
 * A phone running one of the labs' personal agents (ChatGPT dots, GrokBot,
 * Muse). The person asks from their phone; the agent answers and hands the
 * work to the rest of the band over the relay.
 */
export function HeroPhone({
  card,
  idPrefix,
  style,
}: {
  card: PhoneCard;
  idPrefix: string;
  style?: TerminalStyle;
}) {
  const meta = PHONE_META[card.agent];

  return (
    <article className={s.heroPhone} data-phone={card.agent} style={style}>
      <div className={s.heroPhoneScreen}>
        <span className={s.heroPhoneStatus}>
          <span>9:41</span>
          <span className={s.heroPhoneIsland} />
          <span className={s.heroPhoneSignal} />
        </span>
        <span className={s.heroPhoneHeader}>
          <PhoneMark agent={card.agent} idPrefix={idPrefix} />
          <span className={s.heroPhoneTitle}>
            <b>{card.bot}</b>
            <span>{meta.label}</span>
          </span>
        </span>
        <span className={`${s.heroPhoneAsk} ${s.heroAppCycleLine}`} style={cycleLine('0s')}>
          {card.ask}
        </span>
        <span className={`${s.heroPhoneReply} ${s.heroAppCycleLine}`} style={cycleLine('0.5s')}>
          {card.reply}
        </span>
        <span className={`${s.heroPhoneRelay} ${s.heroAppCycleLine}`} style={cycleLine('1s')}>
          <span className={s.heroAppRelayDot} />
          {card.relay}
        </span>
        <span className={s.heroPhoneComposer}>
          <span>Message</span>
          <span className={s.heroPhoneSend}>↑</span>
        </span>
      </div>
    </article>
  );
}
