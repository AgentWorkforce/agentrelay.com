export const ISSUE_SOURCES = [
  { id: 'github', label: 'GitHub', fields: [
    { key: 'repository', label: 'Repository', placeholder: 'owner/repository' },
    { key: 'labels', label: 'Required labels', placeholder: 'ready-for-agent, bug' },
  ] },
  { id: 'linear', label: 'Linear', fields: [
    { key: 'team', label: 'Team', placeholder: 'Engineering' },
    { key: 'project', label: 'Project', placeholder: 'Website' },
    { key: 'labels', label: 'Required labels', placeholder: 'ready-for-agent' },
  ] },
  { id: 'shortcut', label: 'Shortcut', fields: [
    { key: 'workspace', label: 'Workspace', placeholder: 'Your workspace' },
    { key: 'project', label: 'Project', placeholder: 'Web app' },
    { key: 'labels', label: 'Required labels', placeholder: 'ready-for-agent' },
  ] },
  { id: 'jira', label: 'Jira', fields: [
    { key: 'project', label: 'Project key', placeholder: 'ENG' },
    { key: 'labels', label: 'Required labels', placeholder: 'ready-for-agent' },
  ] },
  { id: 'slack', label: 'Slack', fields: [
    { key: 'channel', label: 'Channel', placeholder: '#engineering-requests' },
    { key: 'contains', label: 'Message contains', placeholder: 'Please fix' },
  ] },
  { id: 'markdown', label: 'Markdown file', fields: [
    { key: 'path', label: 'File path in your repository', placeholder: 'tasks.md' },
  ] },
] as const;

export type IssueSourceId = typeof ISSUE_SOURCES[number]['id'];
export type SourceFilterKey = typeof ISSUE_SOURCES[number]['fields'][number]['key'];
export type SourceSettings = Partial<Record<SourceFilterKey, string>> & { mentioned?: boolean };
export type SourcePreferences = Partial<Record<IssueSourceId, SourceSettings>>;
export const sourceLabel = (id: IssueSourceId) => ISSUE_SOURCES.find(source => source.id === id)!.label;

export function validSourcePreferences(value: unknown): value is SourcePreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([id, settings]) => {
    const source = ISSUE_SOURCES.find(source => source.id === id);
    if (!source || !settings || typeof settings !== 'object' || Array.isArray(settings)) return false;
    return Object.entries(settings).every(([key, val]) => key === 'mentioned'
      ? id === 'slack' && typeof val === 'boolean'
      : source.fields.some(field => field.key === key) && typeof val === 'string' && val.length <= 200);
  });
}

export function sourceSummary(id: IssueSourceId, settings: SourceSettings): string {
  if (id === 'markdown') return `${settings.path?.trim() || 'tasks.md'} · No source integration needed`;
  const parts = ISSUE_SOURCES.find(source => source.id === id)!.fields.flatMap(field => {
    const value = settings[field.key]?.trim();
    return value ? [`${field.label}: ${value}`] : [];
  });
  if (id === 'slack' && settings.mentioned) parts.push('Only when the app is mentioned');
  return parts.join(' · ') || 'All incoming items from this connection';
}

/** The chosen filters per source, with blank values dropped. */
function sourceFilterRules(sources: IssueSourceId[], preferences: SourcePreferences) {
  return Object.fromEntries(sources.map(id => {
    const settings = preferences[id] ?? {};
    const entries: [string, string | string[] | boolean][] = [];
    for (const field of ISSUE_SOURCES.find(source => source.id === id)!.fields) {
      const value = field.key === 'path' ? settings.path?.trim() || 'tasks.md' : settings[field.key]?.trim();
      if (value) entries.push([field.key, field.key === 'labels'
        ? [...new Set(value.split(',').map(label => label.trim()).filter(Boolean))] : value]);
    }
    if (id === 'slack' && settings.mentioned) entries.push(['mentioned', true]);
    return [id, Object.fromEntries(entries)];
  })) as Record<string, Record<string, string | string[] | boolean>>;
}

// Only the fields the chosen sources can actually deliver reach the Issue type,
// in a stable order so the generated file does not churn between drafts.
const ISSUE_OPTIONAL_FIELDS = ['repository', 'team', 'workspace', 'project', 'channel', 'path', 'mentioned'] as const;

