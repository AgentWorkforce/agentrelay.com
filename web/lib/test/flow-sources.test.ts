import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { issueSourceCode, type IssueSourceId, type SourcePreferences } from '../flow-sources';

/**
 * Filtering now ships only in the local flow: a Cloud deployment is filtered by
 * its listener watch rules and the launcher's own field check before a run ever
 * starts. So the generated filter is compiled from the local target, and reports
 * why it turned a ticket away rather than returning a bare boolean.
 */
function rejector(sources: IssueSourceId[], settings: SourcePreferences) {
  const code = ts.transpileModule(issueSourceCode(sources, settings, 'local'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: { issueRejection?: (issue: unknown) => string } = {};
  new Function('exports', code)(exports);
  return exports.issueRejection!;
}
/** A ticket matches when the flow has no rejection to report for it. */
function matcher(sources: IssueSourceId[], settings: SourcePreferences) {
  const rejection = rejector(sources, settings);
  return (issue: unknown) => rejection(issue) === '';
}
const issue = { source: 'linear', title: 'Fix login', body: 'Users cannot sign in.', labels: ['ready'] };

describe('generated issue source filters', () => {
  it('combines source-specific filters and allows any selected source', () => {
    const matches = matcher(['linear', 'shortcut', 'jira'], {
      linear: { team: 'Engineering', project: 'Web', labels: 'ready' },
      shortcut: { workspace: 'acme', team: 'Platform', labels: 'bug, ready' },
      jira: { project: 'ENG', labels: 'ready' },
    });
    expect(matches({ ...issue, team: 'Engineering', project: 'Web' })).toBe(true);
    expect(matches({ ...issue, team: 'Design', project: 'Web' })).toBe(false);
    expect(matches({ ...issue, source: 'shortcut', workspace: 'acme', team: 'Platform', labels: ['ready', 'bug'] })).toBe(true);
    expect(matches({ ...issue, source: 'shortcut', workspace: 'other', team: 'Platform', labels: ['ready', 'bug'] })).toBe(false);
    // Paired negative on the field itself: same workspace, different team. A
    // Shortcut story names its team by `group_id`, never by a project name, so
    // this is the scoping that has to hold — and has to still reject.
    expect(matches({ ...issue, source: 'shortcut', workspace: 'acme', team: 'Growth', labels: ['ready', 'bug'] })).toBe(false);
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

  it('names the filter that turned the ticket away', () => {
    const why = rejector(['github'], { github: { repository: 'acme/app', labels: 'ready, bug' } });
    const accepted = { ...issue, source: 'github', repository: 'acme/app', labels: ['ready', 'bug'] };
    expect(why(accepted)).toBe('');
    expect(why({ ...accepted, repository: 'acme/other' })).toBe('repository is "acme/other", not "acme/app"');
    expect(why({ ...accepted, labels: ['ready'] })).toBe('missing required label: bug');
    expect(why({ ...accepted, source: 'linear' })).toBe('source "linear" is not one of yours: github');
    expect(why(null)).toBe('issue needs a string source, title and body, plus an array of labels');
  });

  it('explains Slack channel, keyword and mention rejections', () => {
    const why = rejector(['slack'], { slack: { channel: '#requests', contains: 'please fix', mentioned: true } });
    const message = { ...issue, source: 'slack', channel: '#requests', body: 'Please fix this bug.', mentioned: true };
    expect(why(message)).toBe('');
    expect(why({ ...message, channel: 'general' })).toBe('channel is "general", not "#requests"');
    expect(why({ ...message, body: 'Just chatting' })).toBe('the title and body do not contain "please fix"');
    expect(why({ ...message, mentioned: false })).toBe('the message does not mention your app');
  });

  it('leaves ticket filtering to dispatch in a Cloud flow', () => {
    const settings: SourcePreferences = { github: { repository: 'acme/app', labels: 'ready' } };
    const cloud = issueSourceCode(['github'], settings, 'cloud');
    expect(cloud).toContain('export type Issue');
    expect(cloud).not.toContain('issueRejection');
    expect(cloud).not.toContain('acme/app');
    // The local flow still carries the filters, because nothing else applies them.
    expect(issueSourceCode(['github'], settings, 'local')).toContain('acme/app');
  });

  it('declares only the fields the chosen sources can deliver', () => {
    const github = issueSourceCode(['github'], {}, 'cloud');
    expect(github).toContain('repository?: string;');
    expect(github).not.toContain('channel?');
    expect(github).not.toContain('mentioned?');
    const slack = issueSourceCode(['slack'], {}, 'cloud');
    expect(slack).toContain('channel?: string;');
    expect(slack).toContain('mentioned?: boolean;');
    expect(slack).not.toContain('repository?');
  });

  it('never reads a field the trimmed Issue type does not declare', () => {
    // The kit tells people to run `npx flows check` before `flows run`, so the
    // generated filter has to typecheck against the trimmed Issue. Slack is the
    // only source that can carry a mention rule, so it is the only one allowed
    // to read issue.mentioned.
    const mentions = issueSourceCode(['slack'], { slack: { mentioned: true } }, 'local');
    expect(mentions).toContain('mentioned?: boolean;');
    expect(mentions).toContain('issue.mentioned');
    // Slack without a mention rule still declares the field, but has nothing to check.
    expect(issueSourceCode(['slack'], { slack: { channel: '#build' } }, 'local')).not.toContain('issue.mentioned');
    const settings: SourcePreferences = { github: { repository: 'acme/app', labels: 'ready' }, markdown: { path: 'tasks.md' } };
    for (const sources of [['github'], ['linear'], ['markdown']] as IssueSourceId[][]) {
      const local = issueSourceCode(sources, settings, 'local');
      expect(local).not.toContain('mentioned?:');
      expect(local).not.toContain('issue.mentioned');
    }
  });
});
