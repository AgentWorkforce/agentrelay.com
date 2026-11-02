import { CUSTOMER_QUOTES, type CustomerQuote, type QuoteSegment } from '../../lib/customer-quotes';
import { XIcon } from '../home/icons';
import s from './customer-quotes.module.css';

const toneClass: Record<QuoteSegment['tone'], string> = {
  lead: s.lead,
  key: s.key,
  plain: s.plain,
};

function QuoteCard({ quote }: { quote: CustomerQuote }) {
  return (
    <figure className={s.card}>
      <blockquote className={s.bubble} cite={quote.post?.href}>
        {quote.post ? (
          <a className={s.post} href={quote.post.href} target="_blank" rel="noopener noreferrer" aria-label={`View ${quote.name}’s post on X`}>
            <XIcon size={16} />
          </a>
        ) : null}
        {quote.post?.replyingTo ? <span className={s.context}>Replying to {quote.post.replyingTo}</span> : null}
        <p>
          {quote.segments.map(({ tone, text }, i) => (
            <span key={i} className={toneClass[tone]}>
              {i > 0 ? ' ' : null}
              {text}
            </span>
          ))}
        </p>
      </blockquote>
      <figcaption className={s.who}>
        <span className={`${s.avatar} ${quote.avatarPortrait ? s.portrait : ''}`}>
          <img src={quote.avatar} alt="" width={200} height={200} loading="lazy" />
        </span>
        <span>
          <span className={s.name}>{quote.name}</span>
          <span className={s.role}>
            {quote.title}
            {quote.company ? (
              <>
                ,{' '}
                {quote.companyLogo ? <img src={quote.companyLogo} alt="" width={16} height={16} loading="lazy" /> : null}
                {quote.company}
              </>
            ) : null}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

/** A compact row of customer quotes, each a small message bubble with the speaker under its tail. */
export function CustomerQuotes() {
  return (
    <section className={s.section} aria-label="What customers say about Agent Relay">
      <div className={s.row}>
        {CUSTOMER_QUOTES.map(quote => (
          <QuoteCard key={quote.name} quote={quote} />
        ))}
      </div>
    </section>
  );
}
