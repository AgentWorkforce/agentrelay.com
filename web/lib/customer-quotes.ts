/**
 * Customer quotes shown on the homepage and rendered as shareable images by
 * `scripts/generate-customer-quote.mjs`. A quote is split into segments so the
 * headline sentence and the key claim can be emphasised in both places.
 */
export type QuoteSegment = {
  text: string;
  /** `lead` is bold white, `key` a brighter claim, `accent` the brand-blue takeaway, `plain` the rest. */
  tone: 'lead' | 'key' | 'accent' | 'plain';
};

export type CustomerQuote = {
  name: string;
  /** Job title, or a social handle when the quote is a public post. */
  title: string;
  company?: string;
  /** Public paths under `web/public`. */
  avatar: string;
  /** The avatar is a half-length portrait and is cropped in on the face. */
  avatarPortrait?: boolean;
  companyLogo?: string;
  /** Shareable rendered card, linkable at agentrelay.com<image>. */
  image?: string;
  /** The public post the quote comes from. */
  post?: { href: string; replyingTo?: string };
  segments: QuoteSegment[];
};

export const POMERADO_QUOTE: CustomerQuote = {
  name: 'Akshay Manglik',
  title: 'Founder',
  company: 'Pomerado',
  avatar: '/img/customers/akshay-manglik.png',
  avatarPortrait: true,
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

export const SERG_POST: CustomerQuote = {
  name: 'Serg',
  title: '@sg_HGA',
  avatar: '/img/customers/serg.jpg',
  post: { href: 'https://x.com/sg_HGA/status/2116514305143123972', replyingTo: '@UltraLinx' },
  segments: [
    { tone: 'plain', text: '@agent_relay does this automatically' },
    { tone: 'lead', text: 'with no workarounds.' },
    { tone: 'accent', text: 'Highly recommend' },
  ],
};

/** Quotes shown on the homepage, in order. The row fits up to three. */
export const CUSTOMER_QUOTES: CustomerQuote[] = [POMERADO_QUOTE, SERG_POST];
