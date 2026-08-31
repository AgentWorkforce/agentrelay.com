// Public surface exposed to claude.ai/design. This is the design system's
// deliberate boundary: reusable components and site chrome, not page-level
// marketing compositions (`components/home/*`, the *LandingPage shells) and
// not the filesystem-backed page loaders, which cannot render in a browser.
//
// `components/docs/Card` and `components/ui/card` both export `Card`. The ui
// primitive keeps the plain name (it is the general-purpose container, and the
// one the brand theme showcase documents); the docs link-card is exported as
// `DocsCard`.

// Must stay the first import: it installs the ambient `process.env` that Next
// normally substitutes at build time, before any component module evaluates.
import './.design-sync-shims/process-env';

// ── Theme ─────────────────────────────────────────────────────────────────
// Reproduces `<html data-theme="dark">` from app/layout.tsx. The site renders
// dark everywhere; without this a component falls back to the light `:root`
// values, which the shipped product never displays.
export { BrandTheme } from './.design-sync-shims/brand-theme';

// ── Primitives ────────────────────────────────────────────────────────────
export { Badge } from './components/ui/badge';
export { Button } from './components/ui/button';
export { Input } from './components/ui/input';
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/ui/card';

// ── Docs kit ──────────────────────────────────────────────────────────────
export { Card as DocsCard } from './components/docs/Card';
export { CardGroup } from './components/docs/CardGroup';
export { BannerLink } from './components/docs/BannerLink';
export { CodeGroup } from './components/docs/CodeGroup';
export { CopyCodeButton } from './components/docs/CopyCodeButton';
export { DocsLanguageProvider } from './components/docs/DocsLanguageContext';
export { DocsNav, DocsProductSwitcher } from './components/docs/DocsNav';
export { DocsPageActions } from './components/docs/DocsPageActions';
export { DocsSearch } from './components/docs/DocsSearch';
export { DocsVersionSelect } from './components/docs/DocsVersionSelect';
export { IntegrationGrid } from './components/docs/IntegrationGrid';
export { LegacySpawnOptionsTable } from './components/docs/LegacySpawnOptionsTable';
export { Note } from './components/docs/Note';
export { Warning } from './components/docs/Warning';
export { TableOfContents } from './components/docs/TableOfContents';
export { BlogTableOfContents } from './components/blog/BlogTableOfContents';

// ── Site chrome ───────────────────────────────────────────────────────────
export { SiteNav, LogoIcon, LogoWordmark } from './components/SiteNav';
export { SiteFooter } from './components/SiteFooter';
export { WaitlistForm } from './components/WaitlistForm';
export { InstallCommand, AgentSetupPrompt } from './components/InstallCommand';
export { CopyInstructionsButton } from './components/CopyInstructionsButton';
export { DocsGitHubStarsBadge } from './components/DocsGitHubStarsBadge';
export { SdkCodeExample } from './components/SdkCodeExample';
export { AgentToolLogo } from './components/AgentToolLogos';
export { FadeIn } from './components/FadeIn';

// ── Motion + illustration ─────────────────────────────────────────────────
export { default as RelayAnimation } from './components/RelayAnimation';
export { MessageRelayAnimation } from './components/MessageRelayAnimation';
export { NodeRelayAnimation } from './components/NodeRelayAnimation';
export { ChannelMessagesPreview } from './components/ChannelMessagesPreview';

// ── Agents ────────────────────────────────────────────────────────────────
export { AgentArt } from './components/agents/AgentArt';
export { BuildYourOwn } from './components/agents/BuildYourOwn';
export { ForkAgentButton } from './components/agents/ForkAgentButton';
export { IntegrationLogos } from './components/agents/IntegrationLogos';
