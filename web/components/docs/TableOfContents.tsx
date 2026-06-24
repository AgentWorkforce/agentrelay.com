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
            value={language}
            onChange={(event) => setLanguage(event.target.value as 'typescript' | 'python')}
          >
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
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
