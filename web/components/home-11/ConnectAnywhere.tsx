import { Globe } from './Globe';
import s from './connect-anywhere.module.css';

/** Where agents run doesn't matter: a centred heading over a turning globe. */
export function ConnectAnywhere() {
  return (
    <section className={s.section} aria-labelledby="connect-anywhere-title">
      <div className={s.copy}>
        <h2 id="connect-anywhere-title" className={s.title}>
          Connect anywhere.
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
