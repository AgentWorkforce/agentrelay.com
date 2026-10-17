import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { DEFAULT_FACTORY, factorySource, type FactoryDraft } from '../flow-onboarding';
import { WORKFLOWS } from '../flow-workflows';
import { ISSUE_SOURCES, issueSourceCode } from '../flow-sources';

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

  it('declares the project field Cloud delivers on a GitLab issue', () => {
    expect(issueSourceCode(['gitlab'], gitlab.sourceSettings)).toContain('project?: string;');
  });

  it('filters a local GitLab ticket by project (case-insensitively) and labels', () => {
    const { issueRejection } = load(factorySource(gitlab, 'local'));
    const ticket = { source: 'gitlab', title: 't', body: 'b', labels: ['garden-ready'], project: 'agentworkforce-group/agentworkforce-project' };
    expect(issueRejection(ticket)).toBe('');
    expect(issueRejection({ ...ticket, project: 'other-group/app' })).toContain('project is "other-group/app"');
    expect(issueRejection({ ...ticket, labels: [] })).toContain('missing required label: garden-ready');
  });

  it('opens the change request through relayflow-open-change', () => {
    const source = factorySource(gitlab);
    expect(source).toContain('relayflow-open-change');
  });

  it('drafts and comments on the merge request through relayflow-change, with gh only as the local fallback', () => {
    // cloud#4164: a bare `gh pr ready --undo` / `gh pr comment` does nothing on
    // GitLab, so a merge request with broken checks looked ready to merge.
    for (const { id } of WORKFLOWS) {
      const source = factorySource({ ...gitlab, workflow: id });
      expect(source, id).toContain('relayflow-change comment --body-file');
      if (id !== 'simple') expect(source, id).toContain('relayflow-change draft');
      const bare = source.match(/gh pr (ready|comment)/g) ?? [];
      const fallback = source.match(/else gh pr (ready|comment)/g) ?? [];
      expect(bare.length, id).toBe(fallback.length);
    }
    expect(gitlab.sourceSettings.gitlab?.project).toMatch(/^[^/\s]+(\/[^/\s]+)+$/);
  });
});
