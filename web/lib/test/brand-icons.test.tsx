import React, { type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

// The icons' default exports also attach lobehub's Avatar/Combine variants,
// which pull in emoji data; the Mono/Color components are what render.
import LobeClaudeCode from '@lobehub/icons/es/ClaudeCode/components/Mono';
import LobeClaudeCodeColor from '@lobehub/icons/es/ClaudeCode/components/Color';
import LobeCodex from '@lobehub/icons/es/Codex/components/Mono';
import LobeCursor from '@lobehub/icons/es/Cursor/components/Mono';
import LobeGithub from '@lobehub/icons/es/Github/components/Mono';
import LobeGrok from '@lobehub/icons/es/Grok/components/Mono';
import LobeHermesAgent from '@lobehub/icons/es/HermesAgent/components/Mono';
import LobeMCP from '@lobehub/icons/es/MCP/components/Mono';
import LobeOpenClawColor from '@lobehub/icons/es/OpenClaw/components/Color';
import LobeOpenCode from '@lobehub/icons/es/OpenCode/components/Mono';

import {
  ClaudeCode,
  ClaudeCodeColor,
  Codex,
  Cursor,
  Github,
  Grok,
  HermesAgent,
  MCP,
  OpenClawColor,
  OpenCode,
} from '../../components/brand-icons';

type AnyIcon = ComponentType<Record<string, unknown>>;

// React's useId output differs between the two trees, so compare with ids normalised.
const normalise = (markup: string) => markup.replace(/(lobe-icons-[a-z-]+-\d+-)[^")]+/g, '$1ID');

const cases: [string, AnyIcon, AnyIcon][] = [
  ['ClaudeCode', ClaudeCode, LobeClaudeCode],
  ['ClaudeCodeColor', ClaudeCodeColor, LobeClaudeCodeColor],
  ['Codex', Codex, LobeCodex],
  ['Cursor', Cursor, LobeCursor],
  ['Github', Github, LobeGithub],
  ['Grok', Grok, LobeGrok],
  ['HermesAgent', HermesAgent, LobeHermesAgent],
  ['MCP', MCP, LobeMCP],
  ['OpenClawColor', OpenClawColor, LobeOpenClawColor],
  ['OpenCode', OpenCode, LobeOpenCode],
] as [string, AnyIcon, AnyIcon][];

const propSets: Record<string, unknown>[] = [
  {},
  { size: 24 },
  { size: '2.8rem', className: 'mark' },
  { size: 20, 'aria-hidden': 'true', style: { color: 'red' } },
];

describe('brand icons', () => {
  it.each(cases)('%s renders the same markup as @lobehub/icons', (_name, Local, Lobe) => {
    for (const props of propSets) {
      expect(normalise(renderToStaticMarkup(<Local {...props} />))).toBe(
        normalise(renderToStaticMarkup(<Lobe {...props} />)),
      );
    }
  });
});
