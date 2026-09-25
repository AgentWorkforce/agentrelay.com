import type { FlowPluginActivationDependency } from '../lib/flow-plugin-catalog';
export function verifyDeploymentReceipt(
  dependency: FlowPluginActivationDependency,
  request?: typeof fetch,
): Promise<void>;
