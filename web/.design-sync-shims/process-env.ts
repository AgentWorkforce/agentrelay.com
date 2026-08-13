// The design-system bundle runs outside Next, which normally substitutes
// `process.env.*` at build time. `WaitlistForm` reads NEXT_PUBLIC_WAITLIST_API_URL
// at module scope, so without this the whole bundle throws on evaluation.
//
// Imported first from `.design-sync-entry.tsx` so it evaluates before any
// component module.
//
// Narrowed through a local alias rather than `declare global { var process }`:
// redeclaring the global collides with @types/node's full `Process` interface,
// and this shim only ever supplies `env`.

// Cast through `unknown`: @types/node already types `globalThis.process` as the
// full `Process`, and intersecting with it would demand the other 60+ members.
const globals = globalThis as unknown as {
  process?: { env: Record<string, string | undefined> };
};

globals.process ??= { env: {} };
globals.process.env ??= {};

export {};
