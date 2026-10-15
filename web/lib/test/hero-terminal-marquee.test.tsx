import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { HeroTerminalMarquee } from '../../components/home/HeroTerminalMarquee';

describe('HeroTerminalMarquee', () => {
  it('uses Grok metadata for the Grok terminal context', () => {
    const markup = renderToStaticMarkup(<HeroTerminalMarquee />);

    expect(markup).toContain('grok/relay-web ~/relay/web');
    expect(markup).not.toContain('codex/relay-web ~/relay/web');
  });

  it('renders enough repeated sequences to keep wide marquee rows covered', () => {
    const markup = renderToStaticMarkup(<HeroTerminalMarquee />);

    expect(markup.match(/grok\/relay-web ~\/relay\/web/g)).toHaveLength(4);
  });
});
