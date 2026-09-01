import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lobehub/icons/es/Grok', () => ({
  default: ({ className }: { className?: string }) => <svg className={className} />,
}));

import { HeroTerminalMarquee } from '../../components/home/HeroTerminalMarquee';

describe('HeroTerminalMarquee', () => {
  it('uses Grok metadata for the Grok terminal context', () => {
    const markup = renderToStaticMarkup(<HeroTerminalMarquee />);

    expect(markup).toContain('grok/relay-docs ~/relay/docs');
    expect(markup).not.toContain('codex/relay-docs ~/relay/docs');
  });

  it('renders enough repeated sequences to keep wide marquee rows covered', () => {
    const markup = renderToStaticMarkup(<HeroTerminalMarquee />);

    expect(markup.match(/grok\/relay-docs ~\/relay\/docs/g)).toHaveLength(4);
  });
});
