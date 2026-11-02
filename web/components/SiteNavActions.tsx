import landing from '../app/landing.module.css';
import { GitHubStarsBadge } from './GitHubStars';
import { DesktopDownloadCta } from './homepage/DesktopDownloadCta';

/** The nav's download button: "Download for macOS / Windows / Linux", or "Get started" on phones. */
export function NavDownloadButton() {
  return (
    <DesktopDownloadCta
      className={`${landing.ctaPrimary} ${landing.homeNavAction}`}
      placement="nav"
      iconSize={15}
      fallback="Get started"
    />
  );
}

/** The right side of the site nav on every page but the product landings: GitHub stars and the download button. */
export function SiteNavActions() {
  return (
    <>
      <GitHubStarsBadge />
      <NavDownloadButton />
    </>
  );
}
