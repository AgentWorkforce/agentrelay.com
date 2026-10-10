import { factorySource, type FactoryDraft } from './flow-onboarding';

/**
 * Software Garden has one source: the /flows generator. Every surface that
 * deploys it (the /flows handoff, Cloud's prebuilt-flow wizard, the dashboard's
 * recommended flows and ?flow= links) deploys the same bytes, published under
 * public/ as a versioned, sha256-pinned file (agentrelay.com#174).
 *
 * The generator's output depends on the selection, so this is the selection
 * the recommended-flow catalog deploys: GitHub issues, Claude Code as builder
 * and reviewer (the entry's default and only allowed agent), the Traditional
 * workflow, and no extra instructions. Repository and label filters are not
 * part of it: Cloud's listener applies them, and they do not change the source.
 */
export const SOFTWARE_GARDEN_DRAFT: FactoryDraft = {
  version: 4,
  sources: ['github'],
  sourceSettings: {},
  agents: ['claude'],
  otherAgent: '',
  task: '',
  workflow: 'traditional',
  step: 3,
};

export const SOFTWARE_GARDEN_ARTIFACT_DIR = 'public/flows/software-garden';

/** Relative to web/. */
export function softwareGardenArtifactPath(version: number): string {
  return `${SOFTWARE_GARDEN_ARTIFACT_DIR}/v${version}.flow.ts`;
}

export function softwareGardenArtifactUrl(version: number): string {
  return `https://agentrelay.com/flows/software-garden/v${version}.flow.ts`;
}

export function softwareGardenSource(): string {
  return factorySource(SOFTWARE_GARDEN_DRAFT, 'cloud');
}
