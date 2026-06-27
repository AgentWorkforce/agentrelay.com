'use client';

import type { ComponentType } from 'react';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BookOpen,
  Bot,
  ChevronDown,
  Cloud,
  Clock3,
  Compass,
  FolderOpen,
  Hash,
  Mail,
  Network,
  Plug,
  PlayCircle,
  Power,
  Rocket,
  Send,
  Shield,
  Smile,
  Terminal,
  Users,
  Zap,
} from 'lucide-react';
import { BsChatRightText } from 'react-icons/bs';
import { FaReact } from 'react-icons/fa';
import { GrSwift } from 'react-icons/gr';
import { PiBroadcastFill, PiLockKeyDuotone } from 'react-icons/pi';
import { RiLayout5Line } from 'react-icons/ri';
import { SiClaude, SiPython, SiTypescript } from 'react-icons/si';

import { docsNav, legacyDocsNav } from '../../lib/docs-nav';
import { getDocsVersionForPath, legacyDocsBasePath, v8DocsBasePath } from '../../lib/docs-versions';
import { getProductSectionForPath, productBasePath, productSections } from '../../lib/product-docs-nav';
import { DocsVersionSelect } from './DocsVersionSelect';
import { FolderOpen as FolderOpenIcon, Repeat } from 'lucide-react';
import styles from './docs.module.css';

type NavIcon = ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;

const productSectionIcons: Record<string, NavIcon> = {
  agents: Bot,
  file: FolderOpenIcon,
  loop: Repeat,
};

const docsProductOptions = [
  {
    id: null,
    label: 'Relay',
    tagline: 'Messaging and orchestration for AI agents.',
    href: '/docs/introduction',
    Icon: Network,
    version: undefined,
  },
  ...productSections.map((section) => ({
    id: section.id,
    label: section.label,
    tagline: section.tagline,
    href: `${productBasePath(section)}/introduction`,
    Icon: productSectionIcons[section.id] ?? BookOpen,
    version: section.version,
  })),
];

const productNavIcons: Record<string, NavIcon> = {
  introduction: Compass,
  quickstart: Rocket,
  install: Rocket,
  'why-files': BookOpen,
  'mount-layout': FolderOpen,
  'reads-and-writes': Send,
  acls: Shield,
  'realtime-sync': Activity,
  'run-locally': Terminal,
  'local-development': Terminal,
  mounting: FolderOpen,
  sdk: SiTypescript,
  'python-sdk': SiPython,
  agents: Bot,
  patterns: Network,
  build: Bot,
  deploy: Rocket,
  'adapters-and-providers': Plug,
  comparison: BookOpen,
  cloud: Cloud,
  'api-reference': Network,
  cli: Terminal,
  sync: Activity,
  search: Compass,
  sessions: BsChatRightText,
  sources: Network,
  stats: Zap,
  'cloud-architecture': Network,
  privacy: PiLockKeyDuotone,
  teams: Users,
};

const navIcons: Record<string, NavIcon> = {
  introduction: Compass,
  quickstart: Rocket,
  workspaces: Users,
  messaging: Mail,
  delivery: Network,
  actions: Zap,
  webhooks: Plug,
  'spawning-an-agent': Bot,
  'sending-messages': Send,
  'event-handlers': Activity,
  channels: Hash,
  dms: Mail,
  threads: BsChatRightText,
  'emoji-reactions': Smile,
  'file-sharing': FolderOpen,
  authentication: Shield,
  permissions: PiLockKeyDuotone,
  scheduling: Clock3,
  cloud: Cloud,
  workforce: Users,
  'proactive-agents': Zap,
  harnesses: Bot,
  'session-capabilities': Shield,
  runtime: Power,
  'agent-relay-mcp': Plug,
  'relay-dashboard': RiLayout5Line,
  observer: PiBroadcastFill,
  'cli-overview': Terminal,
  'cli-broker-lifecycle': Power,
  'cli-agent-management': Bot,
  'cli-messaging': Send,
  'cli-cloud-commands': Cloud,
  'cli-on-the-relay': Plug,
  'reference-cli': BookOpen,
  'reference-broker-api': Network,
  'typescript-sdk': SiTypescript,
  'python-sdk': SiPython,
  'react-sdk': FaReact,
  'swift-sdk': GrSwift,
  'plugin-claude-code': SiClaude,
  'typescript-examples': PlayCircle,
  migration: BookOpen,
};

