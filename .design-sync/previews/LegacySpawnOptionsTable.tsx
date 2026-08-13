import type { ReactNode } from 'react';
import { DocsLanguageProvider, LegacySpawnOptionsTable } from 'web';

// The table ships no styling of its own — borders, header colour and the
// inline-code chips all come from the docs article container.
function Article({ children }: { children: ReactNode }) {
  return (
    <div className="docs_article" style={{ maxWidth: 620 }}>
      <DocsLanguageProvider>{children}</DocsLanguageProvider>
    </div>
  );
}

export function RelayStartup() {
  return (
    <Article>
      <LegacySpawnOptionsTable variant="relay-startup" />
    </Article>
  );
}

export function Common() {
  return (
    <Article>
      <LegacySpawnOptionsTable variant="common" />
    </Article>
  );
}

export function Advanced() {
  return (
    <Article>
      <LegacySpawnOptionsTable variant="advanced" />
    </Article>
  );
}
