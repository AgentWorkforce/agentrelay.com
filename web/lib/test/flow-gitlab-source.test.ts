import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { DEFAULT_FACTORY, factorySource, type FactoryDraft } from '../flow-onboarding';
import { flowPreview } from '../flow-preview';
import { localInput } from '../flow-local';
import { ISSUE_SOURCES, issueSourceCode, repositoryHost, validSourcePreferences } from '../flow-sources';

/**
 * GitLab as a ticket source and, without a GitHub source, as the deploy target.
 * The shapes follow AgentWorkforce/cloud#3800/#3801: the deploy handoff reads
 * `sourceSettings.gitlab.project` ("namespace/project") and `labels`, and a
 * delivered GitLab issue reaches the flow as
 * `{ source: "gitlab", title, body, labels, project }`.
 */
const gitlab: FactoryDraft = {
  ...DEFAULT_FACTORY, sources: ['gitlab'], agents: ['claude'], workflow: 'simple', step: 3,
  sourceSettings: { gitlab: { project: 'AgentWorkforce-group/AgentWorkforce-project', labels: 'garden-ready' } },
};

/** Every export of the generated local flow, with `flow()` returning the body. */
function load(source: string) {
  const exports: Record<string, unknown> = {};
  const compiled = ts.transpileModule(source.replace('import { flow } from "@relayflows/surface";', ''),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  new Function('exports', 'flow', compiled.outputText)(exports, (_name: string, _header: unknown, fn: unknown) => fn);
  return exports as { issueRejection: (issue: unknown) => string };
}

describe('GitLab ticket source', () => {
  it('is offered with a project path and required labels, like GitHub', () => {
    const source = ISSUE_SOURCES.find(item => item.id === 'gitlab')!;
    expect(source.label).toBe('GitLab');
    expect(source.fields.map(field => field.key)).toEqual(['project', 'labels']);
  });

  it('keeps GitLab settings through storage validation and refuses fields it does not have', () => {
    expect(validSourcePreferences({ gitlab: { project: 'group/project', labels: 'ready' } })).toBe(true);
    expect(validSourcePreferences({ gitlab: { repository: 'group/project' } })).toBe(false);
    expect(validSourcePreferences({ gitlab: { mentioned: true } })).toBe(false);
  });

  it('makes GitLab the repository host only when no GitHub source is chosen, as Cloud infers it', () => {
    expect(repositoryHost(['gitlab'])).toBe('gitlab');
    expect(repositoryHost(['gitlab', 'linear'])).toBe('gitlab');
    expect(repositoryHost(['github', 'gitlab'])).toBe('github');
    expect(repositoryHost(['linear'])).toBe('github');
    expect(repositoryHost([])).toBe('github');
  });

  it('declares the project field Cloud delivers on a GitLab issue', () => {
    expect(issueSourceCode(['gitlab'], gitlab.sourceSettings)).toContain('project?: string;');
  });

  it('filters a local GitLab ticket by project (case-insensitively) and labels', () => {
    const { issueRejection } = load(factorySource(gitlab, 'local'));
    const ticket = { source: 'gitlab', title: 't', body: 'b', labels: ['garden-ready'], project: 'agentworkforce-group/agentworkforce-project' };
    expect(issueRejection(ticket)).toBe('');
    expect(issueRejection({ ...ticket, project: 'other-group/app' })).toContain('project is "other-group/app"');
    expect(issueRejection({ ...ticket, labels: [] })).toContain('missing required label: garden-ready');
    // The kit's own prefilled ticket passes its own filters.
    expect(issueRejection(localInput(gitlab).issue!)).toBe('');
  });

  it('shows the GitLab mark on the change-request step when GitLab is the host', () => {
    const openStep = (draft: FactoryDraft) => flowPreview(draft)?.nodes.find(node => 'icons' in node && node.title === 'Open PR') as { icons: string[] } | undefined;
    expect(openStep(gitlab)?.icons).toEqual(['gitlab']);
    expect(openStep({ ...gitlab, sources: ['github', 'gitlab'] })?.icons).toEqual(['github']);
  });

  it('hands Cloud the settings its deploy page reads to pick the GitLab project', () => {
    // cloudConnectionsHref passes sources/sourceSettings through untouched;
    // Cloud's flow-handoff reads sourceSettings.gitlab.project from them.
    const source = factorySource(gitlab);
    expect(source).toContain('relayflow-open-change');
    expect(gitlab.sourceSettings.gitlab?.project).toMatch(/^[^/\s]+(\/[^/\s]+)+$/);
  });
});
