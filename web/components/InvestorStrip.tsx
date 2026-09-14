import Image from 'next/image';
import s from './investor-strip.module.css';

export function InvestorStrip() {
  return (
    <section className={s.backers} aria-label="Agent Relay investors">
      <p>Backed by</p>
      <div className={s.investorGroup}>
        <Image className={s.investorHustle} src="/investors/hustle-fund.svg" alt="Hustle Fund" width={205} height={27} />
        <Image className={s.investorActive} src="/investors/active-capital.svg" alt="Active Capital" width={185} height={30} />
        <span className={s.investorYc} role="img" aria-label="Y Combinator">
          <span aria-hidden="true">Y</span><strong aria-hidden="true">Combinator</strong>
        </span>
        <Image className={s.investorCortical} src="/investors/cortical-ventures.webp" alt="Cortical Ventures" width={220} height={32} />
        <span className={s.investorYonder} role="img" aria-label="Yonder">
          <svg aria-hidden="true" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M4.5 18.5 10.6 9l3.5 5 3.1-4.3 6.3 8.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <strong aria-hidden="true">YONDER</strong>
        </span>
      </div>
    </section>
  );
}
