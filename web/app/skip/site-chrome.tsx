import Image from 'next/image';
import { FooterPortrait } from './footer-portrait';
import { WaitlistButton } from './waitlist';

export function SiteHeader() {
  return (
    <header className="site-nav">
      <a className="brand" href="/skip" aria-label="Skip home">
        <span className="brand-avatar" aria-hidden="true">
          <Image className="brand-avatar-default" src="/skip-assets/skip-avatar.png" alt="" width={34} height={34} priority />
          <Image className="brand-avatar-hover" src="/skip-assets/skip-avatar-hover.png" alt="" width={34} height={34} />
        </span>
        <span>skip</span>
      </a>
      <WaitlistButton className="nav-cta">Join waitlist</WaitlistButton>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer" id="footer">
      <div className="footer-poster">
        <div className="footer-copy">
          <h2>Skip the chaos.</h2>
          <p>Bring in the engineering manager for your coding agents and everyone will be happier.</p>
          <WaitlistButton className="footer-cta">Join waitlist</WaitlistButton>
        </div>

        <FooterPortrait />
      </div>

      <div className="footer-wordmark" aria-hidden="true">skip</div>

      <div className="footer-utility">
        <a className="footer-brand" href="/skip" aria-label="Skip home">skip</a>
        <nav aria-label="Footer navigation">
          <a href="https://heyskip.dev/for-teams">For teams</a>
          <a href="https://heyskip.dev/pricing">Pricing</a>
          <a href="https://heyskip.dev/download">Download</a>
        </nav>
        <p>Built by <a href="https://agentrelay.com">Agent Relay</a>. © {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
