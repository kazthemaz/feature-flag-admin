# Feature Flag Admin

A feature flag admin panel **prototype** — a self-built alternative to a Power Apps internal tool. It demonstrates two enforcement patterns for internal tooling: a write-through audit log (every mutation writes its own audit entry in the same operation) and server-enforced role-based access control.

Built in roughly 2 hours of active work across five prompted phases, spread over a longer wall-clock window.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app is Next.js 14 (App Router) with TypeScript and Tailwind; no database or other services are required.

- `/` — feature flags dashboard: create, edit, toggle, inline rollout editing, delete
- `/audit` — audit log with flag and action filters
- Role selector (Engineer / Ops / Compliance) in the top bar; try the "Simulate raw API call" button as Ops to see a server-side 403

Other scripts: `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## What's real vs mocked

**Real:**

- Server-enforced RBAC in the API route handlers: production flag changes, production flag creation, and all deletes require the Engineer role, returning HTTP 403 otherwise — enforced server-side, so raw API calls are blocked the same as UI actions
- Write-through audit log: `createFlag`, `updateFlag`, and `deleteFlag` in `lib/store.ts` append an audit entry (old/new values, actor, role, timestamp) in the same operation as the mutation — no mutation can occur without a log entry
- Full CRUD API (`/api/flags`, `/api/flags/[id]`, `/api/audit`) with input validation and filtering

**Mocked:**

- Identity: the role arrives as a client-supplied `x-role` header set by the top-bar dropdown — any caller can claim any role
- Persistence: all data lives in an in-memory store that resets on server restart
- The flags don't control anything: no production code reads them

## What I deliberately didn't build and why

- **Real auth / identity:** the role selector stands in; production needs Entra or Okta SSO, with the role derived server-side from the authenticated identity rather than a header.
- **Database:** in-memory, resets on restart — deliberate for a 2-hour prototype.
- **The Refunds and KYC apps:** not built. Refunds needs these same two patterns plus an approval-threshold rule, buildable with identical discipline. KYC needs regulated-grade audit retention, evidence export, and identity-integrated access control, which exceed what should be built fast — which is why the recommendation is to keep KYC on the incumbent platform until these patterns are proven.
- **External integrations:** without a flag SDK that production code reads to actually apply flags to customer traffic, this is a UI over mock data — and the same is true of any quick prototype, including Power Apps.
- **Flag data model:** real tools model a flag across environments with separate state per environment; this models environment as a property of the flag, a deliberate simplification for the timebox.
