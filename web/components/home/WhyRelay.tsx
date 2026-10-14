import { AgentToolLogo } from '../AgentToolLogos';
import { ClaudeCodeColor, Cursor } from '../brand-icons';
import { GitHubIcon } from './icons';
import s from './why-relay.module.css';

function ConductorMark() {
  return (
    <svg width={16} height={16} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M1 1h10v3H4v4h7v3H1z" fill="currentColor" />
    </svg>
  );
}

/** Three reasons in a ruled row: your tools, your team, your hosting. */
export function WhyRelay() {
  return (
    <div className={s.why}>
      <div className={s.item}>
        <span className={s.art} aria-hidden="true">
          <ClaudeCodeColor size={20} />
          <AgentToolLogo provider="codex" className={s.logo} idPrefix="why-relay" />
          <Cursor size={20} />
          <ConductorMark />
        </span>
        <h3>Works inside the tools you already use</h3>
        <p>Terminal agents, desktop apps, even agents on your phone. Keep your setup.</p>
      </div>
      <div className={s.item}>
        <span className={s.art} aria-hidden="true">
          <span className={s.machine}>W</span>
          <span className={s.link} />
          <span className={s.machine}>K</span>
          <span className={s.link} />
          <span className={s.machine}>+</span>
        </span>
        <h3>Works across teammates and machines</h3>
        <p>Your laptop, your teammate’s, a box in the cloud. One workspace.</p>
      </div>
      <div className={s.item}>
        <span className={s.art} aria-hidden="true">
          <span className={s.pill}>Hosted</span>
          <span className={s.or}>or</span>
          <span className={s.pill}>
            <GitHubIcon size={13} /> Self-host
          </span>
        </span>
        <h3>Fully hosted, or open source</h3>
        <p>
          Use the hosted service, or{' '}
          <a href="https://github.com/agentworkforce/relay" rel="noopener noreferrer" target="_blank">
            run it yourself
          </a>
          .
        </p>
      </div>
    </div>
  );
}
