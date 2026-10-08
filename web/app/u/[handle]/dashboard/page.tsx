import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { SiteFooter } from '../../../../components/SiteFooter';
import { SiteNav } from '../../../../components/SiteNav';
import {
  DASHBOARD_SESSION_COOKIE,
  dashboardPath,
  type DashboardWindow,
  fetchDashboardStats,
  type HandleStats,
  parseDashboardWindow,
} from '../../../../lib/agent-dashboard';
import { validRegistryHandle } from '../../../../lib/agent-registry';
import home from '../../../landing.module.css';
import flows from '../../../flows/flows.module.css';
import s from './dashboard.module.css';

// Reads a per-owner session cookie; never prerender or cache.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Agent dashboard',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

type PageProps = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const COLLECTION_NOTE =
  'Collection is server-side and started when analytics shipped; earlier traffic is not included.';

const OUTCOME_LABELS: Record<string, string> = {
  ok: 'Replied',
  timeout: 'Timed out',
  'rate-limited': 'Rate limited',
  error: 'Error',
  'delivery-failed': 'Delivery failed',
};

const numberFormat = new Intl.NumberFormat('en-US');

export default async function AgentDashboardPage({ params, searchParams }: PageProps) {
  const { handle } = await params;
  if (!validRegistryHandle(handle)) notFound();
  const selected = parseDashboardWindow((await searchParams).window);

  // The session stays on the server: it is only ever sent to the registry as a
  // Bearer token and never passed to a client component or rendered.
  const session = (await cookies()).get(DASHBOARD_SESSION_COOKIE)?.value;
  if (!session) return <Shell handle={handle}><ExpiredState handle={handle} /></Shell>;

  const [week, month] = await Promise.all([
    fetchDashboardStats(handle, session, 7),
    fetchDashboardStats(handle, session, 30),
  ]);
  if (week.kind === 'unauthorized' || month.kind === 'unauthorized') {
    return <Shell handle={handle}><ExpiredState handle={handle} /></Shell>;
  }
  if (week.kind !== 'ok' || month.kind !== 'ok') {
    return (
      <Shell handle={handle}>
        <p className={s.notice} role="status">
          Analytics are temporarily unavailable. Your dashboard link is still valid for a few minutes; reload to try
          again.
        </p>
      </Shell>
    );
  }

  const stats = selected === 30 ? month.stats : week.stats;
  return (
    <Shell handle={handle}>
      <WindowToggle handle={handle} selected={selected} />
      <Comparison week={week.stats} month={month.stats} />
      <WindowView stats={stats} />
    </Shell>
  );
}

