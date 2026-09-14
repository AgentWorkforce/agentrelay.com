'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
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

function IntegrationRow({ row }: { row: typeof integrations }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(2);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const window = track?.parentElement;
    const group = track?.firstElementChild;
    if (!track || !window || !group) return;

    const resize = () => {
      const groupWidth = group.getBoundingClientRect().width;
      if (groupWidth > 0) {
        setCopies(Math.max(2, Math.ceil(window.clientWidth / groupWidth) + 1));
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(window);
    observer.observe(group);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={trackRef} className={s.integrationTrack}
      style={{ '--integration-copies': copies } as CSSProperties}>
      {Array.from({ length: copies }, (_, copy) => (
        <ul key={copy} className={s.integrationGroup} aria-hidden={copy > 0 || undefined}>
          {row.map(({ name, logo }) => (
            <li key={name} className={s.integrationLogo}>
              {logo}
              <span>{name}</span>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

export function IntegrationMarquee() {
  return (
    <div className={s.integrationsMarquee}>
      <div className={s.integrationWindow}>
        {[integrations.slice(0, 9), integrations.slice(9)].map((row, index) => (
          <IntegrationRow key={index} row={row} />
        ))}
      </div>
    </div>
  );
}
