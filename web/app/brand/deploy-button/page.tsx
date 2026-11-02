import type { Metadata } from 'next';

import { SiteFooter } from '../../../components/SiteFooter';
import { SiteNav } from '../../../components/SiteNav';
import { SiteNavActions } from '../../../components/SiteNavActions';
import { absoluteUrl } from '../../../lib/site';
import { DeployButtonShowcase } from './DeployButtonShowcase';

const title = 'Deploy Button';
const description =
  'Design variants for the "Deploy on Agent Relay" embed button. Review on light and dark stages and pick a direction.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: absoluteUrl('/brand/deploy-button'),
  },
};

export default function DeployButtonPage() {
  return (
    <>
      <SiteNav hideLinks singleAction actions={<SiteNavActions />} />
      <DeployButtonShowcase />
      <SiteFooter />
    </>
  );
}
