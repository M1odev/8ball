# Publishing 8Ball

## Production configuration

Publishing is already configured for Autoscale with the application router.
The project pre-build runs `pnpm run typecheck`. Each artifact then runs its
production build:

- The `8ball` artifact serves `artifacts/8ball/dist/public` as static files at `/`,
  with a fallback to `index.html` for browser routes.
- The API artifact runs `artifacts/api-server/dist/index.mjs` in production mode
  at `/api`. Its startup health check is `/api/healthz`.
- The mockup sandbox has no production service.

Production settings belong in the artifacts' `.replit-artifact/artifact.toml`
files. The `.replit` build command is only a project pre-build check.

## Before publishing

1. Open Publishing and review the production secrets:
   - `API_KEY`: the shared Hack Club AI key that funds the included free questions.
     A personal key does not fall back to this key when rejected.
   - `SESSION_SECRET`: a stable random secret for visitor cookies and quota hashes.
     **Keep it unchanged across publishes**; rotating it changes visitor identities
     and prevents existing quota hashes from matching.
   - `DATABASE_URL`: supplied by the managed production database, not copied by hand
     from development.
2. Review and approve the development-to-production schema changes in Publishing.
   Free limits require `decision_usage` and `decision_tickets`. Publishing handles
   schema changes; do not run development `db push` against production.
3. Publish, then verify `/api/healthz`, the remaining-question counter, and one real
   question. A real question spends one attempt and makes AI requests.

The app is not a static-only deployment: `/api` must be running for AI and allowances.
The publishing step is user-initiated; preparing the project does not publish it.

## Usage and public-launch caveats

Allowances live in PostgreSQL, not server memory: three total attempts per browser,
no periodic reset, with a shared twelve-attempt daily network cap. Processing
failures still count. Personal-key requests bypass these free quotas but remain
subject to provider and short-term server limits.

Anonymous cookies identify browsers, not individual people. These safeguards
discourage abuse but do not set an app-wide spending ceiling. Monitor the shared
provider account when publishing publicly.

Full prompts and responses are deliberately logged. Keys are redacted, but questions
may contain sensitive information; limit access to production logs.

## Resetting free allowances

```sh
pnpm reset:limits            # Preview only
pnpm reset:limits --confirm  # Reset ALL visitors and daily network counters
```

The command targets the database configured for its terminal environment. The
workspace terminal normally targets **development**, not the published database.
It does not change secrets, cancel in-flight questions, or reset short-term server
traffic limits. Refresh the browser after a reset.
