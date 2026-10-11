TLDR (human) ---> 8ball is a web-enabled online Jev proxy.
It uses Claude to turn human input into a proper prompt with context for Jev and then displays the result with some (in my opinion, pretty neat) graphics.
It also gives Claude the option to request web search through Hack Club's Exa API and conduct up to 2 rounds of research. 
If you'd like to see the full prompts/responses, check the console. 
I did NOT code this, I used replit agent to make it in a few hours.
There is a strict lifetime usage limit of 3 responses because the responses are coming from Hack Club AI's API.

full README (AI)

8Ball
An independent Jev online playground with a black-and-white, pixel-art interface. Ask a question, let Claude prepare the context, and see Jev's answer inside an interactive eight ball.

8Ball is not an official Jev site. It is not made, operated, or endorsed by, or officially affiliated with, Hack Club.

Features
Yes-or-no questions: display Jev's answer and estimated probability.
Multiple choice: show the selected answer in the ball and each option's relative weight in a bar chart.
Optional web research: Claude can request Exa searches before preparing the final prompt.
Transparent context: inspect the question sent to Jev and the number of research rounds.
Playful interface: responsive layout, pixel-art ball, and hover, click, and drag animations.
Anonymous usage limits: three included attempts per browser, with a personal-key option afterward.
Search-friendly homepage: prerendered content, metadata, structured data, sitemap, and social-sharing image.
No login or account is required. Answers and weights are model estimates, not verified facts or calibrated guarantees.

How it works
Your question
     │
     ▼
Claude prepares context
     │
     ├── Research needed? → Exa search → Claude revises the context
     │
     ▼
Structured Jev prompt
     │
     ▼
Jev decision
     │
     ▼
Eight-ball answer + probability or weighted choices
The browser calls the Express API, which makes provider requests through the Hack Club AI API. Shared provider credentials stay on the server.

The flow has two stages: preparing a prompt and answering it. A server-issued ticket binds the prepared prompt to an authorized request so the answer stage cannot bypass the free-usage checks.

Currently supported decision types are noul (yes/no) and choice (multiple choice). Score-type questions are not implemented.

Stack
Area	Technology
Frontend	React, TypeScript, Vite, Tailwind CSS, Wouter
API	Express, TypeScript, esbuild
Persistence	PostgreSQL, Drizzle ORM
API contracts	OpenAPI, generated Zod schemas and client code
AI	Claude → optional Exa research → Jev, through Hack Club AI
Workspace	Node.js 24, pnpm workspaces
Development
Prerequisites
Node.js 24 and pnpm.
A PostgreSQL database.
A Hack Club AI key for shared free requests.
A stable session secret.
Install dependencies from the repository root:

pnpm install
Configure these variables in your environment or workspace Secrets. Do not commit their values:

Variable	Purpose
API_KEY	Server-side Hack Club AI key for included free requests. Without it, shared free access is unavailable.
SESSION_SECRET	Required secret for signed visitor cookies and quota identities. Keep it stable across restarts and publishes.
DATABASE_URL	PostgreSQL connection string.
PORT	Port for each service; frontend and API must use different ports.
BASE_PATH	Frontend URL prefix; use / for this app. Required by Vite for development and builds.
Apply the schema to the development database:

pnpm --filter @workspace/db run push
Review the proposed schema changes before approving them. Do not point this command at production.

Start the app
In this Replit workspace, use the configured 8ball web and API Server workflows. To start the same services manually, use separate terminals:

# Frontend
PORT=18933 BASE_PATH=/ pnpm --filter @workspace/8ball run dev
# API
PORT=8080 pnpm --filter @workspace/api-server run dev
View the app through the workspace preview. The frontend sends requests to /api on the same origin. For hosting outside this workspace, configure a reverse proxy that routes /api to Express and / to the frontend; the Vite configuration does not provide a standalone API proxy.

The API development command builds and starts the server; restart it after backend edits.

Checks and builds
# Typecheck the workspace
pnpm run typecheck
# Build and prerender the frontend; includes SEO checks
NODE_ENV=production PORT=18933 BASE_PATH=/ pnpm --filter @workspace/8ball run build
# Build the API
pnpm --filter @workspace/api-server run build
# Recheck SEO against an existing frontend build
pnpm --filter @workspace/8ball run check:seo
Frontend output is in artifacts/8ball/dist/public. API output is in artifacts/api-server/dist.

Usage limits and personal keys
Each browser receives three total free attempts, with no scheduled reset.
Shared free access is also capped at 12 attempts per network per day.
An attempt counts when processing starts, even if the provider request later fails.
Visitors can supply their own Hack Club AI key to bypass the shared free allowance. Provider limits and short-term server protections still apply.
Personal keys are held in the current tab's memory and sent to the server for provider requests. They are not saved in local storage or the database.
A rejected personal key does not fall back to the shared key.
8Ball does not bill visitors itself. Hack Club AI's eligibility, pricing, and usage terms apply to its service.

Browser cookies identify browsers, not individual people. These controls discourage abuse but do not establish an app-wide spending ceiling.

Reset free allowances
# Preview the number of affected counters; changes nothing
pnpm reset:limits
# Reset ALL browser allowances and daily network counters
pnpm reset:limits --confirm
The command operates on the database configured in the terminal's environment—normally development in this workspace. It does not reset short-term traffic limits or cancel in-flight questions. Refresh the page afterward to see the updated allowance.

Logging and privacy
Full prompts and responses are deliberately logged in the server logs and browser console, including prepared context and research output. Known API keys and the session secret are redacted, but question text can still contain sensitive information.

Avoid submitting private information, restrict access to server logs, and consider your logging and retention requirements before opening the app to a wider audience.

Repository layout
artifacts/
  8ball/
    src/                 React UI and browser API helpers
    public/              Favicon, social image, robots.txt, sitemap
    scripts/             Build-output SEO checks
  api-server/
    src/routes/          Health, allowance, prepare, and answer endpoints
    src/lib/             AI orchestration, quotas, tickets, and logging
  mockup-sandbox/         Design-preview tooling; not a production app service
lib/
  api-spec/              OpenAPI source and code generation
  api-zod/               Generated request/response validation
  api-client-react/      Generated API client
  db/                    Database connection and schema
scripts/                 Maintenance commands, including allowance resets
docs/
  deployment.md          Publishing checklist and production caveats
The main UI is artifacts/8ball/src/App.tsx. Browser request helpers live in artifacts/8ball/src/lib/sendPrompts.js; provider calls and prompt instructions live in artifacts/api-server/src/lib/sendPrompts.ts.

Publishing
See the deployment guide for the production configuration, database checklist, and secret requirements.

The app needs both the static frontend and a running API backed by PostgreSQL. Deploying only the frontend will not provide AI responses or allowance checks.

The frontend build prerenders the initial UI without making AI calls. If the public domain changes, update the canonical and social URLs in artifacts/8ball/index.html, plus public/robots.txt and public/sitemap.xml, before rebuilding.

About Hack Club
Hack Club is a nonprofit coding community for teens. This independent project uses its AI API; that does not imply Hack Club created or endorses 8Ball.
