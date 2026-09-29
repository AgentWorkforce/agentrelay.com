import type { Metadata } from 'next';
import Link from 'next/link';

import styles from '../../components/blog/blog.module.css';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { getAllCaseStudies } from '../../lib/case-studies';
import { getAuthorInitials, getBlogAuthor } from '../../lib/blog-authors';
import { defaultOgImage } from '../../lib/og-meta';
import { absoluteUrl, SITE_NAME, SITE_URL } from '../../lib/site';
import landingStyles from '../landing.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Agent Relay Case Studies — How Teams Run Their Agents' },
  description:
    'How real teams put their coding agents to work on Agent Relay — the workflows they run, what changed, and the results in their own words.',
  alternates: {
    canonical: absoluteUrl('/case-studies'),
  },
  openGraph: {
    siteName: SITE_NAME,
    title: `${SITE_NAME} Case Studies`,
    description: 'How real teams put their coding agents to work on Agent Relay.',
    url: absoluteUrl('/case-studies'),
    type: 'website',
    images: [defaultOgImage()],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} Case Studies`,
    description: 'How real teams put their coding agents to work on Agent Relay.',
    images: [defaultOgImage().url],
  },
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function CaseStudiesIndexPage() {
  const studies = getAllCaseStudies();
  const navGetStartedLink = (
    <Link href="/docs" className={`${landingStyles.ctaPrimary} ${landingStyles.homeNavAction}`}>
      Get Started
    </Link>
  );
  const mobileGetStartedLink = (
    <Link href="/docs" className={`${landingStyles.ctaPrimary} ${landingStyles.homeNavAction}`}>
      Get Started
    </Link>
  );
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${SITE_NAME} Case Studies`,
    url: absoluteUrl('/case-studies'),
    description: 'How real teams put their coding agents to work on Agent Relay.',
    isPartOf: SITE_URL,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: studies.map((study, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: study.frontmatter.title,
        url: absoluteUrl(`/case-studies/${study.slug}`),
      })),
    },
  };

  return (
    <div className={styles.blogPage}>
      <SiteNav actions={navGetStartedLink} mobileMenuContent={mobileGetStartedLink} hideLinks />

      <main className={styles.blogMain}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        <section className={styles.blogHero}>
          <div className={styles.blogHeroInner}>
            <h1 className={styles.blogTitle}>Teams putting their agents to work</h1>
            <p className={styles.blogSubtitle}>
              How real teams run their coding agents on Agent Relay — the workflows they built, what changed,
              and the results in their own words.
            </p>
          </div>
        </section>
        <div className={styles.blogWaveDivider} aria-hidden="true">
          <svg viewBox="0 0 1200 80" fill="none" preserveAspectRatio="none">
            <path d="M0 0H1200V18C986 58 826 24 624 46C404 70 228 34 0 60V0Z" />
            <path d="M-80 34C170 58 372 54 612 40C858 26 1018 20 1280 42" />
            <path d="M-80 48C184 70 384 66 632 52C878 38 1036 34 1280 56" />
          </svg>
        </div>

        {studies.length > 0 ? (
          <section
            className={`${styles.blogSection} ${styles.archiveSection}`}
            aria-labelledby="all-case-studies-heading"
          >
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleRow}>
                <h2 id="all-case-studies-heading" className={styles.sectionTitle}>
                  All case studies
                </h2>
              </div>
            </div>

            <div className={styles.postList} role="list">
              {studies.map((study) => {
                const studyAuthor = getBlogAuthor(study.frontmatter.author);

                return (
                  <article key={study.slug} className={styles.postListRow} role="listitem">
                    <Link
                      href={`/case-studies/${encodeURIComponent(study.slug)}`}
                      className={styles.postListRowLink}
                    >
                      <div className={styles.postListTopline}>
                        <h3 className={styles.postListTitle}>{study.frontmatter.title}</h3>
                        <span className={styles.postListMeta}>
                          <span
                            className={`${styles.postListAvatar} ${studyAuthor.image ? styles.authorAvatarPhoto : ''}`}
                            aria-hidden="true"
                          >
                            {studyAuthor.image ? (
                              <img src={studyAuthor.image} alt="" loading="lazy" />
                            ) : (
                              getAuthorInitials(studyAuthor.name)
                            )}
                          </span>
                          <span className={styles.postListMetaText}>
                            <span className={styles.postListAuthor}>{study.frontmatter.company}</span>
                            <span className={styles.postListTime}>
                              <time className={styles.postListDate} dateTime={study.frontmatter.date}>
                                {formatDate(study.frontmatter.date)}
                              </time>
                              <span className={styles.postListDot} aria-hidden="true">
                                &middot;
                              </span>
                              <span className={styles.postListRead}>{study.readTime}</span>
                            </span>
                          </span>
                        </span>
                      </div>
                      <p className={styles.postListDescription}>{study.frontmatter.description}</p>
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className={`${styles.blogSection} ${styles.archiveSection}`} aria-labelledby="case-studies-empty-heading">
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleRow}>
                <h2 id="case-studies-empty-heading" className={styles.sectionTitle}>
                  Case studies coming soon
                </h2>
              </div>
            </div>
            <div className={styles.postList}>
              <p className={styles.postListDescription}>
                We are writing up how teams run their coding agents on Agent Relay — agents that coordinate
                work across machines, hand tasks back and forth, and ship together. The first stories land
                here shortly. In the meantime, read the{' '}
                <Link href="/blog">blog</Link> or{' '}
                <Link href="/docs">get started with the docs</Link>.
              </p>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
