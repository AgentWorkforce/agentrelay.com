// Stands in for `next/link` in the design-system bundle. Next's Link drags the
// App Router client runtime in and throws without a mounted router, neither of
// which exists in claude.ai/design. Navigation is an app concern; what the
// design system contributes is the anchor and its styling, so that is what
// ships.

import * as React from 'react';

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string | { pathname?: string };
  // Router-only props — accepted so call sites type-check, never forwarded to
  // the DOM (React warns on unknown attributes).
  prefetch?: boolean | null;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  legacyBehavior?: boolean;
  locale?: string | false;
};

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, prefetch, replace, scroll, shallow, passHref, legacyBehavior, locale, children, ...rest },
  ref,
) {
  const resolved = typeof href === 'string' ? href : (href?.pathname ?? '#');
  return (
    <a ref={ref} href={resolved} {...rest}>
      {children}
    </a>
  );
});

export default Link;
