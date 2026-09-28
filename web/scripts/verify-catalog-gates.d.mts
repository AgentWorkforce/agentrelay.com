import type { FlowPluginActivationDependency, FlowPluginLiveProof } from '../lib/flow-plugin-catalog';
export function deploymentEvidenceIsValid(dependency: FlowPluginActivationDependency): boolean;
export function integratedLiveProofIsValid(proof: FlowPluginLiveProof | null): boolean;
export function integratedLiveProofTimingIsValid(
  proof: FlowPluginLiveProof | null,
  dependencies: FlowPluginActivationDependency[],
  now?: number,
): boolean;
export function verifyIntegratedLiveProof(
  proof: FlowPluginLiveProof,
  request?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>,
): Promise<void>;
export function validateRecommendedExtensions(recommendedCatalog: unknown, pluginCatalog: unknown): void;
