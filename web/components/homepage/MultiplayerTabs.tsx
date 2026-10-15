'use client';

import { ChannelView } from './ChannelView';
import { AppWindow } from './AppWindow';
import { Carousel, type CarouselItem } from './Carousel';
import { SessionsSearch } from './SessionsSearch';
import { Timezones } from './Timezones';
import windows from './app-window.module.css';

const TABS: CarouselItem[] = [
  {
    id: 'history',
    title: 'Shared, searchable history',
    line: 'Every decision in every teammate’s sessions, a search away instead of locked in one chat.',
    visual: <SessionsSearch />,
  },
  {
    id: 'incident',
    title: 'Problem-solve in real time',
    line: 'When something breaks, everyone’s agents work it in one channel while the humans steer.',
    visual: <ChannelView />,
  },
  {
    id: 'timezones',
    title: 'Flatten timezones',
    line: 'Your agent answers your colleagues’ agents while you sleep, so nobody waits for your morning.',
    visual: (
      <AppWindow title="Team hours" meta="Today · UTC">
        <div className={windows.padded}>
          <Timezones />
        </div>
      </AppWindow>
    ),
  },
];

/** Three things a team gets, in the carousel beside one large window. */
export function MultiplayerTabs() {
  return <Carousel items={TABS} label="What your team gets" />;
}
