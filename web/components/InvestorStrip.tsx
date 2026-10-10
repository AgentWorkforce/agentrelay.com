import Image from 'next/image';
import s from './investor-strip.module.css';

// The strip sits in the hero, above the fold, so the logos load with the page
// instead of lazily after layout (which made them pop in late). They're small
// and already web-ready, so they skip the /_next/image round trip too.
const LOGO_IMAGE_PROPS = { loading: 'eager', unoptimized: true } as const;

export function InvestorStrip() {
  const logos = [
    <Image key="0" className={s.investorHustle} src="/investors/hustle-fund.svg" alt="Hustle Fund" {...LOGO_IMAGE_PROPS} width={205} height={27} />,
    <Image key="1" className={s.investorActive} src="/investors/active-capital.svg" alt="Active Capital" {...LOGO_IMAGE_PROPS} width={185} height={30} />,
    <span key="2" className={s.investorYc} role="img" aria-label="Y Combinator">
      <span aria-hidden="true">Y</span><strong aria-hidden="true">Combinator</strong>
    </span>,
    <Image key="3" className={s.investorCortical} src="/investors/cortical-ventures.webp" alt="Cortical Ventures" {...LOGO_IMAGE_PROPS} width={220} height={32} />,
    <span key="4" className={s.investorYonder} role="img" aria-label="Yonder">
      {/* Intrinsic size so the mark can't render page-wide (as a giant circle)
          if it paints before investor-strip.module.css has loaded. */}
      <svg aria-hidden="true" viewBox="0 0 28 28" width="25" height="25">
        <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M4.5 18.5 10.6 9l3.5 5 3.1-4.3 6.3 8.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <strong aria-hidden="true">YONDER</strong>
    </span>,
  ];

  return (
    <section className={s.backers} aria-label="Agent Relay investors">
      <p>Backed by</p>
      <div className={`${s.investorGroup} ${s.desktopInvestors}`}>{logos}</div>
      <div className={s.mobileInvestors} role="img" aria-label="Hustle Fund, Active Capital, Y Combinator, Cortical Ventures, and Yonder">
        {[2, 4, 1, 3, 0].map((start, index) => (
          <div
            key={start}
            className={`${s.investorGroup} ${s.investorPair}`}
            style={{ animationDelay: `${index * 5 - 25}s` }}
            aria-hidden="true"
          >
            {logos[start]}
            {logos[(start + 1) % logos.length]}
          </div>
        ))}
      </div>
    </section>
  );
}
