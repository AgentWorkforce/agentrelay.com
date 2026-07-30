# Content pipeline — running list

Statuses: idea → notes → ready-for-will → drafting → published. Newest
first. One `##` entry per post; body holds the notes.

*(entries begin below)*

## Just in time Graphs

- Status: idea
- Source: untracked local
  `web/content/blog/build-your-first-agent-team.mdx`
- State: only the title is unique. The description is empty and the body
  is a duplicate of “Build Your First Team of AI Agents,” so there is no
  usable draft or argument to preserve yet.
- Reconciliation: retain this as a pipeline idea, but do not publish or
  treat the duplicated body as notes. Ask Will what “just in time
  graphs” means before developing it.

## Hosted onboarding skill: node CLI group

- Status: published
- Source: clean `skill-page-v11-cli` worktree
- Artifact: `web/content/agent-relay/SKILL.md`
- Evidence: PR
  [#34](https://github.com/AgentWorkforce/agentrelay.com/pull/34) merged
  2026-07-30 as commit `470adf1`.
- Reconciliation: worktree commit `8054dc3` is the content that shipped.
  Its unmerged follow-up `d563bfb` says MCP callers must explicitly
  register; that now contradicts broker auto-registration and should not
  be carried forward.

## Build Your First Team of AI Agents

- Status: drafting
- Source: Will's clean `blog/first-agent-team` worktree and open PR
  [#28](https://github.com/AgentWorkforce/agentrelay.com/pull/28)
- Artifact: `web/content/blog/build-your-first-agent-team.mdx`
- State: a complete 347-line playbook draft exists, covering the
  five-role team, harness routing, named-agent anatomy, Relay setup,
  adversarial review loop, and first-week staffing order.
- Reconciliation: the untracked `copy.mdx` carries this title but
  duplicates the same body; the committed worktree/PR is canonical, so
  delete the local copy rather than creating another post.

## You're not behind: how I got out of the agent-factory overwhelm

- Status: idea
- Source: Will, relayed verbatim by chief on 2026-07-29
- Form: undecided — essay or Twitter/X thread; notes should develop both
  cuts and recommend one
- Voice seeds: Most people on Twitter purport to have huge agent
  factories — “their most efficient agent workflows, everybody else is
  doing it wrong, the way they do it is right, you're falling behind.”
  Counter-position: “that's not actually me.” If you're like Will:
  overwhelmed, producing all this extra agent code, feeling you need to
  stay on top of it, feeling you can't, “slow letting go.”
- Core promise: give people hope. They are not behind; they can handle
  it, and there are tools. Keep it explicitly testimonial and
  anti-prescriptive: “here's how I got out of that, here's how I DID it
  — not here's how you SHOULD do it.”
- Notes to develop:
  - Subvert the confident factory-flex genre with a couple of anonymized
    archetypes; do not name or dunk on individuals.
  - Build the emotional arc from overwhelm, to permission not to stay on
    top of everything, to letting go through structure.
  - Ground “how I did it” in Will's real machinery: a chief-of-staff
    agent, departments with owners, one-writer file discipline,
    dispatch-only work, briefs with ACK/DONE, and a markdown brain in
    git. Ask chief for journal/workstream specifics rather than
    inventing them.
  - Offer anti-guru title options.
  - Develop both the thread cut and essay cut, then recommend.
