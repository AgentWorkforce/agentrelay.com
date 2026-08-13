import { ForkAgentButton } from 'web';

// The CTA pair on an agent's detail page: one-click launch on Agent Relay Cloud
// plus a fork link to the source repo. Both buttons take their look from the
// classNames the caller passes. The agents page passes .ctaPrimary/.ctaSecondary,
// which `composes: btn btn-primary from global` — composition lives in the CSS
// module's JS export, not the stylesheet, so the global .btn pair is named here
// alongside the module class.
const PRIMARY = 'agents_ctaPrimary btn btn-primary';
const SECONDARY = 'agents_ctaSecondary btn btn-secondary';
const prReviewer = {
  slug: 'review',
  personaId: 'pr-reviewer',
  dir: 'review',
  name: 'PR Reviewer',
  accent: '#2d6a9c',
  hasCustomArt: true,
};

const jokeBot = {
  slug: 'joke-bot',
  personaId: 'joke-bot',
  personaFile: 'persona.json',
  dir: 'joke-bot',
  name: 'Joke Bot',
  accent: '#f5a623',
  hasCustomArt: false,
};

export function Default() {
  return (
    <div className="agents_ctaRow">
      <ForkAgentButton
        agent={prReviewer}
        primaryClassName={PRIMARY}
        secondaryClassName={SECONDARY}
      />
    </div>
  );
}

export function CustomPrimaryLabel() {
  return (
    <div className="agents_ctaRow">
      <ForkAgentButton
        agent={jokeBot}
        primaryClassName={PRIMARY}
        secondaryClassName={SECONDARY}
        primaryLabel="Deploy Joke Bot"
      />
    </div>
  );
}

export function InPoweredCard() {
  return (
    <div className="agents_poweredCard" style={{ maxWidth: 560 }}>
      <span className="agents_poweredEyebrow">Ready to run it?</span>
      <p className="agents_poweredText">
        Launch PR Reviewer on Agent Relay in one click, or fork the source and tailor it to your team.
      </p>
      <div className="agents_ctaRow" style={{ marginTop: 0, justifyContent: 'center' }}>
        <ForkAgentButton
          agent={prReviewer}
          primaryClassName={PRIMARY}
          secondaryClassName={SECONDARY}
        />
      </div>
    </div>
  );
}