function issueTypeCode(sources: IssueSourceId[]): string {
  const used = new Set(sources.flatMap(id => ISSUE_SOURCES.find(source => source.id === id)!.fields
    .map(field => field.key as string).filter(key => key !== 'labels' && key !== 'contains')));
  if (sources.includes('slack')) used.add('mentioned');
  const optional = ISSUE_OPTIONAL_FIELDS.filter(field => used.has(field))
    .map(field => `\n  ${field}?: ${field === 'mentioned' ? 'boolean' : 'string'};`).join('');
  return `// The ticket this flow works on.
export type Issue = {
  source: string;
  title: string;
  body: string;
  labels: string[];${optional}
};`;
}

/**
 * Filtering only earns its place in a local flow. A Cloud deployment is filtered
 * before it starts: the listener's watch rules decide which tickets wake the
 * flow, and the launcher re-checks every chosen field (labels, repository, team,
 * workspace, project, channel, Slack contains/mention) before a run launches.
 * Repeating that here only added a way for a run to cancel itself with no reason
 * given. A local run has no dispatcher at all, so the flow does the filtering —
 * and says which filter turned the ticket away.
 */
function issueFilterCode(rules: Record<string, Record<string, string | string[] | boolean>>): string {
  const literal = (value: string | string[] | boolean) => Array.isArray(value)
    ? `[${value.map(item => JSON.stringify(item)).join(', ')}]` : JSON.stringify(value);
  const entries = Object.entries(rules).map(([id, filters]) => {
    const fields = Object.entries(filters).map(([key, value]) => `${key}: ${literal(value)}`).join(', ');
    return `  ${id}: ${fields ? `{ ${fields} }` : '{}'},`;
  }).join('\n');
  return `// The filters you chose. Nothing screens tickets before a local run, so the flow
// checks flow-input.json against them and explains anything it turns away.
const filters: Record<string, Record<string, string | string[] | boolean>> = {
${entries}
};

const plain = (value: string) => value.trim().toLowerCase();
const channelName = (value: string) => plain(value).replace(/^#/, "");

/** Why this ticket does not match your filters, or "" when it does. */
export function issueRejection(issue: Issue): string {
  if (typeof issue?.source !== "string" || typeof issue.title !== "string" ||
      typeof issue.body !== "string" || !Array.isArray(issue.labels) ||
      !issue.labels.every(label => typeof label === "string")) {
    return "issue needs a string source, title and body, plus an array of labels";
  }
  if (!Object.hasOwn(filters, issue.source)) {
    return \`source "\${issue.source}" is not one of yours: \${Object.keys(filters).join(", ")}\`;
  }
  for (const [name, want] of Object.entries(filters[issue.source])) {
    if (name === "labels") {
      const missing = (want as string[]).filter(label =>
        !issue.labels.some(have => plain(have) === plain(label)));
      if (missing.length) return "missing required label: " + missing.join(", ");
    } else if (name === "mentioned") {
      if (issue.mentioned !== true) return "the message does not mention your app";
    } else if (name === "contains") {
      if (!plain(issue.title + " " + issue.body).includes(plain(want as string))) {
        return \`the title and body do not contain "\${want}"\`;
      }
    } else {
      const actual = issue[name as keyof Issue];
      const compare = name === "channel" ? channelName : plain;
      const matches = name === "path" ? actual === want
        : typeof actual === "string" && compare(actual) === compare(want as string);
      if (!matches) return \`\${name} is \${JSON.stringify(actual ?? null)}, not \${JSON.stringify(want)}\`;
    }
  }
  return "";
}`;
}

export function issueSourceCode(sources: IssueSourceId[], preferences: SourcePreferences,
  target: 'cloud' | 'local' = 'cloud'): string {
  const type = issueTypeCode(sources);
  // Cloud dispatch decides which tickets start a run, so a deployed flow needs
  // the type alone. A local run has no dispatcher and does its own filtering.
  return target === 'cloud' ? type : `${type}\n\n${issueFilterCode(sourceFilterRules(sources, preferences))}`;
}
