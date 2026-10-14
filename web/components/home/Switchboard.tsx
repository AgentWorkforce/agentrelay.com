import Image from 'next/image';

import { FadeIn } from '../FadeIn';
import switchboard from '../../public/home/bell-switchboard.jpg';
import s from './switchboard.module.css';

const PHOTO_SOURCE =
  'https://commons.wikimedia.org/wiki/File:Photograph_of_Women_Working_at_a_Bell_System_Telephone_Switchboard_(3660047829).jpg';

/** The pain, named: you connect every handoff by hand, like an operator. */
export function Switchboard() {
  return (
    <section className={s.switchboard} aria-labelledby="switchboard-title">
      <FadeIn direction="up" className={s.text}>
        <h2 id="switchboard-title" className={s.title}>
          Right now, you are the switchboard.
        </h2>
        <div className={s.copy}>
          <p className={s.lead}>Claude Code finishes the migration. You copy its summary and paste it into Codex.</p>
          <p>Codex has a question. You copy that back.</p>
          <p>Your teammate’s agent fixed the same bug yesterday. You find out at standup.</p>
          <p className={s.turn}>Every handoff waits for you.</p>
        </div>
      </FadeIn>
      <FadeIn direction="up" delay={120} className={s.figure}>
        <figure>
          <div className={s.photo}>
            <Image
              src={switchboard}
              alt="A long row of telephone operators in headsets plugging cords into a Bell System switchboard"
              sizes="(max-width: 860px) 100vw, 58vw"
              className={s.img}
            />
          </div>
          <figcaption className={s.caption}>
            Operators at a Bell System switchboard, connecting every call by hand.{' '}
            <a href={PHOTO_SOURCE} rel="noopener noreferrer" target="_blank">
              U.S. National Archives
            </a>
            , no known copyright restrictions.
          </figcaption>
        </figure>
      </FadeIn>
    </section>
  );
}
