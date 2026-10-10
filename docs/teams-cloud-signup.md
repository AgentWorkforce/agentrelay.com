# Teams entry into Cloud

The marketing `/teams` signup buttons link directly to Cloud's Google auth
endpoint, `/cloud/api/auth/google/start?next=%2Fteams%2Fconnect`. They use a
full browser navigation so Cloud can set OAuth cookies and redirect to Google.
The post-auth `/teams/connect` destination preserves Teams signup attribution
and then redirects to `/cloud/dashboard`.

Cloud handles Google auth and sends the user to `/cloud/dashboard`. Accounts
created through this Teams flow are marked directly on Cloud's `users` table
with `signup_source = teams` and `dashboard_version = 2`. They see the new Hello
world dashboard. Existing accounts keep their current dashboard, including
when signing in through the Teams link. The assignment persists across logins.
The migration adds both columns without changing existing user data; existing
accounts default to version `1` with an unknown (NULL) signup source.

## Local development

In the Cloud companion checkout, run `npm run dev:local` (see its
`docs/local-teams.md`). Here, run `npm run dev:teams`. Open
`http://127.0.0.1:3100/teams`. The development-only `/cloud/*` proxy forwards to
Cloud at `127.0.0.1:3101`, preserving one origin for API requests and auth cookies.
Keep `NEXT_PUBLIC_CLOUD_URL` unset.

Google needs a development OAuth client with the exact callback
`http://127.0.0.1:3100/cloud/api/auth/callback/google`. Without it, visit
`http://127.0.0.1:3100/cloud/api/auth/dev-login?source=teams` to create a separate
local Teams signup. The test login without `source=teams` retains the original
local account for testing the existing dashboard.

The Cloud companion owns cohort persistence, dashboard routing, and all future
setup functionality. V2 intentionally contains only Hello world for now. Its
migration must land before the runtime change under the existing reviewed PR
and human release gates.
