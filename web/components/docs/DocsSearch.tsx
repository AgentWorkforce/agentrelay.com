'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import type { SearchEntry } from '../../lib/docs';
import s from './docs-search.module.css';

export interface ProductSearchScope {
  id: string;
  label: string;
  basePath: string;
  index: SearchEntry[];
}

interface DocsSearchProps {
  index: SearchEntry[];
  productScopes?: ProductSearchScope[];
}

function search(query: string, index: SearchEntry[]): SearchEntry[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);

  return index
    .map((entry) => {
      const haystack =
        `${entry.title} ${entry.description} ${entry.headings.join(' ')} ${entry.body}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (entry.title.toLowerCase().includes(term)) score += 10;
        if (entry.description.toLowerCase().includes(term)) score += 5;
        if (entry.headings.some((h) => h.toLowerCase().includes(term))) score += 3;
        if (haystack.includes(term)) score += 1;
      }
      return { entry, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((r) => r.entry);
}

export function DocsSearch({ index, productScopes = [] }: DocsSearchProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropPressRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  const activeScope = productScopes.find(
    (scope) => pathname === scope.basePath || pathname?.startsWith(`${scope.basePath}/`)
  );
  const activeIndex = activeScope?.index ?? index;
  const basePath = activeScope?.basePath ?? '/docs';
  const results = search(query, activeIndex);

  // The query resets on open, so the closing dialog keeps its content while it fades out.
  const openSearch = useCallback(() => {
    setQuery('');
    setActiveIdx(0);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const navigate = useCallback(
    (slug: string) => {
      close();
      router.push(`${basePath}/${slug}`);
    },
    [basePath, close, router]
  );

  // The dialog renders into document.body, which only exists after mount.
  useEffect(() => setMounted(true), []);

  // Native modal: top layer, inert page, focus trap, Esc to close, and focus
  // returns to the element that opened it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, mounted]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (dialogRef.current?.open) close();
        else openSearch();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close, openSearch]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((prev) => (prev + 1) % Math.max(results.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((prev) => (prev - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === 'Enter' && results[activeIdx]) {
      e.preventDefault();
      navigate(results[activeIdx].slug);
    }
  }

  return (
    <>
      <button type="button" className={s.trigger} onClick={openSearch} aria-haspopup="dialog">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className={s.triggerText}>Search docs...</span>
        <kbd className={s.triggerKbd}>&#8984;K</kbd>
      </button>

      {mounted &&
        createPortal(
          <dialog
            ref={dialogRef}
            className={s.dialog}
            aria-label="Search documentation"
            onClose={close}
            // The dialog element itself is only hit through its ::backdrop; the panel fills the box.
            onPointerDown={(e) => {
              backdropPressRef.current = e.target === e.currentTarget;
            }}
            onClick={(e) => {
              if (backdropPressRef.current && e.target === e.currentTarget) close();
            }}
          >
            <div className={s.panel} onKeyDown={handleKeyDown}>
              <div className={s.inputRow}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={inputRef}
                  className={s.input}
                  placeholder={activeScope ? `Search ${activeScope.label} docs...` : 'Search documentation...'}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <kbd className={s.escKbd} onClick={close}>
                  Esc
                </kbd>
              </div>

              {query.trim() && (
                <div className={s.results}>
                  {results.length === 0 ? (
                    <p className={s.empty}>No results for &ldquo;{query}&rdquo;</p>
                  ) : (
                    results.map((entry, i) => (
                      <Link
                        key={entry.slug}
                        href={`${basePath}/${entry.slug}`}
                        className={`${s.result} ${i === activeIdx ? s.resultActive : ''}`}
                        onClick={() => close()}
                        onMouseEnter={() => setActiveIdx(i)}
                      >
                        <span className={s.resultTitle}>{entry.title}</span>
                        {entry.description && <span className={s.resultDesc}>{entry.description}</span>}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          </dialog>,
          document.body
        )}
    </>
  );
}
