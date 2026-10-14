'use client';

import { useState } from 'react';

import s from './home-8.module.css';

const STAGES = [
  {
    name: 'Messages',
    clause: 'Send a message from code',
    file: 'lead.ts',
    code: `import { AgentRelay } from "@agent-relay/sdk";

const relay = new AgentRelay({ channels: ["billing"] });
const lead = relay.human({ name: "Lead" });

await lead.sendMessage({
  to: "codex",
  text: "Migration merged. Rebase before billing.",
});`,
  },
  {
    name: 'MCP',
    clause: 'Hand any agent the relay tools',
    file: 'agent-relay · MCP server',
    code: `agent-relay
  search_shared_sessions
    Find teammates’ sessions by intent
  get_shared_session_context
    Pull one session’s context into yours`,
  },
  {
    name: 'Workflows',
    clause: 'Run workflows that survive restarts',
    file: 'ci-repair.ts',
    code: `import { flow } from "@relayflows/surface";

export default flow("ci-repair", async (f) => {
  for (let attempt = 0; attempt <= 3; attempt++) {
    const status = await f.run("npm test && echo PASS");
    if (status.trim() === "PASS") return f.done("success");
    await f.agent(\`repair-\${attempt + 1}\`, {
      cli: "codex",
      task: "Read the failure and fix it. Keep the patch small.",
    });
  }
});`,
  },
  {
    name: 'Files',
    clause: 'Give every agent the same files',
    file: 'mount.ts',
    code: `import { RelayfileSetup } from "@relayfile/sdk";

const setup = new RelayfileSetup({
  accessToken: process.env.RELAYFILE_ACCESS_TOKEN!,
});

await setup.ensureMountedWorkspace({
  workspaceId: "rw_123",
  provider: "notion",
  localDir: "/workspace/relayfile",
});`,
  },
];

export function DevStages() {
  const [i, setI] = useState(0);
  const stage = STAGES[i];

  return (
    <div className={s.dev}>
      <div className={s.devText}>
        <h2 className={s.devHeading}>Build on the same relay</h2>
        <p className={s.devClause} aria-live="polite" key={stage.clause}>
          {stage.clause}
        </p>
        <p className={s.devNote}>
          The SDK, the MCP server, durable workflows and a shared filesystem, all on one relay. Agents from other
          frameworks connect over A2A.
        </p>
      </div>
      <div className={s.devCode}>
        <figure className={s.codeUi} data-ui key={stage.name}>
          <figcaption className={s.codeFile}>{stage.file}</figcaption>
          <pre>
            <code>{stage.code}</code>
          </pre>
        </figure>
      </div>
      <div className={s.devRail}>
        <div className={s.railTrack} style={{ ['--f' as string]: i / (STAGES.length - 1) }}>
          <span className={s.railFill} aria-hidden="true" />
          <input
            type="range"
            min={0}
            max={STAGES.length - 1}
            step={1}
            value={i}
            onChange={(e) => setI(Number(e.target.value))}
            aria-label="Developer surface"
            aria-valuetext={stage.name}
            className={s.range}
          />
        </div>
        <ol className={s.stops}>
          {STAGES.map((st, n) => (
            <li key={st.name}>
              <button type="button" aria-current={n === i} onClick={() => setI(n)}>
                {st.name}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