function Shell({ handle, children }: { handle: string; children: ReactNode }) {
  return (
    <div className={`${flows.page} ${home.messagingPage} ${s.page}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteNav />
      <main id="main" className={s.main}>
        <header className={s.header}>
          <h1 className={s.headline}>Agent dashboard</h1>
          <p className={s.handle}>{handle}</p>
          <p className={s.note}>{COLLECTION_NOTE}</p>
        </header>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

function ExpiredState({ handle }: { handle: string }) {
  return (
    <div className={s.notice} role="status">
      <p>
        This dashboard link has expired or was already used. Ask your agent for a new one with{' '}
        <code>POST /api/v1/agents/{handle}/manage/dashboard-link</code>.
      </p>
    </div>
  );
}

function WindowToggle({ handle, selected }: { handle: string; selected: DashboardWindow }) {
  return (
    <nav className={s.toggle} aria-label="Time window">
      {([7, 30] as const).map((days) => (
        <a
          key={days}
          href={`${dashboardPath(handle)}?window=${days}`}
          aria-current={days === selected ? 'page' : undefined}
          className={days === selected ? s.toggleActive : undefined}
        >
          Last {days} days
        </a>
      ))}
    </nav>
  );
}

function Comparison({ week, month }: { week: HandleStats; month: HandleStats }) {
  const rows: Array<[string, (stats: HandleStats) => string]> = [
    ['Conversations', (x) => fmt(x.totals.conversations)],
    ['Visitor messages accepted', (x) => fmt(x.totals.visitorMessages)],
    ['Replies delivered', (x) => fmt(x.totals.repliesDelivered)],
    ['Visitor-days', (x) => fmt(x.totals.visitorDays)],
    ['Median reply latency', (x) => (x.latencyMs ? latency(x.latencyMs.p50) : '—')],
    ['p95 reply latency', (x) => (x.latencyMs ? latency(x.latencyMs.p95) : '—')],
  ];
  return (
    <section className={s.section} aria-labelledby="compare-heading">
      <h2 id="compare-heading" className={s.sectionHeading}>7 days and 30 days</h2>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col" className={s.num}>Last 7 days{week.estimated ? ' (estimated)' : ''}</th>
              <th scope="col" className={s.num}>Last 30 days{month.estimated ? ' (estimated)' : ''}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td className={s.num}>{value(week)}</td>
                <td className={s.num}>{value(month)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WindowView({ stats }: { stats: HandleStats }) {
  const { totals } = stats;
  const empty = totals.conversations === 0 && totals.visitorMessages === 0 && totals.guideFetches === 0
    && stats.daily.every((day) => day.conversations === 0 && day.dailyUniqueVisitors === 0);
  return (
    <section className={s.section} aria-labelledby="window-heading">
      <h2 id="window-heading" className={s.sectionHeading}>
        Last {stats.windowDays} days
        {stats.estimated && <span className={s.estimated}>estimated (sampled)</span>}
      </h2>
      <p className={s.generated}>
        Updated {formatTimestamp(stats.generatedAt)}. Days are UTC.
      </p>

      {empty ? (
        <div className={s.notice} role="status">
          <p>No traffic recorded in this window yet.</p>
          <p>{COLLECTION_NOTE}</p>
        </div>
      ) : (
        <>
          <dl className={s.tiles}>
            <Tile label="Conversations" value={fmt(totals.conversations)} />
            <Tile label="Visitor messages accepted" value={fmt(totals.visitorMessages)} />
            <Tile label="Replies delivered" value={fmt(totals.repliesDelivered)} />
            <Tile label="Median reply latency" value={stats.latencyMs ? latency(stats.latencyMs.p50) : '—'} />
            <Tile label="p95 reply latency" value={stats.latencyMs ? latency(stats.latencyMs.p95) : '—'} />
            <Tile label="Visitor-days" value={fmt(totals.visitorDays)} />
            <Tile label="Guide fetches" value={fmt(totals.guideFetches)} />
            <Tile label="Wait polls" value={fmt(totals.waitPolls)} />
          </dl>
          <p className={s.explain}>
            Visitors are counted once per day; the period total is the sum of daily visitors (visitor-days), not unique
            people.
          </p>

          <DailyTable stats={stats} />

          <div className={s.breakdowns}>
            <Breakdown title="Client mix" rows={stats.clients} />
            <Breakdown title="Top countries" rows={stats.countries} />
            <Breakdown title="Outcomes" rows={stats.outcomes} labels={OUTCOME_LABELS} />
          </div>
        </>
      )}
    </section>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.tile}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function DailyTable({ stats }: { stats: HandleStats }) {
  const max = Math.max(1, ...stats.daily.map((day) => day.conversations));
  return (
    <div className={s.block}>
      <h3 className={s.blockHeading}>Per UTC day</h3>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Conversations</th>
              <th scope="col" className={s.num}>Visitor messages</th>
              <th scope="col" className={s.num}>Replies delivered</th>
              <th scope="col" className={s.num}>Daily unique visitors</th>
            </tr>
          </thead>
          <tbody>
            {stats.daily.map((day) => (
              <tr key={day.day}>
                <th scope="row"><time dateTime={day.day}>{formatDay(day.day)}</time></th>
                <td>
                  <span className={s.barCell}>
                    <span className={s.bar} style={{ width: `${(day.conversations / max) * 100}%` }} aria-hidden="true" />
                    <span className={s.barValue}>{fmt(day.conversations)}</span>
                  </span>
                </td>
                <td className={s.num}>{fmt(day.visitorMessages)}</td>
                <td className={s.num}>{fmt(day.repliesDelivered)}</td>
                <td className={s.num}>{fmt(day.dailyUniqueVisitors)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Breakdown({ title, rows, labels }: {
  title: string;
  rows: Array<{ name: string; count: number }>;
  labels?: Record<string, string>;
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <div className={s.block}>
      <h3 className={s.blockHeading}>{title}</h3>
      {rows.length === 0 ? (
        <p className={s.muted}>None recorded.</p>
      ) : (
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col" className={s.num}>Count</th>
              <th scope="col" className={s.num}>Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <th scope="row">{labels?.[row.name] ?? row.name}</th>
                <td className={s.num}>{fmt(row.count)}</td>
                <td className={s.num}>{total ? `${Math.round((row.count / total) * 100)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function fmt(value: number): string {
  return numberFormat.format(value);
}

function latency(ms: number): string {
  return ms >= 1_000 ? `${(ms / 1_000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatTimestamp(iso: string): string {
  return `${new Date(iso).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}
