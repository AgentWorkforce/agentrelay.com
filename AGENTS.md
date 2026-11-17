# Working in agentrelay.com

```sh
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

- No agent production access or live-infrastructure credentials. Production changes go through the existing reviewed CI and human gates; humans cut releases.
- Paired onboarding and Google sign-in use `npm run dev:onboarding` from `../cloud`; read its Local Setup first and use the printed origin. Identify the checkout owning a port before stopping it.
- Never print credentials in a transcript. Task-originator approval suffices; automated checks are not reviewer approvals, and fixed session-lifetime or recurring inbox/reporting ceremony is not a gate.

## Agency and guidance

- Act autonomously on routine assigned work; ask forgiveness rather than permission. Preserve explicit production, release and credential gates.
- For guidance, ask the engineering leads, the agent that spawned you, or the layered owner on Agent Relay.
- Only a truly pressing or blocking question goes to `khaliq-gant` or `will-washburn` (CODEOWNERS) on Agent Relay.

## Cross-repo context

- Before and during changes, understand how this repo fits the wider system; consult its repo map and related-repo docs where available.
- Check relevant agents’ summaries on Agent Relay and proactively contact owning agents about dependencies, adjacent changes and work in flight.

## Pull requests

- Open PRs ready for review, never as drafts. If merging requires Khaliq’s OK, use `merge-train:hold`.
- Immediately subscribe to PR feedback through Agent Relay using [this skill](https://github.com/AgentWorkforce/skills/blob/main/skills/subscribing-relay-webhooks-and-writebacks/SKILL.md), and verify the subscription.
- Evaluate every finding. Address applicable feedback and explain declined changes; a PR with unaddressed feedback or conflicts is not ready.
- When ready, loudly alert the CODEOWNERS and the agent that spawned you on Agent Relay.
- Keep related older PRs moving by contacting their author agent; if unavailable, escalate to the CODEOWNERS or layered owner.
