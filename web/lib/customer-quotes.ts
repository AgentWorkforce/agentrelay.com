/**
 * Customer quotes shown on the homepage and rendered as shareable images by
 * `scripts/generate-customer-quote.mjs`. A quote is split into segments so the
 * headline sentence and the key claim can be emphasised in both places.
 */
export type QuoteSegment = {
  text: string;
  /** `lead` is the bold opening line, `key` the brighter claim, `plain` the rest. */
  tone: 'lead' | 'key' | 'plain';
};

export type CustomerQuote = {
  name: string;
  title: string;
  company: string;
  /** Public paths under `web/public`. */
  avatar: string;
  companyLogo: string;
  /** Shareable rendered card, linkable at agentrelay.com<image>. */
  image: string;
  segments: QuoteSegment[];
};

export const POMERADO_QUOTE: CustomerQuote = {
  name: 'Akshay Manglik',
  title: 'Founder',
  company: 'Pomerado',
  avatar: '/img/customers/akshay-manglik.png',
  companyLogo: '/img/customers/pomerado.png',
  image: '/img/customer-quote-pomerado.png',
  segments: [
    { tone: 'lead', text: 'It’s truly insane how fast our dev velocity has increased with Agent Relay!' },
    {
      tone: 'plain',
      text: 'Feels like once you hit a certain amount of agent usage, you hit a ceiling due to context switching limits —',
    },
    {
      tone: 'key',
      text: 'Agent Relay removes those barriers by allowing agents to self‑coordinate and resolve bottlenecks.',
    },
    { tone: 'plain', text: 'We’re super happy customers!' },
  ],
};

/** Quotes shown on the homepage, in order. The row fits up to three. */
export const CUSTOMER_QUOTES: CustomerQuote[] = [POMERADO_QUOTE];
