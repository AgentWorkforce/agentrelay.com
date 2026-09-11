'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import type { TocItem } from '../../lib/docs';
import { getProductSectionForPath } from '../../lib/product-docs-nav';
import { useDocsLanguage } from './DocsLanguageContext';
import { DocsVersionSelect } from './DocsVersionSelect';
import styles from './docs.module.css';

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState('');
  const { language, setLanguage } = useDocsLanguage();
  const pathname = usePathname() ?? '/docs';
  const productSection = getProductSectionForPath(pathname);
  const secondaryLanguage = productSection?.id === 'relayflows' ? 'yaml' : 'python';
  const secondaryLanguageLabel = secondaryLanguage === 'yaml' ? 'YAML' : 'Python';

  // The select can only show 'typescript' or this section's secondaryLanguage.
  // A stored preference from a different section (e.g. 'python' while viewing
  // a relayflows page) falls back to displaying 'typescript' without this
  // effect, but the underlying language state stays unchanged — so the
  // dropdown and the actual CodeGroup selection drift apart, and reselecting
  // the already-displayed option produces no onChange to correct it. Write
  // the fallback back to real state so display and state always agree.
  useEffect(() => {
    if (language !== 'typescript' && language !== secondaryLanguage) {
      setLanguage('typescript');
    }
  }, [language, secondaryLanguage, setLanguage]);

  useEffect(() => {
    const headings = items.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[];

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    for (const el of headings) observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  return (
    <div className={styles.toc}>
      <div className={styles.tocControl}>
        <span className={styles.tocTitle}>Language</span>
        <label className={styles.tocSelectWrap}>
          <select
            className={styles.tocSelect}
            aria-label="Select docs language"
            value={language === secondaryLanguage ? secondaryLanguage : 'typescript'}
            onChange={(event) => setLanguage(event.target.value as 'typescript' | 'python' | 'yaml')}
          >
            <option value="typescript">TypeScript</option>
            <option value={secondaryLanguage}>{secondaryLanguageLabel}</option>
          </select>
        </label>
      </div>
      {!productSection && <DocsVersionSelect />}
      {productSection?.version && (
        <div className={styles.versionControl}>
          <span className={styles.versionLabel}>Version</span>
          <span className={styles.versionStatic}>v{productSection.version}</span>
        </div>
      )}

      {items.length > 0 && (
        <nav className={styles.tocNav} aria-label="On this page">
          <h4 className={styles.tocTitle}>On this page</h4>
          <ul className={styles.tocList}>
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`${styles.tocLink} ${item.level === 3 ? styles.tocIndent : ''} ${activeId === item.id ? styles.tocActive : ''}`}
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
