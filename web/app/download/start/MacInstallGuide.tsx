import Link from 'next/link';

import { LogoIcon, LogoWordmark } from '../../../components/SiteNav';
import { type DesktopAsset, desktopAssetUrl } from '../../../lib/desktop-downloads';
import { RELAY_MARK_PATHS } from '../../../lib/relay-mark';
import { DownloadStatus } from './DownloadStatus';
import s from './mac-install-guide.module.css';

/* The scenes use the macOS system font and shared, full-size Finder controls. */
function MacScene({ kind, file }: { kind: 'open' | 'install' | 'launch'; file?: string }) {
  const id = `mac-${kind}`;
  return (
    <svg viewBox="0 0 400 280" aria-hidden="true" focusable="false" fontFamily="-apple-system, BlinkMacSystemFont, Helvetica Neue, sans-serif">
      <defs>
        <linearGradient id={`${id}-paper`} x2="0" y2="1"><stop stopColor="#fff" /><stop offset="1" stopColor="#e9ebee" /></linearGradient>
        <linearGradient id={`${id}-disk`} x2="0" y2="1"><stop stopColor="#e4e8eb" /><stop offset=".5" stopColor="#adb6bf" /><stop offset="1" stopColor="#e3e7eb" /></linearGradient>
        <linearGradient id={`${id}-folder`} x2="0" y2="1"><stop stopColor="#80dcfc" /><stop offset="1" stopColor="#28a9e7" /></linearGradient>
        <linearGradient id={`${id}-app`} x2="0" y2="1"><stop stopColor="#203e58" /><stop offset="1" stopColor="#0c1d2b" /></linearGradient>
        <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dy="7" stdDeviation="8" floodColor="#233446" floodOpacity=".19" /></filter>
        <filter id={`${id}-icon-shadow`} x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dy="2" stdDeviation="1.5" floodOpacity=".22" /></filter>
      </defs>
      <rect width="400" height="280" fill="#e4ecf1" />
      <g filter={`url(#${id}-shadow)`}>
        <rect x="19" y="28" width="362" height="225" rx="10" fill="#fff" stroke="#b9c0c6" />
        <path d="M29 28h342a10 10 0 0 1 10 10v35H19V38a10 10 0 0 1 10-10Z" fill="#f1f0f0" />
        <path d="M19 73h362" stroke="#d7d7d7" />
        <circle cx="36" cy="50" r="5.5" fill="#ff5f57" stroke="#e44942" strokeWidth=".6" />
        <circle cx="54" cy="50" r="5.5" fill="#febc2e" stroke="#dfa125" strokeWidth=".6" />
        <circle cx="72" cy="50" r="5.5" fill="#28c840" stroke="#1eab32" strokeWidth=".6" />
        <text x="220" y="55" textAnchor="middle" fontSize="14" fontWeight="600" fill="#343434">{kind === 'open' ? 'Downloads' : kind === 'install' ? 'Agent Relay' : 'Applications'}</text>
      </g>
      {kind === 'open' ? (
        <>
          <g transform="translate(166 91)" filter={`url(#${id}-icon-shadow)`}>
            <path d="M0 0h44l23 23v83H0Z" fill={`url(#${id}-paper)`} stroke="#c8cbd0" />
            <path d="M44 0v23h23" fill="#e4e6e9" stroke="#c8cbd0" />
            <rect x="9" y="46" width="48" height="47" rx="4" fill={`url(#${id}-disk)`} stroke="#909aa4" />
            <path d="M14 51h38v29H14Z" fill="#d5dade" stroke="#9da7ae" />
            <ellipse cx="33" cy="65" rx="12" ry="10" fill="#bbc3c9" stroke="#a5aeb5" />
            <circle cx="33" cy="65" r="3" fill="#dfe3e6" />
            <path d="M13 87h31" stroke="#74818d" strokeWidth="3" /><circle cx="50" cy="87" r="1.5" fill="#5f9c54" />
          </g>
          <rect x="105" y="205" width="190" height="23" rx="5" fill="#2764ce" />
          <text x="200" y="221" textAnchor="middle" fill="#fff" fontSize="12.5" fontWeight="500">{file && file.length < 29 ? file : 'Agent Relay.dmg'}</text>
          <Cursor x={227} y={175} />
        </>
      ) : (
        <>
          {kind === 'launch' && <><rect x="20" y="74" width="91" height="168" fill="#f0f1f3" /><text x="31" y="98" fill="#81858a" fontSize="10" fontWeight="600">Favorites</text><rect x="26" y="108" width="79" height="25" rx="5" fill="#d9dee5" /><text x="33" y="125" fill="#3e454e" fontSize="11">Applications</text><text x="33" y="153" fill="#656b72" fontSize="11">Downloads</text></>}
          <g transform={`translate(${kind === 'install' ? 70 : 190} 108)`}>
            {kind === 'launch' && <rect x="-14" y="-14" width="106" height="105" rx="6" fill="#e5e5e7" />}
            <rect width="76" height="76" rx="17" fill={`url(#${id}-app)`} stroke="#4c6172" filter={`url(#${id}-icon-shadow)`} />
            <path d="M17 2h42" stroke="#ffffff" strokeOpacity=".25" strokeLinecap="round" />
            <g transform="translate(12 17) scale(.46)" fill="#85c5ec"><path d={RELAY_MARK_PATHS[0]} fillRule="evenodd" clipRule="evenodd" /><path d={RELAY_MARK_PATHS[1]} opacity=".5" /></g>
            {kind === 'launch' && <rect x="-7" y="93" width="90" height="22" rx="4" fill="#2764ce" />}
            <text x="38" y="108" textAnchor="middle" fontSize="13" fill={kind === 'launch' ? '#fff' : '#333'}>Agent Relay</text>
          </g>
          {kind === 'install' ? <>
            <path d="M171 148h43m-10-10 10 10-10 10" fill="none" stroke="#a1a7ad" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <g transform="translate(246 108)" filter={`url(#${id}-icon-shadow)`}>
              <path d="M0 13a5 5 0 0 1 5-5h24l8 8h44a5 5 0 0 1 5 5v47H0Z" fill="#28a8e4" stroke="#1e99d3" />
              <path d="M0 27a5 5 0 0 1 5-5h76a5 5 0 0 1 5 5v43a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5Z" fill={`url(#${id}-folder)`} stroke="#41b9ed" />
              <path d="M5 24h76" stroke="#c5f1ff" strokeOpacity=".8" />
              <g stroke="#1188c3" strokeWidth="4" strokeLinecap="round"><path d="m33 38 18 29M49 38 31 67M27 59h30" /><path d="m34 36 18 29M50 36 32 65M28 57h30" stroke="#a8e6fd" strokeOpacity=".5" strokeWidth="1" /></g>
            </g>
            <text x="289" y="216" textAnchor="middle" fontSize="13" fill="#333">Applications</text>
            <Cursor x={125} y={165} />
          </> : <Cursor x={246} y={166} />}
        </>
      )}
    </svg>
  );
}

function Cursor({ x, y }: { x: number; y: number }) {
  return <path transform={`translate(${x} ${y})`} d="M0 0v31l8-8 6 14 6-3-6-13h12Z" fill="#181818" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />;
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
          <li><div className={s.illustration}><MacScene kind="open" file={asset.file} /></div><span className={s.number}>Step 1</span><h2>Open</h2><p>Open the downloaded <strong>.dmg</strong> file from your Downloads folder.</p></li>
          <li><div className={s.illustration}><MacScene kind="install" /></div><span className={s.number}>Step 2</span><h2>Install</h2><p>Drag Agent Relay into your <strong>Applications</strong> folder.</p></li>
          <li><div className={s.illustration}><MacScene kind="launch" /></div><span className={s.number}>Step 3</span><h2>Launch</h2><p>Open Agent Relay from <strong>Applications</strong>, then sign in to connect your agents.</p></li>
        </ol>
        <p className={s.fallback}>Didn’t start? <a href={desktopAssetUrl(asset.file)}>Download again</a><span aria-hidden="true"> · </span><Link href="/download#all-downloads">Other builds</Link></p>
      </main>
    </div>
  );
}
