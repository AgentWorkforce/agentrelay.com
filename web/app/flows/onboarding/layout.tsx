import type { ReactNode } from 'react';
import { FactoryBuilder } from './FactoryBuilder';

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <>{children}<FactoryBuilder /></>;
}
