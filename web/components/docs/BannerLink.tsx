import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Bot, Compass, PlayCircle, Rocket } from 'lucide-react';

import styles from './docs.module.css';

function isInternalHref(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}

type BannerIcon = 'play' | 'rocket' | 'docs' | 'bot' | 'compass';

interface BannerLinkProps {
  href: string;
  children: ReactNode;
  icon?: BannerIcon;
}

const iconMap = {
  play: PlayCircle,
  rocket: Rocket,
  docs: BookOpen,
  bot: Bot,
  compass: Compass,
} satisfies Record<BannerIcon, typeof PlayCircle>;

export function BannerLink({ href, children, icon = 'docs' }: BannerLinkProps) {
  const Icon = iconMap[icon];

  const inner = (
    <>
      <span className={styles.bannerLinkIconWrap}>
        <Icon className={styles.bannerLinkIcon} aria-hidden="true" />
      </span>
      <span className={styles.bannerLinkText}>{children}</span>
      <ArrowRight className={styles.bannerLinkArrow} aria-hidden="true" />
    </>
  );

  if (isInternalHref(href)) {
    return (
      <Link href={href} className={styles.bannerLink}>
        {inner}
      </Link>
    );
  }

  return (
    <a href={href} className={styles.bannerLink}>
      {inner}
    </a>
  );
}
