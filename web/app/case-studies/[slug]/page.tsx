import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { evaluate } from '@mdx-js/mdx';
import { CalendarDays, Clock3 } from 'lucide-react';
import { Fragment, isValidElement, type HTMLAttributes, type ReactNode } from 'react';
import { FaGithub, FaLinkedinIn, FaXTwitter } from 'react-icons/fa6';
import { jsx, jsxs } from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';

import { BlogTableOfContents } from '../../../components/blog/BlogTableOfContents';
import styles from '../../../components/blog/blog.module.css';
import { HighlightedPre } from '../../../components/docs/HighlightedCode';
import { Waitlist } from '../../../components/home';
import { SiteFooter } from '../../../components/SiteFooter';
import { SiteNav } from '../../../components/SiteNav';
import { getAllCaseStudies, getCaseStudy, slugifyHeading } from '../../../lib/case-studies';
import { getAuthorInitials, getBlogAuthor } from '../../../lib/blog-authors';
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from '../../../lib/og-meta';
import { absoluteUrl, SITE_NAME, SITE_URL } from '../../../lib/site';
import landingStyles from '../../landing.module.css';

type PageProps = {
  params: Promise<{ slug: string }>;
};

function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((item) => extractText(item)).join('');
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children);
  }

  return '';
}

