import Image from 'next/image';
import { DatabaseBackup } from 'lucide-react';
import { SiPostgresql, SiRedis, SiPosthog } from 'react-icons/si';
import s from './flows.module.css';

function brand(name: string, slug: string) {
  return { name, logo: <Image src={`/integration-logos/${slug}.svg`} alt="" width={36} height={36} /> };
}

const integrations = [
  brand('GitHub', 'github'),
  brand('Linear', 'linear'),
  brand('Slack', 'slack'),
  brand('Jira', 'jira'),
  brand('Notion', 'notion'),
  brand('Stripe', 'stripe'),
  brand('HubSpot', 'hubspot'),
  brand('Intercom', 'intercom'),
  { name: 'Postgres', logo: <SiPostgresql size={36} aria-hidden="true" /> },
  { name: 'Redis', logo: <SiRedis size={36} aria-hidden="true" /> },
  { name: 'S3', logo: <DatabaseBackup size={36} aria-hidden="true" /> },
  brand('Cloudflare', 'cloudflare'),
  brand('Sendgrid', 'sendgrid'),
  brand('Mailgun', 'mailgun'),
  brand('Gmail', 'gmail'),
  brand('Google Calendar', 'google-calendar'),
  brand('Segment', 'segment'),
  { name: 'PostHog', logo: <SiPosthog size={36} aria-hidden="true" /> },
];

export function IntegrationMarquee() {
  return (
    <div className={s.integrationsMarquee}>
      <div className={s.integrationWindow}>
        {[integrations.slice(0, 9), integrations.slice(9)].map((row, index) => (
          <div key={index} className={s.integrationTrack}>
            {[false, true].map((duplicate) => (
              <ul key={String(duplicate)} className={s.integrationGroup} aria-hidden={duplicate || undefined}>
                {row.map(({ name, logo }) => (
                  <li key={name} className={s.integrationLogo}>
                    {logo}
                    <span>{name}</span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
