'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ExternalLink, Check } from 'lucide-react';
import { LogoIcon, LogoWordmark } from '../../../components/SiteNav';
import nav from '../../../components/site-nav.module.css';
import s from './onboarding-frame.module.css';

export function OnboardingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return <header className={`${nav.navBar} ${s.header} ${scrolled ? nav.navBarScrolled : ''}`}>
    <div className={s.headerInner}>
      <Link href="/" className={s.logo} aria-label="Agent Relay"><LogoIcon /><LogoWordmark /></Link>
      <a href="/khaliq" target="_blank" rel="noopener noreferrer" className={s.help} aria-label="Book Call (opens in a new tab)"><span>Book Call</span><ExternalLink size={16} aria-hidden="true" /></a>
    </div>
  </header>;
}

export function OnboardingIntro({ children }: { children?: ReactNode }) {
  return <div className={s.intro}>
    <h1>Build your flow</h1>
    <p>Choose your tools and how they work together. Your flow takes shape as you go.</p>
    {children}
  </div>;
}

const STAGES = ['Sources', 'Agents', 'Workflow', 'Run'];

export function BuildStages({ currentStep, onSelect }: { currentStep: number; onSelect: (step: number) => void }) {
  return <nav className={s.stages} aria-label="Build steps">
    {STAGES.map((label, index) => <button key={label} type="button"
      aria-current={index === currentStep ? 'step' : undefined}
      disabled={index > currentStep} onClick={() => onSelect(index)}>
      {index < currentStep && <Check size={13} aria-label="Completed" />}{label}
    </button>)}
  </nav>;
}
