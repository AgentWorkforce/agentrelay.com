'use client';

import { useState } from 'react';
import { SiGithub, SiLinear, SiShortcut, SiJira, SiMarkdown } from 'react-icons/si';
import { ISSUE_SOURCES, sourceLabel, type IssueSourceId, type SourceSettings } from '../../../lib/flow-sources';
import type { FactoryDraft } from '../../../lib/flow-onboarding';
import s from './onboarding.module.css';

export function SourceIcon({ id }: { id: IssueSourceId }) {
  if (id === 'slack') return <span className={s.sourceIcon}><img src="/integration-logos/slack.svg" alt="" className={s.slackLogo} width={35} height={35} /></span>;
  const Icon = { github: SiGithub, linear: SiLinear, shortcut: SiShortcut, jira: SiJira, markdown: SiMarkdown }[id];
  return <Icon className={`${s.sourceIcon} ${s[`source_${id}`]}`} aria-hidden="true" />;
}

export function SourcePicker({ draft, onChange }: { draft: FactoryDraft; onChange: (draft: FactoryDraft) => void }) {
  const [active, setActive] = useState<IssueSourceId | null>(null);
  const activeId = active && draft.sources.includes(active) ? active : draft.sources[0];
  const source = ISSUE_SOURCES.find(item => item.id === activeId);
  const settings = activeId ? draft.sourceSettings[activeId] ?? {} : {};

  function toggle(id: IssueSourceId) {
    const selected = draft.sources.includes(id);
    onChange({ ...draft, sources: selected ? draft.sources.filter(value => value !== id) : [...draft.sources, id] });
    if (!selected) setActive(id);
  }

  function update(changes: SourceSettings) {
    if (activeId) onChange({ ...draft, sourceSettings: { ...draft.sourceSettings, [activeId]: { ...settings, ...changes } } });
  }

  return <>
    <fieldset className={s.agentGroup}>
      <legend>Select all you use</legend>
      <div className={s.sourceCards}>{ISSUE_SOURCES.map(item =>
        <label key={item.id} className={`${s.agent} ${s.sourceOption} ${draft.sources.includes(item.id) ? s.agentSelected : ''}`}>
          <SourceIcon id={item.id} /><span>{item.label}{item.id === 'markdown' && <small>No integration</small>}</span>
          <input type="checkbox" aria-label={item.label} checked={draft.sources.includes(item.id)} onChange={() => toggle(item.id)} />
        </label>
      )}</div>
    </fieldset>
    {source && <section className={s.sourceSettings} aria-label={`${source.label} filters`}>
      {draft.sources.length > 1 && <div className={s.sourceTabs} aria-label="Choose a source to configure">
        {draft.sources.map(id => <button type="button" key={id} aria-pressed={id === activeId} onClick={() => setActive(id)}><SourceIcon id={id} />{sourceLabel(id)}</button>)}
      </div>}
      <h2>{source.label}{source.id !== 'markdown' && <> filters <span>Optional</span></>}</h2>
      <p>{source.id === 'markdown' ? 'Write your task in a Markdown file in your repository. The flow reads it when you run it—no issue tracker to connect.' : <>{source.id === 'slack' ? 'Choose which messages become work for your agents.' : 'Choose which tickets reach your agents.'} Leave a field blank to include all.</>}</p>
      <div className={s.filterFields}>
        {source.fields.map(field => <div key={`${source.id}-${field.key}`}>
          <label htmlFor={`source-${source.id}-${field.key}`}>{field.label}</label>
          <input id={`source-${source.id}-${field.key}`} type="text" maxLength={200} placeholder={field.placeholder} value={settings[field.key] ?? ''}
            onChange={event => update({ [field.key]: event.target.value })}
            aria-describedby={field.key === 'labels' ? 'source-labels-help' : undefined} />
          {field.key === 'labels' && <small id="source-labels-help">Separate with commas. Every label must match.</small>}
        </div>)}
      </div>
      {source.id === 'slack' && <label className={s.mentionFilter}>
        <input type="checkbox" checked={settings.mentioned ?? false} onChange={event => update({ mentioned: event.target.checked })} />
        Only when the app is mentioned
      </label>}
      <p className={s.sourceNote}>{source.id === 'markdown' ? 'Uses tasks.md if left blank. Your file stays in your repository.' : `Your filters are saved. You’ll connect ${source.label} after building your flow.`}</p>
    </section>}
  </>;
}
