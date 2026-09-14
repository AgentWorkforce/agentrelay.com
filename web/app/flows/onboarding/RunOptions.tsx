'use client';

import { useState } from 'react';
import { ArrowRight, Cloud, Monitor, Download, Copy, Check } from 'lucide-react';
import Google from '@lobehub/icons/es/Google';
import { cloudConnectionsHref, type FactoryDraft } from '../../../lib/flow-onboarding';
import { LOCAL_INSTALL, LOCAL_RUN, localKitArchive } from '../../../lib/flow-local';
import type { FlowTrack } from '../../../lib/flow-analytics';
import s from './onboarding.module.css';

export function RunOptions({ draft, onTrack, getJourneyId, markOutcome, onNotice }: {
  draft: FactoryDraft; onTrack: FlowTrack; getJourneyId: () => string | undefined; markOutcome: (outcome: 'cloud_handoff' | 'local_kit_downloaded') => void; onNotice: (message: string) => void;
}) {
  const [destination, setDestination] = useState<'cloud' | 'local'>('cloud');
  const [copied, setCopied] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  function continueInCloud() {
    if (signingIn) return;
    setSigningIn(true);
    try {
      const handoffId = crypto.randomUUID();
      const href = cloudConnectionsHref(draft, handoffId, getJourneyId());
      onTrack('cloud_handoff_started', { handoff_id: handoffId, destination: 'cloud' });
      markOutcome('cloud_handoff');
      window.location.assign(href);
    } catch {
      setSigningIn(false);
      onTrack('handoff_failed', { error_code: 'cloud_navigation_failed', destination: 'cloud' });
      onNotice('Unable to open Cloud. Please try again.');
    }
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(text); onTrack('command_copied', { command: text === LOCAL_INSTALL ? 'install' : 'run', result: 'success' }); onNotice('Commands copied.'); }
    catch { onTrack('command_copied', { command: text === LOCAL_INSTALL ? 'install' : 'run', result: 'error', error_code: 'clipboard_unavailable' }); onNotice('Clipboard unavailable. The same commands are in START-HERE.txt in your kit.'); }
  }
  function downloadKit() {
    onTrack('local_kit_requested');
    try {
    const bytes = localKitArchive(draft);
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: 'application/zip' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'software-factory-local.zip'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    markOutcome('local_kit_downloaded');
    onTrack('local_kit_downloaded', { result: 'initiated' });
    onNotice('Local kit downloaded. Extract it into your repository and open START-HERE.txt.');
    } catch { onTrack('local_kit_failed', { error_code: 'archive_download_failed' }); onNotice('Unable to download your kit. Please try again.'); }
  }
  function command(text: string, label: string) {
    return <div className={s.localCommand}><pre><code>{text}</code></pre><button type="button" onClick={() => copy(text)} aria-label={`Copy ${label}`}>{copied === text ? <Check size={15} /> : <Copy size={15} />}</button></div>;
  }
  return <>
    <fieldset className={s.runChoices}>
      <legend className={s.visuallyHidden}>Where to run your flow</legend>
      {([{ id: 'cloud', title: 'In Cloud', detail: 'Sign in and connect your tools.', Icon: Cloud },
        { id: 'local', title: 'On your computer', detail: 'Use your local coding agents.', Icon: Monitor }] as const).map(({ id, title, detail, Icon }) =>
        <label key={id} className={`${s.runChoice} ${destination === id ? s.runChoiceSelected : ''}`}>
          <div><Icon size={20} aria-hidden="true" /><strong>{title}</strong><input type="radio" name="run-destination" value={id} checked={destination === id} onChange={() => { onTrack('destination_selected', { from: destination, destination: id }); setDestination(id); }} aria-label={title} /></div>
          <p>{detail}</p>
        </label>)}
    </fieldset>
    {destination === 'cloud' ? <div className={s.runDestination}>
      <button type="button" className={`${s.primary} ${s.runAction}`} onClick={continueInCloud} disabled={signingIn}><span className={s.googleMark}><Google.Color size={18} /></span> {signingIn ? 'Opening Cloud…' : 'Continue with Google'} <ArrowRight size={17} /></button>
      <p className={s.localKitNote}>Your flow comes with you. Connect your tools after signing in.</p>
    </div> : <div className={s.runDestination}>
      <button type="button" className={`${s.primary} ${s.runAction}`} onClick={downloadKit}><Download size={17} /> Download local kit</button>
      <p className={s.localKitNote}>Your flow, ticket input, and instructions. No Cloud account needed.</p>
      <ol className={s.localSteps}>
        <li><strong>Extract into your repository</strong><p>{draft.sources.includes('markdown') ? 'Write your task in your selected Markdown file.' : 'Add a real ticket to flow-input.json.'} Open a terminal in that repository.</p></li>
        <li><strong>Install the Flows CLI</strong>{command(LOCAL_INSTALL, 'install command')}</li>
        <li><strong>Check and run on a new branch</strong>{command(LOCAL_RUN, 'run commands')}</li>
      </ol>
      <details className={s.localRequirements} onToggle={event => onTrack('help_toggled', { section: 'local_requirements', open: event.currentTarget.open })}><summary>Requirements and local behavior</summary>
        <p>Node.js 22.18+, macOS (Apple silicon) or Linux (x64), your selected coding agents installed and signed in, and GitHub CLI authenticated. Start with a clean Git repository and a working <code>npm test</code> command.</p>
        <p>The local version uses a one-hour runtime limit, not a dollar cap. Your coding agent’s usage charges still apply. Every preset stops at “needs_human” for you to review and merge the PR in GitHub.</p>
        <p>In GitHub, require approving reviews and passing CI checks in your target branch’s rules. A repository administrator needs to configure these protections.</p>
        <p>This runs one ticket. Automatic triggers from your issue tracker require a separate connection.</p>
      </details>
    </div>}
  </>;
}
