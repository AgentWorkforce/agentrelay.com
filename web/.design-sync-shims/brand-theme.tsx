// Applies the Agent Relay theme the way the real site does.
//
// `app/layout.tsx` renders `<html lang="en" data-theme="dark">`, and
// `public/brand.css` keys its dark token block off `:root[data-theme='dark']`.
// Nothing inside a component sets that attribute, so a component rendered
// outside the Next app falls back to the light `:root` values — a palette the
// shipped site never displays.
//
// Wrapping in this component reproduces the site's own setup, and it is what
// `cfg.provider` mounts around every preview card.

import * as React from 'react';

export function BrandTheme({
  children,
  theme = 'dark',
}: {
  children?: React.ReactNode;
  theme?: 'dark' | 'light';
}) {
  React.useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');

    // Preview cards hardcode `body{…;background:#fff}` in a <style> BLOCK that
    // is emitted after styles.css, so it beats the stylesheet on source order.
    // An inline declaration outranks both — set the value, don't try to clear
    // one (there is no inline value to remove).
    document.body.style.setProperty('background', 'var(--bg)');
    document.body.style.setProperty('color', 'var(--fg)');

    // The card's own grid chrome is hardcoded light (#e5e7eb rules, #6b7280
    // labels). Retint it through tokens so a card reads as one surface.
    const id = 'ds-brand-theme-chrome';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent =
        '.ds-cell{border-color:var(--line)!important}' +
        '.ds-cell>h4{color:var(--fg-muted)!important}';
      document.head.appendChild(style);
    }
  }, [theme]);

  return <>{children}</>;
}
