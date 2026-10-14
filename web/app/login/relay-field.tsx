'use client';

import { RelayRibbons } from '../../components/RelayRibbons';
import { RELAY_RUSH_EVENT } from './relay-events';
import s from './login.module.css';

/** The sign-in showcase: ribbons converge on the right edge, where the form sits. */
export function RelayField() {
  return <RelayRibbons className={s.field} focus={[1, 0.5]} rushEvent={RELAY_RUSH_EVENT} />;
}
