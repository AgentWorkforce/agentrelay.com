import Link from 'next/link';

import { LogoIcon, LogoWordmark } from '../../../components/SiteNav';
import { type DesktopAsset, desktopAssetUrl } from '../../../lib/desktop-downloads';
import { RELAY_MARK_PATHS } from '../../../lib/relay-mark';
import { DownloadStatus } from './DownloadStatus';
import s from './mac-install-guide.module.css';

function AppIcon({ x, y, size = 68 }: { x: number; y: number; size?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 80})`}>
      <rect width="80" height="80" rx="19" fill="#173e58" stroke="#49738e" />
      <g transform="translate(13 18) scale(.48)" fill="#a4d7f5">
        <path d={RELAY_MARK_PATHS[0]} fillRule="evenodd" clipRule="evenodd" />
        <path d={RELAY_MARK_PATHS[1]} opacity=".5" />
      </g>
    </g>
  );
}

function Folder({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 15a7 7 0 0 1 7-7h22l9 9h39a7 7 0 0 1 7 7v43a7 7 0 0 1-7 7H7a7 7 0 0 1-7-7Z" fill="#629bbf" />
      <rect y="24" width="84" height="50" rx="7" fill="#8cbdd9" />
      <path d="m30 59 12-24 12 24M34 51h16" fill="none" stroke="#3e6e8c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function OpenIllustration({ file }: { file: string }) {
  return (
    <svg viewBox="0 0 360 230" aria-hidden="true" focusable="false">
      <rect x="29" y="35" width="302" height="178" rx="11" fill="#172735" stroke="#364957" />
      <path d="M29 70h302" stroke="#364957" />
      <g fill="#6e7e8b"><circle cx="46" cy="52" r="3" /><circle cx="57" cy="52" r="3" /><circle cx="68" cy="52" r="3" /></g>
      <text x="180" y="56" fill="#9eafbd" textAnchor="middle" fontSize="11">Downloads</text>
      <rect x="45" y="91" width="270" height="84" rx="8" fill="#22394a" stroke="#5884a1" />
      <path d="M64 111h22l9 9v33H64Z" fill="#c8dce8" /><path d="M86 111v9h9" fill="none" stroke="#7494a9" />
      <text x="109" y="125" fill="#edf4f8" fontSize="10" fontWeight="600">{file}</text>
      <text x="109" y="148" fill="#a5b8c8" fontSize="11">Disk image · Open to install</text>
      <path d="m268 163 2 33 8-9 11 4-21-28Z" fill="#eef6fc" stroke="#10212f" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function InstallIllustration() {
  return (
    <svg viewBox="0 0 360 230" aria-hidden="true" focusable="false">
      <rect x="28" y="35" width="304" height="178" rx="11" fill="#172735" stroke="#364957" />
      <path d="M28 70h304" stroke="#364957" />
      <g fill="#6e7e8b"><circle cx="45" cy="52" r="3" /><circle cx="56" cy="52" r="3" /><circle cx="67" cy="52" r="3" /></g>
      <text x="180" y="56" fill="#9eafbd" textAnchor="middle" fontSize="11">Agent Relay</text>
      <AppIcon x={57} y={94} />
      <rect x="220" y="85" width="94" height="109" rx="12" fill="none" stroke="#496376" strokeDasharray="5 5" />
      <Folder x={225} y={91} />
      <path d="M143 130h58m-7-7 7 7-7 7" stroke="#83b5d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="91" y="184" fill="#b8cad7" textAnchor="middle" fontSize="10">Agent Relay</text>
      <text x="267" y="184" fill="#b8cad7" textAnchor="middle" fontSize="10">Applications</text>
    </svg>
  );
}

function LaunchIllustration() {
  return (
    <svg viewBox="0 0 360 230" aria-hidden="true" focusable="false">
      <rect x="28" y="35" width="304" height="178" rx="11" fill="#172735" stroke="#364957" />
      <path d="M28 70h304M108 70v143" stroke="#364957" />
      <g fill="#6e7e8b"><circle cx="45" cy="52" r="3" /><circle cx="56" cy="52" r="3" /><circle cx="67" cy="52" r="3" /></g>
      <text x="180" y="56" fill="#9eafbd" textAnchor="middle" fontSize="11">Applications</text>
      <g stroke="#607d92" strokeWidth="4" strokeLinecap="round"><path d="M43 98h47M43 119h36M43 140h43" /></g>
      <rect x="130" y="83" width="105" height="115" rx="9" fill="#244359" />
      <AppIcon x={149} y={94} />
      <text x="183" y="184" fill="#e1eff8" textAnchor="middle" fontSize="11">Agent Relay</text>
      <path d="m214 150 2 33 8-9 11 4-21-28Z" fill="#eef6fc" stroke="#10212f" strokeWidth="2" strokeLinejoin="round" />
      <rect x="255" y="98" width="51" height="51" rx="12" fill="#293e4e" />
      <path d="M269 123h23m-12-12v24" stroke="#536f84" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function MacInstallGuide({ asset }: { asset: DesktopAsset }) {
  return (
    <div className={s.page}>
      <header className={s.header}>
        <Link href="/" className={s.brand} aria-label="Agent Relay home"><LogoIcon /><LogoWordmark /></Link>
        <Link href="/download" className={s.back}>All downloads <span aria-hidden="true">↗</span></Link>
      </header>
      <main id="main" className={s.main}>
        <div className={s.intro}>
          <div className={s.status}><DownloadStatus asset={asset} /></div>
          <h1>Install and open Agent Relay</h1>
          <p>You’re three steps away from connecting your agents.</p>
        </div>
        <ol className={s.steps} aria-label="Install Agent Relay on your Mac">
          <li><div className={s.illustration}><OpenIllustration file={asset.file} /></div><span className={s.number}>Step 1</span><h2>Open</h2><p>Open the downloaded <strong>.dmg</strong> file from your Downloads folder.</p></li>
          <li><div className={s.illustration}><InstallIllustration /></div><span className={s.number}>Step 2</span><h2>Install</h2><p>Drag Agent Relay into your <strong>Applications</strong> folder.</p></li>
          <li><div className={s.illustration}><LaunchIllustration /></div><span className={s.number}>Step 3</span><h2>Launch</h2><p>Open Agent Relay from <strong>Applications</strong>, then sign in to connect your agents.</p></li>
        </ol>
        <p className={s.fallback}>Didn’t start? <a href={desktopAssetUrl(asset.file)}>Download again</a><span aria-hidden="true"> · </span><Link href="/download#all-downloads">Other builds</Link></p>
      </main>
    </div>
  );
}
