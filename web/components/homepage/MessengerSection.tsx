import { MultiplayerTabs } from './MultiplayerTabs';
import landing from '../../app/landing.module.css';
import s from './messenger-section.module.css';

/** Multi-player agent work: the band's heading, then the three ideas beside one large window. */
export function MessengerSection() {
  return (
    <div className={`${landing.featuresWrapper} ${s.band}`}>
      <header className={s.intro}>
        <h2>
          Built for <em>multi-player</em>
          <br />
          agent work
        </h2>
        <p>Your team’s agents share history, swarm problems together, and keep working across time zones.</p>
      </header>
      <MultiplayerTabs />
    </div>
  );
}
