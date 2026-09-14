export const flowExamples = [
  {
    "id": "software-factory",
    "label": "Software factory",
    "title": "Turn a ticket into a pull request.",
    "description": "Plan the change, write the code, and run the tests before opening a PR.",
    "filename": "software-factory.flow.ts",
    "code": "import { flow } from \"@relayflows/surface\";\n\ntype Input = {\n  repo: string;\n  ticket: string;\n};\n\nexport default flow<Input>(\n  \"software-factory\",\n  { budget: \"$5/run\" },\n  async (f, input) => {\n    await f.agent(\"planner\", {\n      task: `${input.ticket} Write a plan to plan.md.`,\n    }).gate((r) => r.artifacts.includes(\"plan.md\"));\n\n    await f.agent(\"implementer\", {\n      task: \"Read plan.md. Implement it on branch flow/fix. \" +\n        \"Write the PR description to summary.md.\",\n    }).gate((r) => r.artifacts.includes(\"summary.md\"));\n\n    // The tests run outside the agent.\n    // The agent cannot lie about the exit code.\n    await f.run(\"git checkout flow/fix && npm test\");\n\n    await f.agent(\"reviewer\", {\n      task: \"Review the diff against main. \" +\n        \"Write review.passed only if ready for a PR.\",\n    }).gate((r) => r.artifacts.includes(\"review.passed\"));\n\n    // Deterministic step, not an agent decision.\n    await f.github.createPullRequest({\n      repo: input.repo,\n      head: \"flow/fix\",\n      base: \"main\",\n      bodyPath: \"summary.md\",\n    });\n    f.done(\"success\");\n  },\n);"
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
    "code": "import { flow } from \"@relayflows/surface\";\n\ntype Input = {\n  message: string;\n  channel: string;\n  threadTs: string;\n  approver: string;\n};\n\nexport default flow<Input>(\n  \"support-triage\",\n  { budget: \"$5/run\" },\n  async (f, input) => {\n    await f.agent(\"triage\", {\n      task: `Classify this request: ${input.message}. ` +\n        \"Write the category and urgency to triage.md.\",\n    }).gate((r) => r.artifacts.includes(\"triage.md\"));\n\n    await f.agent(\"writer\", {\n      task: `Read triage.md and draft a reply to: ` +\n        `${input.message}. Write only the reply to reply.md.`,\n    }).gate((r) => r.artifacts.includes(\"reply.md\"));\n\n    const reply = await f.run(\"cat reply.md\");\n    const approved = await f.human(\n      `Send this reply?\\n\\n${reply}`,\n      { to: input.approver },\n    );\n    if (!approved) return f.done(\"canceled\");\n\n    // Send only after a human approves.\n    await f.slack.reply(input.channel, input.threadTs, reply);\n    f.done(\"success\");\n  },\n);"
  },
  {
    "id": "content-pipeline",
    "label": "Content publishing",
    "title": "Put a fact-check between draft and publish.",
    "description": "Research, draft, and check a post before a human approves sharing it in Slack.",
    "filename": "content-pipeline.flow.ts",
    "code": "import { flow } from \"@relayflows/surface\";\n\ntype Input = {\n  topic: string;\n  channel: string;\n  approver: string;\n};\n\nexport default flow<Input>(\n  \"content-pipeline\",\n  { budget: \"$5/run\" },\n  async (f, input) => {\n    await f.agent(\"researcher\", {\n      task: `Research ${input.topic}. Cite your sources. ` +\n        \"Write research.md.\",\n    }).gate((r) => r.artifacts.includes(\"research.md\"));\n\n    await f.agent(\"writer\", {\n      task: \"Use research.md to write post.md. \" +\n        \"Keep the source links with each claim.\",\n    }).gate((r) => r.artifacts.includes(\"post.md\"));\n\n    await f.agent(\"fact-checker\", {\n      task: \"Check post.md against its sources. \" +\n        \"Write checked.passed only if all claims hold up.\",\n    }).gate((r) => r.artifacts.includes(\"checked.passed\"));\n\n    const post = await f.run(\"cat post.md\");\n    const approved = await f.human(\n      `Publish this post?\\n\\n${post}`,\n      { to: input.approver },\n    );\n    if (!approved) return f.done(\"canceled\");\n\n    await f.slack.post(input.channel, post);\n    f.done(\"success\");\n  },\n);"
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
    "code": "import { flow } from \"@relayflows/surface\";\n\ntype Input = {\n  transcript: string;\n  approver: string;\n  callbackOwner: string;\n};\n\nexport default flow<Input>(\n  \"voicemail-follow-up\",\n  { budget: \"$5/run\" },\n  async (f, input) => {\n    await f.agent(\"triage\", {\n      task: `Read this voicemail: ${input.transcript}. ` +\n        \"Identify urgency and the caller's request. \" +\n        \"Write triage.md.\",\n    }).gate((r) => r.artifacts.includes(\"triage.md\"));\n\n    await f.agent(\"callback-writer\", {\n      task: \"Read triage.md. Prepare a callback brief \" +\n        \"with the questions we need to answer. \" +\n        \"Write callback.md.\",\n    }).gate((r) => r.artifacts.includes(\"callback.md\"));\n\n    const brief = await f.run(\"cat callback.md\");\n    const approved = await f.human(\n      `Ready for a callback?\\n\\n${brief}`,\n      { to: input.approver },\n    );\n    if (!approved) return f.done(\"canceled\");\n\n    await f.slack.dm(input.callbackOwner, brief);\n    f.done(\"success\");\n  },\n);"
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
    "code": "import { flow } from \"@relayflows/surface\";\n\ntype Input = {\n  record: { category: string; status: string; email: string };\n  approver: string;\n};\n\nexport default flow<Input>(\n  \"redacted-summary\",\n  { budget: \"$5/run\" },\n  async (f, input) => {\n    // Select fields in code before building the prompt.\n    // The email address is excluded from this input.\n    const selected = {\n      category: input.record.category,\n      status: input.record.status,\n    };\n\n    await f.agent(\"summarizer\", {\n      task: `Summarize this record: ` +\n        `${JSON.stringify(selected)}. Write summary.md.`,\n    }).gate((r) => r.artifacts.includes(\"summary.md\"));\n\n    const summary = await f.run(\"cat summary.md\");\n    const approved = await f.human(\n      `Review this summary before sharing:\\n\\n${summary}`,\n      { to: input.approver },\n    );\n    if (!approved) return f.done(\"canceled\");\n\n    f.done(\"success\");\n  },\n);"
  }
];
