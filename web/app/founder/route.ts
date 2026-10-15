// Mirrors the router's /founder alias for direct Next.js and local dev
// requests: each visit lands on one founder's calendar, chosen at random, so
// inbound meeting requests split evenly between Will and Khaliq. The router
// serves this at the edge in production; keep the two destination lists in step.
const FOUNDER_CALENDAR_URLS = [
  'https://calendar.app.google/RqLuQyT3dYe5e2YdA',
  'https://calendly.com/khaliq-agent-relay/30min',
];

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const destination = new URL(
    FOUNDER_CALENDAR_URLS[Math.floor(Math.random() * FOUNDER_CALENDAR_URLS.length)],
  );
  new URL(request.url).searchParams.forEach((value, key) => {
    destination.searchParams.set(key, value);
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: destination.toString(),
      // Never cache: a cached 302 would pin every visitor to one calendar.
      'Cache-Control': 'no-store',
    },
  });
}
