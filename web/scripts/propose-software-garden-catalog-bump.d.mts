export const CATALOG_PATH: string;
export const MANIFEST_PATH: string;
export const SOURCE_ROWS_PATH: string;
export const DOCS_PATH: string;
export const PR_BASE: string;
export const BUMP_BRANCH: string;
export const DEFAULT_CHECKS: readonly string[];

export type CatalogBumpPlan =
  | { status: 'current'; version: number; catalogVersion: number }
  | {
    status: 'bump';
    from: number;
    to: number;
    catalogVersion: number;
    ref: string;
    sha256: string;
    path: string;
    files: Record<string, string>;
  };

export function gardenArtifactPath(version: number): string;
export function pinnedGardenVersion(catalog: unknown): number;
export function renderCatalogEdit(catalogText: string, next: unknown): string;
export function renderDocsEdit(
  docsText: string,
  from: { catalogVersion: number; version: number },
  to: { catalogVersion: number; version: number },
): string;
export function addSourceRow(rowsText: string, catalogVersion: number, ref: string, sha256: string): string;
export function planCatalogBump(input: {
  catalogText: string;
  manifestText: string;
  rowsText: string;
  docsText: string;
  firstAddedCommit: (path: string) => string | null;
  fileAt: (ref: string, path: string) => Buffer;
}): CatalogBumpPlan;
export function pullRequestTitle(plan: Extract<CatalogBumpPlan, { status: 'bump' }>): string;
export function pullRequestBody(plan: Extract<CatalogBumpPlan, { status: 'bump' }>, checks: readonly string[]): string;
export function syncPullRequest(input: {
  plan: Extract<CatalogBumpPlan, { status: 'bump' }>;
  exec: (command: string, args: string[]) => Promise<string>;
  repository: string;
  base?: string;
  token: string;
  checks: readonly string[];
  bodyFile?: string;
}): Promise<{ action: 'created' | 'updated'; pushed: boolean; number?: number; url: string }>;
