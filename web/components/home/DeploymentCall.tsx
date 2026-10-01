import { FlowFileAnimation } from './FlowFileAnimation';
import Image from 'next/image';
import { ArrowRight, Check } from 'lucide-react';
import { FadeIn } from '../FadeIn';
import s from '../../app/enterprise/enterprise.module.css';
import layout from './deployment-call.module.css';

type Contact = { name: string; role: string; image: string; href: string };

export function DeploymentCall({
  title = 'Become a design partner',
  example = 'flow',
  description = "We're actively looking for design partners who are tired of agents letting them down. You'll have direct access to our team and great discounts on all paid plans.",
  topics = [
    'Walk us through a flaky workflow your humans or agents handle',
    "We'll help you write your flows and deploy them",
    'Review hosted, private cloud, or self-managed options',
    'Leave with a clear path from discovery to production',
  ],
  contact = { name: 'Khaliq Gant', role: 'Founder and CTO', image: '/authors/khaliq-128.webp', href: '/khaliq' },
}: { title?: string; example?: 'flow' | 'agent'; contact?: Contact; description?: string; topics?: readonly string[] } = {}) {
  return (
        <section className={`${s.ctaSection} ${layout.section}`}>
          <FadeIn className={s.ctaInner}>
            <div className={s.ctaCopy}>
              <h2>{title}</h2>
              <p>{description}</p>

              <ul className={s.ctaChecklist} aria-label="Topics covered on the call">
                {topics.map((topic) => (
                  <li key={topic}>
                    <Check aria-hidden="true" />
                    {topic}
                  </li>
                ))}
              </ul>

              <div className={`${s.ctaOwner} ${layout.owner}`}>
                <Image alt={contact.name} height={56} src={contact.image} width={56} unoptimized />
                <div>
                  <strong>{contact.name}</strong>
                  <span>{contact.role}</span>
                </div>
                <a className={`${s.salesButton} ${layout.bookCall}`} href={contact.href}>Book Call<ArrowRight aria-hidden="true" /></a>
              </div>
            </div>

            <FlowFileAnimation variant={example} />
          </FadeIn>
        </section>
  );
}
