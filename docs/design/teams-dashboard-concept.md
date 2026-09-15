# Teams dashboard concept

Asset: `web/public/teams/teams-dashboard-concept.png` (1585 × 992).

Created using the built-in imagegen tool. This is a product concept with example
sessions, not a screenshot of a connected account. The image links to its full-size
version from the Teams landing page.

## Design brief

A flat navy desktop interface with one session table grouped by the human running
the agents. Columns: Session, Tool, Status, Pull request, Updated. Statuses are
Working, Idle, and Finished; only finished sessions have PR links. The important
columns sit before Updated so they remain visible in the landing page's right crop.

| Teammate | Session | Tool | Status | PR |
| --- | --- | --- | --- | --- |
| Will Washburn | Add Google sign-in | Claude Code | Working | |
| Will Washburn | Improve onboarding copy | Codex | Idle | |
| Will Washburn | Fix duplicate uploads | Claude Code | Finished | #482 |
| Maya Chen | Build sessions search | Codex | Working | |
| Maya Chen | Review retry handling | Gemini CLI | Idle | |
| Maya Chen | Add team invitations | Claude Code | Finished | #487 |
| Alex Rivera | Audit session sharing | Claude Code | Working | |
| Alex Rivera | Update setup guide | OpenCode | Finished | #491 |

## Surface cleanup prompt

Edit this Agent Relay Teams dashboard screenshot. Preserve the exact layout,
dimensions, all text, all eight rows, all three human groups, status dots, and all
PR numbers. Change ONLY the surface rendering. The current image has strange
black/blue/green mottled patches and waves in the background and behind rows.
Remove EVERY such artifact. Make the ENTIRE screenshot fully opaque, perfectly
flat, clean digital UI. Every background surface must be a solid uniform navy
color: page #0b1c2a, top bar #102536, group headers #132b3c, session rows #0e2333,
subtle first-row highlight #18394f. Thin solid separators. Absolutely NO
transparency, no black cut-out holes, no gradients, no grain, no glow, no textures,
no ripples, no smoke, no shadows. This is a pixel-sharp product screenshot of a
normal flat application, not an artistic treatment. Keep text and icons crisp
with clean antialiasing and excellent contrast. Small status dots remain blue for
Working, amber for Idle, green for Finished. Preserve all exact existing content.

## Branding correction prompt

Built-in imagegen edit using the existing dashboard as the target and
`web/public/brand-kit/agent-relay-logo-horizontal-transparent.png` as the
authoritative branding reference.

Use case: compositing.
Input image 1: edit target, the existing Agent Relay sessions dashboard concept.
Input image 2: authoritative logo insert from the repository's brand kit, agent-relay-logo-horizontal-transparent.png.
Replace ONLY the incorrect top-left text logo in image 1 with the EXACT real horizontal logo from image 2: the two interlocking rounded blue diamond/chevron shapes (bright sky-blue left shape, darker blue right shape) and the white lowercase agentrelay wordmark with its specific original letterforms. Composite the provided branding, do not invent or redesign the symbol or typeset a substitute. The input logo has large transparent margins: ignore those margins and use only the visible logo artwork. Fit the complete real lockup at about x=28..180, y=22..47 within the existing top bar, centered vertically; preserve the logo's original aspect ratio. Retain the existing divider around x=211 and the AgentWorkforce workspace selector.
Preserve all other pixels and layout as closely as possible: original 1585x992 canvas, navy backgrounds, all navigation, all text, table rows, three human groups, tool icons, statuses, PR numbers, and separators. No added ornamentation. No new elements. Final result must be a crisp screenshot with the actual supplied Agent Relay brand lockup in the top left.

## Final logo spacing prompt

Built-in imagegen edit to increase the separation between the mark and wordmark
at the landing page's displayed image size.

Use case: precise-object-edit.
Edit only the spacing in the Agent Relay logo at the TOP LEFT of this existing dashboard screenshot.
The blue symbol currently ends around x=78 and the white wordmark begins around x=82. Increase that 4px gap to a clear 16px gap by shifting ONLY the entire white "agentrelay" wordmark about 12 pixels to the right, so it starts around x=94 and ends around x=227. Keep the blue symbol in its current location and at its current size, about x=34..78. Keep the divider at x=244. Keep the exact existing official blue symbol shape and exact existing white wordmark letterforms, height, weight, and baseline. Do not redesign or typeset new branding. The symbol and wordmark should feel separate with comfortable breathing room even when this screenshot is displayed at half size.
Everything else is invariant: same 1585x992 canvas, same header positions, workspace selector, navigation, backgrounds, all table rows, text, statuses, tool icons, and PR numbers. Make no other visual changes. Preserve the rest of the screenshot.
