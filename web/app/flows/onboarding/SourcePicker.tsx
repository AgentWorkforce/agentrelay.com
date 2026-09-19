'use client';

import { useState } from 'react';
import { ListFilter, ChevronDown } from 'lucide-react';
import { SiGithub, SiGitlab, SiLinear, SiShortcut, SiJira, SiMarkdown } from 'react-icons/si';
import { ISSUE_SOURCES, sourceLabel, type IssueSourceId, type SourceSettings } from '../../../lib/flow-sources';
import type { FactoryDraft } from '../../../lib/flow-onboarding';
import type { FlowTrack } from '../../../lib/flow-analytics';
import s from './onboarding.module.css';

export function SourceIcon({ id }: { id: IssueSourceId }) {
  if (id === 'slack') return <span className={s.sourceIcon}><img src="/integration-logos/slack.svg" alt="" className={s.slackLogo} width={35} height={35} /></span>;
  const Icon = { github: SiGithub, gitlab: SiGitlab, linear: SiLinear, shortcut: SiShortcut, jira: SiJira, markdown: SiMarkdown }[id];
  return <Icon className={`${s.sourceIcon} ${s[`source_${id}`]}`} aria-hidden="true" />;
}

export function SourcePicker({ draft, onChange, onTrack }: { draft: FactoryDraft; onChange: (draft: FactoryDraft) => void; onTrack: FlowTrack }) {
  const [active, setActive] = useState<IssueSourceId | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const activeId = active && draft.sources.includes(active) ? active : draft.sources[0];
  const source = ISSUE_SOURCES.find(item => item.id === activeId);
  const settings = activeId ? draft.sourceSettings[activeId] ?? {} : {};

  function toggle(id: IssueSourceId) {
    const selected = draft.sources.includes(id);
    onChange({ ...draft, sources: selected ? draft.sources.filter(value => value !== id) : [...draft.sources, id] });
    if (!selected) { setActive(id); setFiltersOpen(true); }
  }

  function update(changes: SourceSettings) {
    if (activeId) onChange({ ...draft, sourceSettings: { ...draft.sourceSettings, [activeId]: { ...settings, ...changes } } });
  }

  return <>
    <fieldset className={s.agentGroup}>
      <legend>Select all you use</legend>
      <div className={s.sourceCards}>{ISSUE_SOURCES.map(item =>
        <label key={item.id} className={`${s.agent} ${s.sourceOption} ${draft.sources.includes(item.id) ? s.agentSelected : ''}`}>
          <SourceIcon id={item.id} /><span>{item.label}</span>
          <input type="checkbox" aria-label={item.label} checked={draft.sources.includes(item.id)} onChange={() => toggle(item.id)} />
        </label>
      )}</div>
    </fieldset>
    {source && <details className={s.sourceSettings} open={filtersOpen} onToggle={event => {
      setFiltersOpen(event.currentTarget.open);
    }}>
      <summary className={s.filterSummary} onClick={event => {
        event.preventDefault();
        const open = !event.currentTarget.parentElement!.hasAttribute('open');
        setFiltersOpen(open);
        onTrack('help_toggled', { section: 'source_filters', open, source: source.id });
      }}>
        <ListFilter size={17} aria-hidden="true" />
        <span>{draft.sources.length > 1 ? 'Source filters and settings' : source.id === 'markdown' ? 'Markdown file settings' : `${source.label} filters`}</span>
        <small>Optional</small><ChevronDown size={16} className={s.filterChevron} aria-hidden="true" />
      </summary>
      <div className={s.filterContent}>
      {draft.sources.length > 1 && <div className={s.sourceTabs} aria-label="Choose a source to configure">
        {draft.sources.map(id => <button type="button" key={id} aria-pressed={id === activeId} onClick={() => { onTrack('source_settings_viewed', { source: id }); setActive(id); }}><SourceIcon id={id} />{sourceLabel(id)}</button>)}
      </div>}
      {draft.sources.length > 1 && <h2>{source.label}{source.id !== 'markdown' && ' filters'}</h2>}
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
      {source.id === 'markdown' && <p className={s.sourceNote}>Uses tasks.md if left blank. Your file stays in your repository. Local runs only: Cloud cannot listen to a file.{draft.sources.length > 1 && ' Your other source prefills the ticket; the Markdown file is the fallback.'}</p>}
      </div>
    </details>}
  </>;
}
