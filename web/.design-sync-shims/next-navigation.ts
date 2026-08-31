// Stands in for `next/navigation` in the design-system bundle. The real hooks
// read App Router context and throw when it is absent, which it always is
// outside a Next app.
//
// `usePathname` drives active-state styling in SiteNav and DocsNav, so it is
// steerable: a preview can set `window.__dsPathname` to render the nav in its
// active state.

export function usePathname(): string {
  if (typeof window !== 'undefined') {
    const override = (window as { __dsPathname?: string }).__dsPathname;
    if (typeof override === 'string') return override;
  }
  return '/';
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}

export function useRouter() {
  const noop = () => {};
  return {
    push: noop,
    replace: noop,
    back: noop,
    forward: noop,
    refresh: noop,
    prefetch: noop,
  };
}

export function useParams(): Record<string, string | string[]> {
  return {};
}

export function notFound(): never {
  throw new Error('notFound() is a server-side Next control-flow signal and has no meaning here.');
}

export function redirect(): never {
  throw new Error('redirect() is a server-side Next control-flow signal and has no meaning here.');
}
