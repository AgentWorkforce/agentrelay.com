import { Globe } from './Globe';
import s from './distribute.module.css';

/** Third in the run after "Move faster" and "Unblock automatically": copy on the left, the turning globe on the right. */
export function Distribute() {
  return (
    <section className={s.section} aria-labelledby="distribute-title">
      <div className={s.copy}>
        <h2 id="distribute-title" className={s.title}>
          Distribute the work.
        </h2>
        <p className={s.line}>
          Your laptop, a cloud box, a Mac mini across the world. Agents reach each other wherever they run.
        </p>
      </div>
      <div className={s.globe}>
        <Globe />
      </div>
    </section>
  );
}