function HeadingWithId(level: 2 | 3) {
  return function Heading({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    const id = slugifyHeading(extractText(children));
    const Tag = `h${level}` as const;

    return (
      <Tag id={id} {...props}>
        {children}
      </Tag>
    );
  };
}

const mdxComponents = {
  pre: HighlightedPre,
  h2: HeadingWithId(2),
  h3: HeadingWithId(3),
};

// Prebuild the published case studies. Drafts (`published: false`) are omitted
// here but still resolve on demand via `getCaseStudy`, so a draft URL renders
// at its address for preview/review.
export async function generateStaticParams() {
  return getAllCaseStudies().map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) return { title: 'Not Found' };
  const studyUrl = absoluteUrl(`/case-studies/${slug}`);
  const usingGeneratedCard = !study.frontmatter.coverImage;
  const imageUrl = study.frontmatter.coverImage || absoluteUrl(`/case-studies/${slug}/og.png`);

  return {
    title: study.frontmatter.title,
    description: study.frontmatter.description,
    keywords: [study.frontmatter.category, study.frontmatter.company, ...study.frontmatter.tags],
    authors: [{ name: study.frontmatter.author }],
    alternates: {
      canonical: studyUrl,
    },
    openGraph: {
      siteName: SITE_NAME,
      title: study.frontmatter.title,
      description: study.frontmatter.description,
      url: studyUrl,
      type: 'article',
      publishedTime: study.frontmatter.date,
      modifiedTime: study.frontmatter.updatedAt ?? study.frontmatter.date,
      authors: [study.frontmatter.author],
      section: study.frontmatter.category,
      tags: study.frontmatter.tags,
      images: [
        {
          url: imageUrl,
          alt: study.frontmatter.coverImageAlt || `${study.frontmatter.title} social card`,
          ...(usingGeneratedCard
            ? { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, type: 'image/png' as const }
            : {}),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: study.frontmatter.title,
      description: study.frontmatter.description,
      images: [imageUrl],
    },
  };
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatFooterReadTime(readTime: string): string {
  return readTime.replace('min read', 'minute read');
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) notFound();

  const author = getBlogAuthor(study.frontmatter.author);
  const otherStudies = getAllCaseStudies()
    .filter((candidate) => candidate.slug !== study.slug)
    .slice(0, 4);
  const studyUrl = absoluteUrl(`/case-studies/${slug}`);
  const imageUrl = study.frontmatter.coverImage || absoluteUrl(`/case-studies/${slug}/og.png`);
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
    '@type': 'Article',
    headline: study.frontmatter.title,
    description: study.frontmatter.description,
    datePublished: study.frontmatter.date,
    dateModified: study.frontmatter.updatedAt ?? study.frontmatter.date,
    author: {
      '@type': 'Person',
      name: author.name,
      jobTitle: author.title,
      ...(author.image ? { image: absoluteUrl(author.image) } : {}),
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/favicon.svg'),
      },
    },
    image: [imageUrl],
    mainEntityOfPage: studyUrl,
    articleSection: study.frontmatter.category,
    keywords: study.frontmatter.tags.join(', '),
    about: {
      '@type': 'Organization',
      name: study.frontmatter.company,
    },
  };
  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Case Studies',
        item: absoluteUrl('/case-studies'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: study.frontmatter.title,
        item: studyUrl,
      },
    ],
  };

  const { default: MDXContent } = await evaluate(study.content, {
    Fragment,
    jsx,
    jsxs,
    remarkPlugins: [remarkGfm],
  } as Parameters<typeof evaluate>[1]);
  const authorInitials = getAuthorInitials(author.name);
  const renderAuthorPanel = (headingId: string) => (
    <section className={styles.authorPanel} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.sidebarTitle}>
        Written by
      </h2>
      <div className={styles.authorCard}>
        <span
          className={`${styles.authorAvatar} ${author.image ? styles.authorAvatarPhoto : ''}`}
          aria-hidden="true"
        >
          {author.image ? <img src={author.image} alt="" loading="lazy" /> : authorInitials}
        </span>
        <span className={styles.authorInfo}>
          <span className={styles.authorName}>{author.name}</span>
          <span className={styles.authorRole}>{author.title}</span>
          {(author.social?.linkedin || author.social?.x || author.social?.github) && (
            <span className={styles.authorSocialLinks}>
              {author.social.linkedin && (
                <a
                  href={author.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${author.name} on LinkedIn`}
                >
                  <FaLinkedinIn aria-hidden="true" />
                </a>
              )}
              {author.social.x && (
                <a
                  href={author.social.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${author.name} on X`}
                >
                  <FaXTwitter aria-hidden="true" />
                </a>
              )}
              {author.social.github && (
                <a
                  href={author.social.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${author.name} on GitHub`}
                >
                  <FaGithub aria-hidden="true" />
                </a>
              )}
            </span>
          )}
        </span>
      </div>
      <div className={styles.postSidebarMeta}>
        <span>
          <CalendarDays aria-hidden="true" />
          <time dateTime={study.frontmatter.date}>{formatDate(study.frontmatter.date)}</time>
        </span>
        <span>
          <Clock3 aria-hidden="true" />
          {study.readTime}
        </span>
      </div>
    </section>
  );

  return (
    <div className={styles.blogPage}>
      <SiteNav actions={navGetStartedLink} mobileMenuContent={mobileGetStartedLink} hideLinks />

      <section className={styles.postHero}>
        <div className={styles.postHeroInner}>
          <p className={styles.postHeroCategory}>{study.frontmatter.category}</p>
          <h1 className={styles.postHeroTitle}>{study.frontmatter.title}</h1>
          <p className={styles.postHeroDek}>{study.frontmatter.description}</p>
        </div>
      </section>
      <div className={styles.postWaveDivider} aria-hidden="true">
        <svg viewBox="0 0 1200 80" fill="none" preserveAspectRatio="none">
          <path d="M0 0H1200V18C986 58 826 24 624 46C404 70 228 34 0 60V0Z" />
          <path d="M-80 34C170 58 372 54 612 40C858 26 1018 20 1280 42" />
          <path d="M-80 48C184 70 384 66 632 52C878 38 1036 34 1280 56" />
        </svg>
      </div>

      <main className={styles.postShell}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
        />

        <div className={styles.postLayout}>
          <aside className={styles.postSidebar}>
            <div className={styles.sidebarSticky}>
              {renderAuthorPanel('written-by-heading')}

              {study.toc.length > 0 && (
                <section className={styles.tocPanel} aria-labelledby="on-this-page-heading">
                  <h2 id="on-this-page-heading" className={styles.sidebarTitle}>
                    On this page
                  </h2>
                  <BlogTableOfContents items={study.toc} />
                </section>
              )}
            </div>
          </aside>

          <div className={styles.postMain}>
            <div className={styles.mobileAuthor}>{renderAuthorPanel('mobile-written-by-heading')}</div>

            {study.toc.length > 0 && (
              <div className={styles.mobileToc}>
                <div className={styles.tocPanel}>
                  <h2 className={styles.sidebarTitle}>On this page</h2>
                  <BlogTableOfContents items={study.toc} />
                </div>
              </div>
            )}

            <article className={styles.article}>
              <MDXContent components={mdxComponents} />
            </article>
          </div>
        </div>
      </main>

      {otherStudies.length > 0 && (
        <section className={styles.articleFooter} aria-labelledby="more-case-studies-heading">
          <div className={styles.articleFooterWave} aria-hidden="true">
            <svg viewBox="0 0 1200 80" fill="none" preserveAspectRatio="none">
              <path d="M0 0H1200V18C986 58 826 24 624 46C404 70 228 34 0 60V0Z" />
              <path d="M-80 34C170 58 372 54 612 40C858 26 1018 20 1280 42" />
              <path d="M-80 48C184 70 384 66 632 52C878 38 1036 34 1280 56" />
            </svg>
          </div>
          <div className={styles.articleFooterInner}>
            <div className={styles.articleFooterHeader}>
              <h2 id="more-case-studies-heading" className={styles.listTitle}>
                More case studies
              </h2>
            </div>
            <div className={styles.postGrid}>
              {otherStudies.map((relatedStudy) => (
                <article key={relatedStudy.slug}>
                  <Link href={`/case-studies/${relatedStudy.slug}`} className={styles.postCard}>
                    <span className={styles.postCardText}>
                      <h3 className={styles.postCardTitle}>{relatedStudy.frontmatter.title}</h3>
                      <span className={styles.postCardByline}>
                        {relatedStudy.frontmatter.company} - {formatFooterReadTime(relatedStudy.readTime)}
                      </span>
                    </span>
                    <time className={styles.postCardDate} dateTime={relatedStudy.frontmatter.date}>
                      {formatDate(relatedStudy.frontmatter.date)}
                    </time>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <Waitlist />

      <SiteFooter />
    </div>
  );
}
