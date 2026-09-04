import Image from 'next/image';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { CoordinationScene } from './coordination-scene';
import { HeroWorkScene } from './hero-work-scene';
import { OnboardingSequence } from './onboarding-sequence';
import { WaitlistButton, WaitlistProvider } from './waitlist';

function InvestorLogos({ decorative = false }: { decorative?: boolean }) {
  const alt = (name: string) => decorative ? '' : name;

  return (
    <div className="investor-group" aria-hidden={decorative || undefined}>
      <span className="investor-logo investor-logo-hustle">
        <Image src="/skip-assets/investors/hustle-fund.svg" alt={alt('Hustle Fund')} width={205} height={27} />
      </span>
      <span className="investor-logo investor-logo-active">
        <Image src="/skip-assets/investors/active-capital.svg" alt={alt('Active Capital')} width={185} height={30} />
      </span>
      <span className="investor-logo investor-logo-yc" aria-label={decorative ? undefined : 'Y Combinator'}>
        <span className="investor-yc-mark" aria-hidden="true">Y</span>
        <strong aria-hidden="true">Combinator</strong>
      </span>
      <span className="investor-logo investor-logo-cortical">
        <Image src="/skip-assets/investors/cortical-ventures.webp" alt={alt('Cortical Ventures')} width={220} height={32} />
      </span>
      <span className="investor-logo investor-logo-yonder" aria-label={decorative ? undefined : 'Yonder'}>
        <svg aria-hidden="true" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M4.5 18.5 10.6 9l3.5 5 3.1-4.3 6.3 8.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <strong aria-hidden="true">YONDER</strong>
      </span>
    </div>
  );
}

function InvestorMarquee() {
  return (
    <section className="investor-strip" aria-label="Skip investors">
      <div className="investor-strip-inner">
        <p>Backed by</p>
        <div className="investor-marquee">
          <div className="investor-track">
            <InvestorLogos />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const navAction = <WaitlistButton className="skip-nav-cta">Join waitlist</WaitlistButton>;
  const skipWordmark = (
    <span className="skip-nav-wordmark" aria-label="Skip">
      <Image className="skip-nav-avatar" src="/skip-assets/skip-avatar.png" alt="" width={30} height={30} priority />
      <span>skip</span>
    </span>
  );
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Skip',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'macOS',
    url: 'https://agentrelay.com/skip',
    description: 'Skip plans work, coordinates your coding agents, and brings you in only when your judgment is needed.',
    creator: { '@type': 'Organization', name: 'Agent Relay', url: 'https://agentrelay.com' },
  };

  return (
    <WaitlistProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />

      <SiteNav brandAddon={skipWordmark} actions={navAction} mobileMenuContent={navAction} hideDocsLink />

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">Give your coding agents a manager.</h1>
            <p>
              Skip keeps all your{' '}
              <span className="agent-name">
                <span className="agent-name-logo" aria-hidden="true">
                  <Image src="/skip-assets/claude.svg" alt="" width={24} height={24} />
                </span>
                Claude Code
              </span>
              ,{' '}
              <span className="agent-name">
                <span className="agent-name-logo agent-name-logo-codex" aria-hidden="true" />
                Codex
              </span>{' '}
              and{' '}
              <span className="agent-name">
                <span className="agent-name-logo" aria-hidden="true">
                  <Image src="/skip-assets/opencode.svg" alt="" width={24} height={24} />
                </span>
                OpenCode
              </span>{' '}
              sessions moving, coordinated and on track. You stay focused on what matters.
            </p>
            <div className="hero-actions">
              <WaitlistButton className="button button-primary">Join waitlist</WaitlistButton>
            </div>
          </div>
          <HeroWorkScene />
        </section>

        <InvestorMarquee />

        <section className="routing-section" id="how-it-works" aria-labelledby="routing-title">
          <div className="routing-layout">
            <div className="section-copy routing-copy">
              <h2 id="routing-title">Skip keeps sessions moving</h2>
              <p>Work with Skip to set the plan and keep every session moving toward the goal.</p>
            </div>
            <div className="routing-visual">
              <CoordinationScene />
            </div>
          </div>
        </section>

        <OnboardingSequence />
      </main>

      <SiteFooter hideRelayCloud />
    </WaitlistProvider>
  );
}
