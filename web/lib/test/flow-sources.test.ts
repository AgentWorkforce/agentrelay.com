import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { issueSourceCode, type IssueSourceId, type SourcePreferences } from '../flow-sources';

function matcher(sources: IssueSourceId[], settings: SourcePreferences) {
  const code = ts.transpileModule(issueSourceCode(sources, settings), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: { matchesIssue?: (issue: unknown) => boolean } = {};
  new Function('exports', code)(exports);
  return exports.matchesIssue!;
}
const issue = { source: 'linear', title: 'Fix login', body: 'Users cannot sign in.', labels: ['ready'] };

describe('generated issue source filters', () => {
  it('combines source-specific filters and allows any selected source', () => {
    const matches = matcher(['linear', 'shortcut', 'jira'], {
      linear: { team: 'Engineering', project: 'Web', labels: 'ready' },
      shortcut: { workspace: 'acme', project: 'App', labels: 'bug, ready' },
      jira: { project: 'ENG', labels: 'ready' },
    });
    expect(matches({ ...issue, team: 'Engineering', project: 'Web' })).toBe(true);
    expect(matches({ ...issue, team: 'Design', project: 'Web' })).toBe(false);
    expect(matches({ ...issue, source: 'shortcut', workspace: 'acme', project: 'App', labels: ['ready', 'bug'] })).toBe(true);
    expect(matches({ ...issue, source: 'shortcut', workspace: 'other', project: 'App', labels: ['ready', 'bug'] })).toBe(false);
    expect(matches({ ...issue, source: 'jira', project: 'ENG' })).toBe(true);
    expect(matches({ ...issue, source: 'github' })).toBe(false);
  });

  it('requires Slack channel, keyword and mention when configured', () => {
    const matches = matcher(['slack'], { slack: { channel: '#requests', contains: 'please fix', mentioned: true } });
    const message = { ...issue, source: 'slack', channel: 'requests', body: 'Please fix this bug.', mentioned: true };
    expect(matches(message)).toBe(true);
    expect(matches({ ...message, channel: 'general' })).toBe(false);
    expect(matches({ ...message, mentioned: false })).toBe(false);
    expect(matches({ ...message, body: 'Just chatting' })).toBe(false);
  });

  it('allows blank filters, escapes input, and ignores deselected source preferences', () => {
    const matches = matcher(['github'], { github: { labels: ' , ' }, slack: { contains: 'old setting' } });
    expect(matches({ ...issue, source: 'github' })).toBe(true);
    expect(matches({ ...issue, source: 'slack' })).toBe(false);
    const quoted = 'a "quoted" \\ value';
    expect(matcher(['linear'], { linear: { project: quoted } })({ ...issue, project: quoted })).toBe(true);
  });

  it('rejects malformed events and inherited source names', () => {
    const matches = matcher(['github'], {});
    for (const value of [null, {}, { ...issue, source: 'toString' }, { ...issue, source: 'github', labels: [3] }]) {
      expect(matches(value)).toBe(false);
    }
  });

  it('uses tasks.md by default and matches Markdown file paths exactly', () => {
    const matches = matcher(['markdown'], {});
    expect(matches({ ...issue, source: 'markdown', path: 'tasks.md' })).toBe(true);
    expect(matches({ ...issue, source: 'markdown', path: 'Tasks.md' })).toBe(false);
    expect(matches({ ...issue, source: 'github', path: 'tasks.md' })).toBe(false);
  });
});
