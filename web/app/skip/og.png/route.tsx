import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

const size = { width: 1200, height: 630 };

const palette = {
  page: '#fbfbfa', paper: '#ffffff', ink: '#191919', muted: '#686868',
  line: '#dfe2e3', lineStrong: '#cfd2d3', accent: '#2E6794',
  terminal: '#102634', terminalLine: '#29485c',
};

const tasks = [
  { title: 'API pagination', agent: 'Claude Code', status: '12 tests passed', x: 18, y: 24, rotate: -5, scale: 1 },
  { title: 'Usage metering', agent: 'Codex', status: 'Checking aggregate totals', x: 318, y: 34, rotate: 4, scale: 1 },
  { title: 'Session migration', agent: 'Codex', status: '184 records migrated', x: 28, y: 386, rotate: 2, scale: 1 },
  { title: 'Passwordless login', agent: 'Claude Code', status: 'All checks passing', x: 318, y: 376, rotate: -4, scale: 1 },
  { title: 'Webhook retries', agent: 'Codex', status: 'Policy tests passing', x: 92, y: 96, rotate: 3, scale: 0.96 },
  { title: 'CI failures', agent: 'Claude Code', status: '18 tests passed', x: 248, y: 92, rotate: -1, scale: 0.95 },
  { title: 'Search indexing', agent: 'Claude Code', status: 'Reviewing memory profile', x: 102, y: 316, rotate: -6, scale: 0.93 },
  { title: 'Dependency audit', agent: 'Codex', status: 'No critical findings', x: 260, y: 310, rotate: 4, scale: 0.95 },
];

function AgentCard({ title, agent, status, x, y, rotate, scale }: (typeof tasks)[number]) {
  const isClaude = agent === 'Claude Code';

  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: 230, height: 142,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      border: `1px solid ${palette.terminalLine}`, borderRadius: 14,
      background: palette.terminal, boxShadow: '0 20px 48px rgba(24, 56, 76, .18)',
      transform: `rotate(${rotate}deg) scale(${scale})`,
    }}>
      <div style={{
        height: 52, display: 'flex', alignItems: 'center', padding: '0 16px',
        borderBottom: `1px solid ${palette.terminalLine}`,
      }}>
        <div style={{
          width: 25, height: 25, display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginRight: 10, borderRadius: 7, background: isClaude ? '#eee6df' : '#e7edf0',
          color: isClaude ? '#b85e42' : '#223946', fontSize: 13, fontWeight: 700,
        }}>
          {isClaude ? 'C' : 'O'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ display: 'flex', color: '#eef5f8', fontSize: 15, fontWeight: 600 }}>{title}</span>
          <span style={{ display: 'flex', marginTop: 2, color: '#91a9b8', fontSize: 11 }}>{agent}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '17px 16px', color: '#91a9b8', fontSize: 12 }}>
        <span style={{ display: 'flex' }}><b style={{ color: '#77a5bf', marginRight: 8 }}>&gt;</b> Read project context</span>
        <span style={{ display: 'flex', marginTop: 10, color: '#dce9ef' }}><b style={{ color: '#8fc2df', marginRight: 8 }}>›</b> {status}</span>
      </div>
    </div>
  );
}

export async function GET() {
  const avatarFile = await readFile(join(process.cwd(), 'public/skip-assets/skip-avatar.png'));
  const avatar = avatarFile.buffer.slice(avatarFile.byteOffset, avatarFile.byteOffset + avatarFile.byteLength);

  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden',
      background: palette.page, color: palette.ink, fontFamily: 'sans-serif',
    }}>
      <div style={{ position: 'absolute', left: 34, top: 0, width: 1, height: '100%', display: 'flex', background: palette.line }} />
      <div style={{ position: 'absolute', right: 34, top: 0, width: 1, height: '100%', display: 'flex', background: palette.line }} />
      <div style={{ position: 'absolute', left: 0, top: 34, width: '100%', height: 1, display: 'flex', background: palette.line }} />
      <div style={{ position: 'absolute', left: 0, bottom: 34, width: '100%', height: 1, display: 'flex', background: palette.line }} />

      <div style={{
        width: 630, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        paddingLeft: 82, position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 42 }}>
          <img alt="" src={avatar as unknown as string} width={52} height={52} style={{ border: `1px solid ${palette.lineStrong}`, borderRadius: 999, background: '#edf4f8' }} />
          <span style={{ display: 'flex', marginLeft: 13, fontSize: 30, fontWeight: 600, letterSpacing: '-0.045em' }}>skip</span>
        </div>
        <div style={{
          display: 'flex', maxWidth: 540, fontSize: 72, fontWeight: 400,
          lineHeight: 0.96, letterSpacing: '-0.065em',
        }}>
          Give your coding agents a manager.
        </div>
        <div style={{ display: 'flex', maxWidth: 490, marginTop: 27, color: palette.muted, fontSize: 23, lineHeight: 1.42 }}>
          Skip keeps every session moving, coordinated and on track.
        </div>
      </div>

      <div style={{
        position: 'absolute', right: 0, bottom: 0, width: 570, height: 566,
        display: 'flex', overflow: 'hidden', borderTopLeftRadius: 30,
        borderTop: `1px solid ${palette.line}`, borderLeft: `1px solid ${palette.line}`,
        background: 'linear-gradient(145deg, #edf4f8 0%, #f7f8f7 48%, #e8f0f4 100%)',
      }}>
        <div style={{ position: 'absolute', left: 50, top: 42, width: 470, height: 470, display: 'flex', borderRadius: 999, background: 'rgba(46,103,148,.11)' }} />
        {tasks.map((task) => <AgentCard key={task.title} {...task} />)}

        <div style={{
          position: 'absolute', left: 62, top: 227, width: 446, height: 112,
          display: 'flex', alignItems: 'center', padding: '0 22px',
          border: `1px solid ${palette.lineStrong}`, borderRadius: 15, background: palette.paper,
          boxShadow: '0 22px 55px rgba(43, 80, 103, .19)',
        }}>
          <img alt="" src={avatar as unknown as string} width={66} height={66} style={{ border: `1px solid ${palette.lineStrong}`, borderRadius: 999, background: '#edf4f8' }} />
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 16 }}>
            <span style={{ display: 'flex', color: palette.accent, fontSize: 13, fontWeight: 600 }}>Skip is coordinating</span>
            <span style={{ display: 'flex', marginTop: 4, fontSize: 22, fontWeight: 600, letterSpacing: '-0.035em' }}>Eight agents working.</span>
            <span style={{ display: 'flex', marginTop: 4, color: palette.muted, fontSize: 12 }}>I’ll let you know when they need you.</span>
          </div>
          <div style={{
            width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginLeft: 'auto', borderRadius: 9, background: palette.accent, color: '#f8fbfd', fontSize: 23,
          }}>→</div>
        </div>
      </div>
    </div>,
    size,
  );
}
