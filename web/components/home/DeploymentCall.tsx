import { FlowFileAnimation } from './FlowFileAnimation';
import Image from 'next/image';
import { ArrowRight, Check } from 'lucide-react';
import { FadeIn } from '../FadeIn';
import s from '../../app/enterprise/enterprise.module.css';
import layout from './deployment-call.module.css';

export function DeploymentCall() {
  return (
        <section className={`${s.ctaSection} ${layout.section}`}>
          <FadeIn className={s.ctaInner}>
            <div className={s.ctaCopy}>
              <h2>Become a design partner</h2>
              <p>
                We&apos;re actively looking for design partners who are tired of agents letting them down. You&apos;ll have direct access to our team and great discounts on all paid plans.
              </p>

              <ul className={s.ctaChecklist} aria-label="Topics covered on the call">
                <li>
                  <Check aria-hidden="true" />
                  Walk us through a flaky workflow your humans or agents handle
                </li>
                <li>
                  <Check aria-hidden="true" />
                  We&apos;ll help you write your flows and deploy them
                </li>
                <li>
                  <Check aria-hidden="true" />
                  Review hosted, private cloud, or self-managed options
                </li>
                <li>
                  <Check aria-hidden="true" />
                  Leave with a clear path from discovery to production
                </li>
              </ul>

              <div className={`${s.ctaOwner} ${layout.owner}`}>
                <Image alt="Khaliq Gant" height={56} src="/authors/khaliq.jpeg" width={56} />
                <div>
                  <strong>Khaliq Gant</strong>
                  <span>Founder and CTO</span>
                </div>
                <a className={`${s.salesButton} ${layout.bookCall}`} href="/khaliq">Book Call<ArrowRight aria-hidden="true" /></a>
              </div>
            </div>

            <FlowFileAnimation />
          </FadeIn>
        </section>
  );
}
