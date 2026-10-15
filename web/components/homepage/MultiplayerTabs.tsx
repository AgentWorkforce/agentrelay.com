'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { ChannelView } from './ChannelView';
import { AppWindow } from './AppWindow';
import { SessionsSearch } from './SessionsSearch';
import { Timezones } from './Timezones';
import landing from '../../app/landing.module.css';
import s from './multiplayer-tabs.module.css';

const TABS: { id: string; title: string; line: string; visual: ReactNode }[] = [
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
        <div className={s.padded}>
          <Timezones />
        </div>
      </AppWindow>
    ),
  },
];

/**
 * Three things a team gets, as a list beside one large window. The active
 * item fills its progress line, then hands on to the next; picking one
 * switches the window straight to it. The countdown runs only while the
 * section is in view; without motion, nothing auto-advances.
 */
export function MultiplayerTabs() {
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Only count down while the section is on screen, so it starts on the first item.
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={s.tabs} ref={root} data-playing={inView || undefined}>
      <ol className={s.list} role="tablist" aria-label="What your team gets">
        {TABS.map((tab, index) => (
          <li key={tab.id}>
            <button
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={index === active}
              aria-controls="multiplayer-panel"
              className={s.tab}
              onClick={() => setActive(index)}
            >
              <span className={s.track}>
                {index === active ? (
                  <i
                    key={active}
                    className={s.progress}
                    onAnimationEnd={() => setActive((active + 1) % TABS.length)}
                  />
                ) : null}
              </span>
              <span className={s.label}>
                <b>{tab.title}</b>
                <span>{tab.line}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className={s.stage} id="multiplayer-panel" role="tabpanel" aria-labelledby={`tab-${TABS[active].id}`}>
        <div className={landing.previewAccentBlue} />
        <div className={s.window} key={TABS[active].id}>
          {TABS[active].visual}
        </div>
      </div>
    </div>
  );
}
