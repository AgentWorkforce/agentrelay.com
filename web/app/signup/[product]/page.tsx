import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isAgentSignupProduct } from '../../../lib/agent-signup';
import { AgentSignupJourney } from '../../../components/AgentSignupJourney';

export const metadata: Metadata = {
  title: 'Let your agent do it',
  description: 'Give your agent a prompt and watch it set up Agent Relay.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function AgentSignupPage({ params }: { params: Promise<{ product: string }> }) {
  const { product } = await params;
  if (!isAgentSignupProduct(product)) notFound();
  return <AgentSignupJourney product={product} />;
}
