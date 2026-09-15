import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { teamsConnectHref } from '../../../../lib/teams-onboarding';

export const metadata: Metadata = {
  title: 'Sign in to Agent Relay Teams',
  description: 'Continue to your team’s dashboard in Agent Relay Cloud.',
  robots: { index: false, follow: true },
};

export default async function TeamsOnboardingPage({ params, searchParams }: {
  params: Promise<{ stage?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { stage } = await params;
  // Old setup links remain usable, but the marketing site has no authenticated
  // onboarding screens. Cloud owns sign-in and the dashboard destination.
  if (stage?.length && (stage.length !== 1 || !['account', 'install', 'sessions'].includes(stage[0]))) notFound();
  redirect(teamsConnectHref(await searchParams));
}
