import { AgentToolLogo } from '../AgentToolLogos';
import { AGENT_TOOLS } from './AgentMarks';
import { GitHubIcon } from './icons';
import s from './why-relay.module.css';

/** A teammate's photo with their agent on a small stacked card beside it. */
function Teammate({ photo, name, agent }: { photo: string; name: string; agent: 'claude' | 'codex' }) {
  return (
    <span className={s.teammate}>
      <img className={s.photo} src={photo} alt={name} width={36} height={36} />
      <span className={s.stack}>
        <span className={s.agent} title={agent === 'claude' ? 'Claude' : 'ChatGPT'}>
          <AgentToolLogo provider={agent} idPrefix={`why-${agent}`} className={s.agentLogo} />
        </span>
      </span>
    </span>
  );
}

/** Three reasons in a ruled row: your tools, your team, your hosting. */
export function WhyRelay() {
  return (
    <div className={s.why}>
      <div className={s.item}>
        <span className={`${s.art} ${s.logos}`} aria-hidden="true">
          {Object.values(AGENT_TOOLS).map((tool) => (
            <span className={s.logo} key={tool.name} title={tool.name}>
              {tool.logo}
            </span>
          ))}
        </span>
        <h3>Works inside the tools you already use</h3>
        <p>Terminal agents, desktop apps, even agents on your phone. Keep your setup.</p>
      </div>
      <div className={s.item}>
        <span className={s.art} aria-hidden="true">
          <Teammate photo="/authors/will-128.webp" name="Will" agent="claude" />
          <span className={s.link} />
          <Teammate photo="/authors/khaliq-128.webp" name="Khaliq" agent="codex" />
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
