# Enterprise security pages — review notes

Draft for Oct 22, 2026. No publication authorized.

## Merge blockers and human actions

1. Khaliq/Workspace administrator: create the `security@agentrelay.com` Google Group, choose responsible recipients, and verify an inbound test reaches them. Agents have not changed accounts, mailboxes, permissions, or DNS.
2. Khaliq: approve the vulnerability disclosure policy, safe harbor, and response targets. These are proposed commitments, not verification of operational response capacity.
3. Confirm the preliminary provider inventory against actual production traffic and contracts with the security owner. The page labels it unconfirmed; do not describe it as a final subprocessor list.
4. Obtain the repository-required independent reviews. Keep this PR draft and do not add an auto-merge label.

## Claim evidence

Source drafts: operations PR #1, branch `soc2/ops-drafts`, `enterprise-readiness/trust-page.md` and `compliance/soc2/policies/vulnerability-disclosure.md`.

Cloud verification at origin/main `8b9339aff`:
- `packages/web/lib/members/member-store.ts`: assignable roles owner/member.
- `packages/web/lib/workflows/cancel-workflow-run.ts`: individual hosted-run cancellation; local runs return a refusal.
- `packages/web/lib/auth/api-token-store.ts`: individual token revocation.
- `packages/web/lib/auth/read-only-sandbox-auth.ts` and `lib/workflows/launch-runner.ts`: existing constrained flow read-only authority; not generic suggest mode.
- `packages/web/lib/workflows/run-data-retention.ts`: workspace-configured retention; no finite default.
- BYOK credential routes and workflow human-answer route: customer keys and per-flow approvals.

The inventory uses operations `compliance/soc2/inventories/vendors.md`, explicitly a draft. Cloud infrastructure entries are repository evidence, not live account or region verification. Encryption algorithms, blanket TLS coverage, fixed regions, automatic deletion deadlines, training/ZDR guarantees, completed audits, and blanket full action logs are deliberately omitted pending stronger evidence.

## Proposed privacy reconciliation (requires owner/counsel review)

The existing `/privacy` policy names GitHub, Slack, Nango, Stripe, PostHog, OpenAI embeddings and Anthropic replies. Add the following paragraphs to “How we share information” after confirming actual use:

> Hosted services use Cloudflare, Amazon Web Services, and Neon for application hosting, networking, storage, and databases. Depending on enabled features, agent execution uses [confirmed sandbox providers]; authorized integrations use [Nango/Composio and connected services]; meeting recording and transcription use [Recall.ai/Modal/Hookdeck]; memory and evaluation use [confirmed providers]; and transactional email uses Resend.
>
> Agent workflows may send task content to [confirmed Anthropic/OpenAI/xAI/Google Gemini/OpenRouter/Cursor providers] when using Agent Relay-managed credentials. OpenRouter may route to downstream providers identified in the finalized register. Customer-supplied model credentials use the provider selected by the customer; applicable retention and training terms depend on that provider and agreement.

Do not publish the bracketed proposal or claim ZDR. Resolve active sandbox/memory providers, processing countries, contracting entities, downstream model routing, and notice requirements. Reconcile both pages in the same approved change. This PR adds a cross-link so the preliminary inventory is visible, but does not silently rewrite the legal policy.
