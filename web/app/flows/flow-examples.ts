export const flowExamples = [
  {
    "id": "software-factory",
    "label": "Software factory",
    "title": "Turn a ticket into a pull request.",
    "description": "Plan the change, write the code, and run the tests before opening a PR.",
    "filename": "software-factory.flow.ts",
    "code": "import { flow } from \"@relayflows/surface\";\n\ntype Input = {\n  repo: string;\n  ticket: string;\n};\n\nexport default flow<Input>(\n  \"software-factory\",\n  { budget: \"$5/run\" },\n  async (f, input) => {\n    await f.agent(\"planner\", {\n      task: `${input.ticket} Write a plan to plan.md.`,\n    }).gate((r) => r.artifacts.includes(\"plan.md\"));\n\n    await f.agent(\"implementer\", {\n      task: \"Read plan.md. Implement it on branch flow/fix. \" +\n        \"Write the PR description to summary.md.\",\n    }).gate((r) => r.artifacts.includes(\"summary.md\"));\n\n    // The tests run outside the agent.\n    // The agent cannot lie about the exit code.\n    await f.run(\"git checkout flow/fix && npm test\");\n\n    await f.agent(\"reviewer\", {\n      task: \"Review the diff against main. \" +\n        \"Write review.passed only if ready for a PR.\",\n    }).gate((r) => r.artifacts.includes(\"review.passed\"));\n\n    // Deterministic step, not an agent decision.\n    const [owner, repo] = input.repo.split(\"/\");\n    await f.github.createPullRequest({\n      owner, repo,\n      title: input.ticket,\n      head: \"flow/fix\",\n      base: \"main\",\n      body: await f.run(\"cat summary.md\"),\n    });\n    f.done(\"success\");\n  },\n);"
  },
  {
    "id": "pr-review",
    "label": "Code review",
    "title": "Give every PR a second opinion.",
    "description": "Review a diff for security, correctness, and performance in parallel. Then reconcile the findings.",
    "filename": "pr-review.flow.ts",
    "code": "import { flow } from \"@relayflows/surface\";\n\nexport default flow(\n  \"pr-review\",\n  { budget: \"$5/run\" },\n  async (f) => {\n    const diff = await f.run(\"git diff main...HEAD\");\n    const lenses = [\"security\", \"correctness\", \"performance\"];\n\n    await Promise.all(lenses.map((lens) =>\n      f.agent(`${lens}-reviewer`, {\n        task: `Review this diff for ${lens}: ${diff}. ` +\n          `Write findings to review/${lens}.md.`,\n        workspace: \"review/: readwrite\",\n      }).gate((r) =>\n        r.artifacts.includes(`review/${lens}.md`)\n      )\n    ));\n\n    // Resolve disagreements between reviewers.\n    await f.agent(\"reconciler\", {\n      task: \"Read the three reviews in review/. \" +\n        \"Resolve disagreements, flag unresolved issues, \" +\n        \"and write review/consensus.md.\",\n      workspace: \"review/: readwrite\",\n    }).gate((r) =>\n      r.artifacts.includes(\"review/consensus.md\")\n    );\n    f.done(\"success\");\n  },\n);"
  },
  {
    "id": "support-triage",
    "label": "Customer support",
    "title": "Draft the reply. Let a human decide.",
    "description": "Draft a response to a support thread, get approval, and reply in Slack.",
    "filename": "support-triage.flow.ts",
    "code": "import { flow } from \"@relayflows/surface\";\n\ntype Input = {\n  message: string;\n  channel: string;\n  threadTs: string;\n  approver: string;\n};\n\nexport default flow<Input>(\n  \"support-triage\",\n  { budget: \"$5/run\" },\n  async (f, input) => {\n    await f.agent(\"triage\", {\n      task: `Classify this request: ${input.message}. ` +\n        \"Write the category and urgency to triage.md.\",\n    }).gate((r) => r.artifacts.includes(\"triage.md\"));\n\n    await f.agent(\"writer\", {\n      task: `Read triage.md and draft a reply to: ` +\n        `${input.message}. Write only the reply to reply.md.`,\n    }).gate((r) => r.artifacts.includes(\"reply.md\"));\n\n    const reply = await f.run(\"cat reply.md\");\n    const approved = await f.human(\n      `Send this reply?\\n\\n${reply}`,\n      { to: input.approver },\n    );\n    if (!approved) return f.done(\"declined\");\n\n    // Send only after a human approves.\n    await f.slack.reply(input.channel, input.threadTs, reply);\n    f.done(\"success\");\n  },\n);"
  },
  {
    "id": "content-pipeline",
    "label": "Content publishing",
    "title": "Put a fact-check between draft and publish.",
    "description": "Research, draft, and check a post before a human approves sharing it in Slack.",
    "filename": "content-pipeline.flow.ts",
    "code": "import { flow } from \"@relayflows/surface\";\n\ntype Input = {\n  topic: string;\n  channel: string;\n  approver: string;\n};\n\nexport default flow<Input>(\n  \"content-pipeline\",\n  { budget: \"$5/run\" },\n  async (f, input) => {\n    await f.agent(\"researcher\", {\n      task: `Research ${input.topic}. Cite your sources. ` +\n        \"Write research.md.\",\n    }).gate((r) => r.artifacts.includes(\"research.md\"));\n\n    await f.agent(\"writer\", {\n      task: \"Use research.md to write post.md. \" +\n        \"Keep the source links with each claim.\",\n    }).gate((r) => r.artifacts.includes(\"post.md\"));\n\n    await f.agent(\"fact-checker\", {\n      task: \"Check post.md against its sources. \" +\n        \"Write checked.passed only if all claims hold up.\",\n    }).gate((r) => r.artifacts.includes(\"checked.passed\"));\n\n    const post = await f.run(\"cat post.md\");\n    const approved = await f.human(\n      `Publish this post?\\n\\n${post}`,\n      { to: input.approver },\n    );\n    if (!approved) return f.done(\"declined\");\n\n    await f.slack.post(input.channel, post);\n    f.done(\"success\");\n  },\n);"
  },
  {
    "id": "repo-migration",
    "label": "Repo migrations",
    "title": "Make the same change across repositories.",
    "description": "Apply a migration in each local checkout, test it, and open a PR.",
    "filename": "repo-migration.flow.ts",
    "code": "import { flow } from \"@relayflows/surface\";\n\ntype Input = {\n  repos: { path: string; slug: string }[];\n  instructions: string;\n};\n\nexport default flow<Input>(\n  \"repo-migration\",\n  { budget: \"$5/run\" },\n  async (f, input) => {\n    for (const repo of input.repos) {\n      // Quote the local checkout path for shell commands.\n      const dir = \"'\" + repo.path.replaceAll(\"'\", \"'\\\"'\\\"'\") + \"'\";\n\n      await f.agent(`migrate-${repo.slug}`, {\n        cwd: repo.path,\n        task: `${input.instructions} ` +\n          \"Use branch flow/migration and commit the change. \" +\n          \"Write migration.md with a summary.\",\n      }).gate((r) => r.artifacts.includes(\"migration.md\"));\n\n      await f.run(`cd ${dir} && npm test`);\n\n      await f.agent(`review-${repo.slug}`, {\n        cwd: repo.path,\n        task: \"Review this migration against main. \" +\n          \"Write review.passed only if it is ready.\",\n      }).gate((r) => r.artifacts.includes(\"review.passed\"));\n\n      // Each checkout opens its own pull request.\n      await f.run(\n        `cd ${dir} && gh pr create --base main ` +\n        '--head flow/migration --title \"Apply migration\" ' +\n        '--body-file migration.md'\n      );\n    }\n    f.done(\"success\");\n  },\n);"
  },
  {
    "id": "voicemail-follow-up",
    "label": "Voicemail follow-up",
    "title": "Turn a voicemail into a callback brief.",
    "description": "Use a transcript to prepare the callback, then send the approved brief to a teammate.",
    "filename": "voicemail-follow-up.flow.ts",
    "code": "import { flow } from \"@relayflows/surface\";\n\ntype Input = {\n  transcript: string;\n  approver: string;\n  callbackOwner: string;\n};\n\nexport default flow<Input>(\n  \"voicemail-follow-up\",\n  { budget: \"$5/run\" },\n  async (f, input) => {\n    await f.agent(\"triage\", {\n      task: `Read this voicemail: ${input.transcript}. ` +\n        \"Identify urgency and the caller's request. \" +\n        \"Write triage.md.\",\n    }).gate((r) => r.artifacts.includes(\"triage.md\"));\n\n    await f.agent(\"callback-writer\", {\n      task: \"Read triage.md. Prepare a callback brief \" +\n        \"with the questions we need to answer. \" +\n        \"Write callback.md.\",\n    }).gate((r) => r.artifacts.includes(\"callback.md\"));\n\n    const brief = await f.run(\"cat callback.md\");\n    const approved = await f.human(\n      `Ready for a callback?\\n\\n${brief}`,\n      { to: input.approver },\n    );\n    if (!approved) return f.done(\"declined\");\n\n    await f.slack.dm(input.callbackOwner, brief);\n    f.done(\"success\");\n  },\n);"
  },
  {
    "id": "research-report",
    "label": "Research reports",
    "title": "Bring independent research into one report.",
    "description": "Give researchers different angles, combine their findings, and ask another agent to check the citations.",
    "filename": "research-report.flow.ts",
    "code": "import { flow } from \"@relayflows/surface\";\n\ntype Input = {\n  question: string;\n};\n\nexport default flow<Input>(\n  \"research-report\",\n  { budget: \"$5/run\" },\n  async (f, input) => {\n    const angles = [\"technical\", \"commercial\", \"risks\"];\n\n    await Promise.all(angles.map((angle) =>\n      f.agent(`research-${angle}`, {\n        task: `Research ${input.question} from a ${angle} ` +\n          `angle. Cite sources in research/${angle}.md.`,\n        workspace: \"research/: readwrite\",\n      }).gate((r) =>\n        r.artifacts.includes(`research/${angle}.md`)\n      )\n    ));\n\n    await f.agent(\"editor\", {\n      task: \"Read research/*.md. Combine the findings, \" +\n        \"keep disagreements visible, and cite sources. \" +\n        \"Write report.md.\",\n    }).gate((r) => r.artifacts.includes(\"report.md\"));\n\n    await f.agent(\"citation-reviewer\", {\n      task: \"Open every source in report.md and check \" +\n        \"the claims it supports. Write citations.passed \" +\n        \"only when every citation checks out.\",\n    }).gate((r) => r.artifacts.includes(\"citations.passed\"));\n    f.done(\"success\");\n  },\n);"
  },
  {
    "id": "redacted-summary",
    "label": "Sensitive data",
    "title": "Choose what the summarizer gets to see.",
    "description": "Select the fields needed for the task before putting a record into the agent prompt.",
    "filename": "redacted-summary.flow.ts",
    "code": "import { flow } from \"@relayflows/surface\";\n\ntype Input = {\n  record: { category: string; status: string; email: string };\n  approver: string;\n};\n\nexport default flow<Input>(\n  \"redacted-summary\",\n  { budget: \"$5/run\" },\n  async (f, input) => {\n    // Select fields in code before building the prompt.\n    // The email address is excluded from this input.\n    const selected = {\n      category: input.record.category,\n      status: input.record.status,\n    };\n\n    await f.agent(\"summarizer\", {\n      task: `Summarize this record: ` +\n        `${JSON.stringify(selected)}. Write summary.md.`,\n    }).gate((r) => r.artifacts.includes(\"summary.md\"));\n\n    const summary = await f.run(\"cat summary.md\");\n    const approved = await f.human(\n      `Review this summary before sharing:\\n\\n${summary}`,\n      { to: input.approver },\n    );\n    if (!approved) return f.done(\"declined\");\n\n    f.done(\"success\");\n  },\n);"
  },
  {
    "id": "ci-repair",
    "label": "Fix failing CI",
    "title": "Give agents the failure. Get back a tested fix.",
    "description": "Reproduce a failing check, patch the code, and rerun the tests. Stop after three repair attempts if the checks still fail.",
    "filename": "ci-repair.flow.ts",
    "code": "import { flow } from \"@relayflows/surface\";\n\n// Run in a clean checkout on a repair branch.\nexport default flow(\"ci-repair\", async (f) => {\n  for (let attempt = 0; attempt <= 3; attempt++) {\n    // Capture failures as data so the loop can repair them.\n    const status = await f.run(\n      \"if npm test > ci.log 2>&1; then \" +\n      \"echo PASS; else echo FAIL; fi\"\n    );\n    if (status.trim() === \"PASS\") {\n      return f.done(\"success\");\n    }\n    if (attempt === 3) return f.done(\"step_failed\");\n\n    await f.agent(`repair-${attempt + 1}`, {\n      cli: \"codex\",\n      task: \"Read ci.log and reproduce the failure. \" +\n        \"Fix the implementation without weakening tests \" +\n        \"or changing the test command. Keep the patch small.\",\n    });\n    // The next iteration runs the same check again.\n  }\n});"
  },
  {
    "id": "issue-routing",
    "label": "Issue routing",
    "title": "Send each issue to the right specialist.",
    "description": "Route bugs to an implementer and documentation requests to a writer. Ask a human when the category is uncertain.",
    "filename": "issue-routing.flow.ts",
    "code": "import { flow } from \"@relayflows/surface\";\n\ntype Input = { issue: string; approver: string };\n\nexport default flow<Input>(\"issue-routing\", async (f, input) => {\n  const classification = await f.agent(\"router\", {\n    cli: \"claude\",\n    task: `Classify this issue: ${input.issue}. ` +\n      \"Return only bugfix, docs, or uncertain as your summary. \" +\n      \"Choose uncertain if the request is ambiguous.\",\n  });\n  let route = classification.summary.trim().toLowerCase();\n\n  // Unknown output never silently selects a specialist.\n  if (route !== \"bugfix\" && route !== \"docs\") {\n    const approved = await f.human(\n      `Needs manual triage: ${input.issue}\\n` +\n        \"Route this to the bugfix specialist?\",\n      { to: input.approver },\n    );\n    if (!approved) return f.done(\"declined\");\n    route = \"bugfix\";\n  }\n\n  if (route === \"bugfix\") {\n    await f.agent(\"implementer\", {\n      cli: \"codex\",\n      task: `Fix this issue and add regression coverage: ${input.issue}`,\n    });\n    await f.run(\"npm test\");\n  } else {\n    await f.agent(\"docs-writer\", {\n      cli: \"claude\",\n      task: `Update the documentation for: ${input.issue}. ` +\n        \"Check examples against the implementation.\",\n    });\n  }\n  f.done(\"success\");\n});"
  },
  {
    "id": "competing-implementations",
    "label": "Competing implementations",
    "title": "Try three approaches. Keep the one that passes.",
    "description": "Solve the same problem in separate worktrees, test every attempt, and select the fastest passing implementation.",
    "filename": "competing-implementations.flow.ts",
    "code": "import { flow } from \"@relayflows/surface\";\n\ntype Input = { task: string };\n\n// Each checkout needs its dependencies installed.\n// npm run benchmark --silent must emit { \"durationMs\": number }.\nexport default flow<Input>(\"competing-implementations\", async (f, input) => {\n  const contenders = [\"codex\", \"claude\", \"gemini\"];\n  await f.run(\"mkdir -p attempts\");\n  for (const cli of contenders) {\n    await f.run(`git worktree add --detach attempts/${cli} HEAD`);\n  }\n\n  await Promise.all(contenders.map((cli) =>\n    f.agent(`attempt-${cli}`, {\n      cli,\n      workspace: `attempts/${cli}/: readwrite`,\n      task: `Work only in attempts/${cli}. ${input.task}. ` +\n        \"Install dependencies and implement independently. \" +\n        \"Keep the existing tests and benchmark unchanged.\",\n    })\n  ));\n\n  // Run benchmarks sequentially to avoid resource contention.\n  const passing: { cli: string; durationMs: number }[] = [];\n  for (const cli of contenders) {\n    const output = await f.run(\n      `cd attempts/${cli} && ` +\n      \"if npm test > test.log 2>&1 && \" +\n      \"npm run benchmark --silent > benchmark.json; \" +\n      \"then cat benchmark.json; else echo null; fi\"\n    );\n    try {\n      const result = JSON.parse(output);\n      if (typeof result?.durationMs === \"number\" &&\n          Number.isFinite(result.durationMs) && result.durationMs >= 0) {\n        passing.push({ cli, durationMs: result.durationMs });\n      }\n    } catch { /* Invalid benchmark output cannot win. */ }\n  }\n  if (!passing.length) return f.done(\"step_failed\");\n\n  passing.sort((a, b) => a.durationMs - b.durationMs);\n  const winner = passing[0];\n  // Preserve all attempts; record the selected checkout.\n  await f.run(`echo attempts/${winner.cli} > winner.txt`);\n  f.done(\"success\");\n});"
  },
  {
    "id": "root-cause-investigation",
    "label": "Root-cause investigation",
    "title": "Turn competing theories into an evidence-backed diagnosis.",
    "description": "Investigate logs, recent changes, and dependencies in parallel. Challenge each theory and keep unresolved questions visible in the report.",
    "filename": "root-cause-investigation.flow.ts",
    "code": "import { flow } from \"@relayflows/surface\";\n\ntype Input = { incident: string };\n\n// Supply sanitized logs and a local reproduction environment.\nexport default flow<Input>(\"root-cause-investigation\", async (f, input) => {\n  const angles = [\"logs\", \"recent-changes\", \"dependencies\"];\n  await f.run(\"mkdir -p investigation\");\n\n  const hypotheses = await Promise.all(angles.map((angle) =>\n    f.agent(`investigate-${angle}`, {\n      task: `Investigate this incident through ${angle}: ` +\n        `${input.incident}. Use the local evidence. ` +\n        \"Do not change application code. Return a hypothesis, \" +\n        \"supporting evidence, and a way to disprove it.\",\n    })\n  ));\n\n  await Promise.all(hypotheses.map((hypothesis, i) =>\n    f.agent(`verify-${angles[i]}`, {\n      cli: \"codex\",\n      task: `Try to disprove this theory: ${hypothesis.summary}. ` +\n        \"Run focused checks in the local reproduction environment. \" +\n        \"Do not change application code. Record commands, actual \" +\n        \"results, and whether the theory is supported, rejected, \" +\n        `or unresolved in investigation/${angles[i]}.md.`,\n    }).gate((r) =>\n      r.artifacts.includes(`investigation/${angles[i]}.md`)\n    )\n  ));\n\n  await f.agent(\"incident-editor\", {\n    cli: \"claude\",\n    task: \"Read investigation/*.md. Write diagnosis.md with \" +\n      \"the strongest supported explanation and its evidence. \" +\n      \"Include rejected theories and unresolved questions. \" +\n      \"If no cause is supported, say so and propose the next check.\",\n  }).gate((r) => r.artifacts.includes(\"diagnosis.md\"));\n  // Success means the investigation report is ready.\n  f.done(\"success\");\n});"
  }
];
