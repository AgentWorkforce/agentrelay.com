import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import {
  AGENT_TOOL_LABELS,
  AGENT_TOOLS,
  AgentToolLogo,
} from '../../components/AgentToolLogos';
import { Cursor, Grok, MuseColor } from '../../components/brand-icons';
import { LogoIcon, LogoWordmark } from '../../components/SiteNav';
import { authErrorMessage, googleSignInHref } from '../../lib/login';
import { GoogleSignInButton } from './google-sign-in-button';
import { RelayField } from './relay-field';
import s from './login.module.css';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

type LoginProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const WORKS_WITH = [
  ...AGENT_TOOLS.map((tool) => ({
    key: tool,
    label: AGENT_TOOL_LABELS[tool],
    logo: (
      <AgentToolLogo
        provider={tool}
        className={s.worksWithLogo}
        idPrefix={`login-works-${tool}`}
      />
    ),
  })),
  { key: 'cursor', label: 'Cursor', logo: <Cursor className={s.worksWithLogo} /> },
  { key: 'grok', label: 'Grok', logo: <Grok className={s.worksWithLogo} /> },
  { key: 'muse', label: 'Muse', logo: <MuseColor className={s.worksWithLogo} /> },
];

export default async function LoginPage({ searchParams }: LoginProps) {
  const params = await searchParams;
  const invite = (
    first(params.invite_token) ??
    first(params.inviteToken) ??
    first(params.invite)
  )?.trim();
  const error = authErrorMessage(first(params.authError));

  return (
    <div className={s.page}>
      <div className={s.showcase}>
        <RelayField />
      </div>

      <main className={s.formSide} aria-labelledby="login-title">
        <div className={s.form}>
          <h1 id="login-title" className={s.title}>
            <LogoIcon />
            <LogoWordmark />
            <span className="sr-only">Sign in to Agent Relay</span>
          </h1>

          {invite && !error && (
            <p className={s.notice}>
              You’ve been invited to a workspace. Sign in to accept.
            </p>
          )}
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}

          <GoogleSignInButton
            href={googleSignInHref({ next: first(params.next), invite })}
          />

          <div className={s.worksWith}>
            <p>Works with all your agents</p>
            <ul>
              {WORKS_WITH.map(({ key, label, logo }) => (
                <li key={key} title={label}>
                  {logo}
                  <span className="sr-only">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className={s.legal}>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/" className={s.learnMore}>
            New to Agent Relay? <span>Learn more</span>
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </footer>
      </main>
    </div>
  );
}
