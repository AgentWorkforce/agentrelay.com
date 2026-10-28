import { POMERADO_QUOTE, type QuoteSegment } from '../../lib/customer-quotes';
import s from './customer-quote.module.css';

const toneClass: Record<QuoteSegment['tone'], string> = {
  lead: s.lead,
  key: s.key,
  plain: s.plain,
};

/** A customer's words in a message bubble, with their face and company under its tail. */
export function CustomerQuote() {
  const quote = POMERADO_QUOTE;
  return (
    <section className={s.section} aria-label={`What ${quote.name} says about Agent Relay`}>
      <figure className={s.figure}>
        <blockquote className={s.bubble}>
          <span className={s.mark} aria-hidden="true">
            “
          </span>
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
          <span className={s.avatar}>
            <img src={quote.avatar} alt="" width={200} height={200} loading="lazy" />
          </span>
          <span>
            <span className={s.name}>{quote.name}</span>
            <span className={s.role}>
              {quote.title},{' '}
              <img src={quote.companyLogo} alt="" width={24} height={24} loading="lazy" />
              {quote.company}
            </span>
          </span>
        </figcaption>
      </figure>
    </section>
  );
}
