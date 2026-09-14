import { notFound } from 'next/navigation';
import { ONBOARDING_STAGES } from '../../../../lib/flow-onboarding';

export { metadata } from '../page';

export default async function OnboardingStagePage({ params }: { params: Promise<{ stage: string }> }) {
  const { stage } = await params;
  if (!ONBOARDING_STAGES.some(value => value === stage)) notFound();
  return null;
}
