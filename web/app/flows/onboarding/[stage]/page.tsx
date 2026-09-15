import { notFound, redirect } from 'next/navigation';
import { ONBOARDING_STAGES } from '../../../../lib/flow-onboarding';

export { metadata } from '../page';

export default async function OnboardingStagePage({ params, searchParams }: { params: Promise<{ stage: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { stage } = await params;
  if (['reviewer', 'reviews', 'approval'].includes(stage)) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
    }
    redirect('/flows/onboarding/task' + (query.size ? '?' + query : ''));
  }
  if (!ONBOARDING_STAGES.some(value => value === stage)) notFound();
  return null;
}