export function DocsNav({ variant = 'sidebar' }: { variant?: 'sidebar' | 'mobileMenu' } = {}) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);
  const isSidebar = variant === 'sidebar';
  const productSection = getProductSectionForPath(pathname ?? '/docs');
  const docsVersion = getDocsVersionForPath(pathname ?? '/docs');
  const navGroups = productSection
    ? productSection.nav
    : docsVersion === 'v7.1.1'
      ? legacyDocsNav
      : docsNav;
  const docsBasePath = productSection
    ? productBasePath(productSection)
    : docsVersion === 'v8'
      ? v8DocsBasePath
      : legacyDocsBasePath;

  useEffect(() => {
    if (!isSidebar) return;

    const nav = navRef.current;
    const container = nav?.parentElement;
    const docsBody = container?.parentElement;

    if (!nav || !container || !docsBody) return;

    const restingTop = docsBody.getBoundingClientRect().top;

    const syncWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;

      const target = event.target;
      if (target instanceof Node && container.contains(target)) {
        return;
      }

      const scrollMax = container.scrollHeight - container.clientHeight;
      if (scrollMax <= 0) return;

      const docsBodyRect = docsBody.getBoundingClientRect();
      const atBoundary =
        event.deltaY > 0 ? docsBodyRect.bottom <= window.innerHeight + 1 : docsBodyRect.top >= restingTop - 1;

      if (!atBoundary) return;

      const nextScrollTop = Math.max(0, Math.min(scrollMax, container.scrollTop + event.deltaY));
      if (Math.abs(nextScrollTop - container.scrollTop) < 0.5) return;

      container.scrollTop = nextScrollTop;
    };

    window.addEventListener('wheel', syncWheel, { passive: true });

    return () => {
      window.removeEventListener('wheel', syncWheel);
    };
  }, [isSidebar]);

  return (
    <nav
      ref={navRef}
      className={`${styles.sidebar} ${!isSidebar ? styles.mobileSidebar : ''}`}
      aria-label="Documentation"
    >
      {!isSidebar && !productSection && <DocsVersionSelect />}
      {(productSection || docsVersion === 'v8') && <DocsProductSwitcher activeId={productSection?.id ?? null} />}
      {navGroups.map((group) => (
        <div key={group.title} className={styles.navGroup}>
          <h4 className={styles.navGroupTitle}>{group.title}</h4>
          <ul className={styles.navList}>
            {group.items.map((item) => {
              const href = `${docsBasePath}/${item.slug}`;
              const isActive =
                pathname === href ||
                (item.slug === 'introduction' &&
                  (productSection
                    ? pathname === docsBasePath
                    : pathname === '/docs' ||
                      pathname === legacyDocsBasePath ||
                      pathname === v8DocsBasePath));
              const Icon = productSection
                ? (productNavIcons[item.slug] ?? BookOpen)
                : (navIcons[item.slug] ?? BookOpen);
              return (
                <li key={item.slug}>
                  <Link href={href} className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
                    {Icon && <Icon className={styles.navIcon} aria-hidden="true" />}
                    <span className={styles.navLabel}>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function DocsProductSwitcher({ activeId }: { activeId: string | null }) {
  const activeProduct =
    docsProductOptions.find((option) => option.id === activeId) ?? docsProductOptions[0];
  const ActiveIcon = activeProduct.Icon;

  return (
    <div className={styles.productHeader}>
      <details className={styles.productSwitcher}>
        <summary className={styles.productSwitcherSummary}>
          <span className={styles.productSwitcherCurrent}>
            <ActiveIcon className={styles.productHeaderIcon} aria-hidden="true" />
            <span className={styles.productSwitcherText}>
              <span className={styles.productSwitcherLabel}>{activeProduct.label}</span>
              <span className={styles.productHeaderTagline}>{activeProduct.tagline}</span>
            </span>
          </span>
          <span className={styles.productSwitcherMeta}>
            {activeProduct.version && (
              <span className={styles.productHeaderVersion}>v{activeProduct.version}</span>
            )}
            <ChevronDown className={styles.productSwitcherChevron} aria-hidden="true" />
          </span>
        </summary>
        <div className={styles.productSwitcherMenu}>
          {docsProductOptions.map((option) => {
            const OptionIcon = option.Icon;
            const isActive = option.id === activeId;
            return (
              <Link
                key={option.id ?? 'relay'}
                href={option.href}
                className={`${styles.productSwitcherOption} ${
                  isActive ? styles.productSwitcherOptionActive : ''
                }`}
              >
                <OptionIcon className={styles.productSwitcherOptionIcon} aria-hidden="true" />
                <span className={styles.productSwitcherOptionText}>
                  <span>{option.label}</span>
                  <span>{option.tagline}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </details>
    </div>
  );
}
