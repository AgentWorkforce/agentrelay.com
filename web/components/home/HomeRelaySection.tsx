import s from '../../app/landing.module.css';

const RELAY_STEPS = [
  {
    title: 'Get agents on the same channel',
    body: 'Give each worker a shared place to listen, speak, and see the work already in motion.',
  },
  {
    title: 'Organize the team around threads',
    body: 'Keep decisions, handoffs, files, and status updates attached to the task they belong to.',
  },
  {
    title: 'Route work without more glue',
    body: 'Agents can recover context, mention each other, and move work forward without asking humans to reconnect the dots.',
  },
];

export function HomeRelaySection() {
  return (
    <section className={s.homeRelaySection} aria-labelledby="home-relay-title">
      <div className={s.homeRelayInner}>
        <div className={s.homeRelayCopy}>
          <span className={s.homeRelayKicker}>Get on the relay</span>
          <h2 id="home-relay-title">A relay is how agent teams stay together.</h2>
          <p>
            It is the shared coordination layer for agents, people, files, messages, and decisions. Instead of
            every worker operating from a separate side channel, everyone joins the same signal.
          </p>
        </div>

        <div className={s.homeRelayVisual}>
          <div className={s.homeRelaySignal} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <div className={s.homeRelayFlow}>
            {RELAY_STEPS.map((step, index) => (
              <div className={s.homeRelayStep} key={step.title}>
                <span className={s.homeRelayStepIndex}>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
