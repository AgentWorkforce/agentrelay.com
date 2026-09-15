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

export function issueSourceCode(sources: IssueSourceId[], preferences: SourcePreferences): string {
  const rules = Object.fromEntries(sources.map(id => {
    const settings = preferences[id] ?? {};
    const entries: [string, string | string[] | boolean][] = [];
    for (const field of ISSUE_SOURCES.find(source => source.id === id)!.fields) {
      const value = field.key === 'path' ? settings.path?.trim() || 'tasks.md' : settings[field.key]?.trim();
      if (value) entries.push([field.key, field.key === 'labels'
        ? [...new Set(value.split(',').map(label => label.trim()).filter(Boolean))] : value]);
    }
    if (id === 'slack' && settings.mentioned) entries.push(['mentioned', true]);
    return [id, Object.fromEntries(entries)];
  }));
  return `// External sources supply Issue input; Markdown is read locally.
export type Issue = {
  source: string; title: string; body: string;
  labels: string[]; mentioned?: boolean;
  repository?: string; team?: string;
  workspace?: string; project?: string; channel?: string; path?: string;
};

// Every configured filter must match. Empty filters allow all items.
export const sourceFilters: Record<string,
  Record<string, string | string[] | boolean>> = ${JSON.stringify(rules, null, 2)};

export function matchesIssue(issue: Issue): boolean {
  if (!issue || typeof issue.source !== "string" ||
      typeof issue.title !== "string" || typeof issue.body !== "string" ||
      !Array.isArray(issue.labels) ||
      !issue.labels.every(label => typeof label === "string")) return false;
  if (!Object.hasOwn(sourceFilters, issue.source)) return false;
  const normalize = (value: string) => value.trim().toLowerCase();
  return Object.entries(sourceFilters[issue.source]).every(([key, value]) => {
    if (key === "labels") return (value as string[]).every(label =>
      issue.labels.map(normalize).includes(normalize(label)));
    if (key === "mentioned") return issue.mentioned === true;
    if (key === "contains") return normalize(issue.title + " " + issue.body)
      .includes(normalize(value as string));
    const actual = issue[key as keyof Issue];
    if (typeof actual !== "string") return false;
    if (key === "path") return actual === value;
    if (key === "channel") return normalize(actual).replace(/^#/, "") ===
      normalize(value as string).replace(/^#/, "");
    return normalize(actual) === normalize(value as string);
  });
}`;
}
