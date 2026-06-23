import type React from 'react';

import { BannerLink } from './BannerLink';
import { Card } from './Card';
import { CardGroup } from './CardGroup';
import { CodeGroup } from './CodeGroup';
import { HighlightedPre } from './HighlightedCode';
import { LegacySpawnOptionsTable } from './LegacySpawnOptionsTable';
import { Note } from './Note';
import { Warning } from './Warning';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function HeadingWithId(level: 2 | 3) {
  return function Heading({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    const text = typeof children === 'string' ? children : String(children);
    const id = slugify(text);
    const Tag = `h${level}` as const;
    return (
      <Tag id={id} {...props}>
        {children}
      </Tag>
    );
  };
}

/** Component map shared by every MDX docs renderer (Agent Relay + product sections). */
export const mdxComponents = {
  CodeGroup,
  Card,
  CardGroup,
  BannerLink,
  Note,
  Warning,
  SpawnOptionsTable: LegacySpawnOptionsTable,
  pre: HighlightedPre,
  h2: HeadingWithId(2),
  h3: HeadingWithId(3),
};
