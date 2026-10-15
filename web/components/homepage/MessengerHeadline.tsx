import type { CSSProperties } from 'react';

import landing from '../../app/landing.module.css';
import s from './messenger-headline.module.css';

/**
 * "Don’t shoot the messenger" with "Don’t" struck out: the hero's two rising
 * lines, then one thin crimson line slashes across the word at an angle and
 * the word dims.
 */
export function MessengerHeadline() {
  return (
    <h1 className={`${landing.headline} ${landing.heroCenterHeadline}`} aria-label="Shoot the messenger">
      <span className={landing.heroTitleLine} aria-hidden="true">
        <span className={landing.heroTitleLineInner} style={{ '--line': 0 } as CSSProperties}>
          <span className={s.struck}>Don’t</span> shoot the
        </span>
      </span>
      <span className={landing.heroTitleLine} aria-hidden="true">
        <span className={landing.heroTitleLineInner} style={{ '--line': 1 } as CSSProperties}>
          messenger
        </span>
      </span>
    </h1>
  );
}
