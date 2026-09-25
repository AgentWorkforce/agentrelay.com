import type { FlowPluginCatalogEntry } from '../lib/flow-plugin-catalog';
export function assertPluginArtifact(
  plugin: Pick<FlowPluginCatalogEntry, 'name' | 'digest' | 'manifestSha256'>,
  files: { path: string; data: Buffer }[],
): void;
export function verifyPluginArtifact(plugin: FlowPluginCatalogEntry): Promise<void>;
