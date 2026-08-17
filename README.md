# Feature Flag Admin

A feature flag admin panel prototype, as an alternative to MS Power Apps internal tool. It demonstrates two features that are built into MS power apps: a write-through audit log (every change writes its own audit entry) and RBAC(role-based access control).

Built in roughly 2 hours of active work across five prompted phases, spread over a longer wall-clock window.

## Running locally


​```
npm install
​```
​
``
npm run dev
​``

Open http://localhost:3000. The app is Next.js 14 (App Router) with TypeScript and Tailwind; no database or other services are required.

* `/`: feature flags dashboard, create, edit, toggle, inline rollout editing, delete
* `/audit`: audit log with flag and action filters
* Role selector (Engineer / Ops / Compliance) in the top bar; try the "Simulate raw API call" button as Ops to see a server-side 403

Other scripts: `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## Project structure

* `app/`: pages and layout, the frontend
* `app/api/`: route handlers, the server boundary where RBAC is enforced
* `lib/store.ts`: in-memory data and the only functions allowed to mutate it
* `components/`: reusable UI, tables, top bar, role context

## API

| Method | Route              | Auth requirement                          | Description                                |
|--------|--------------------|--------------------------------------------|---------------------------------------------|
| GET    | `/api/flags`       | none                                       | List all flags                               |
| POST   | `/api/flags`       | Engineer, if environment is prod           | Create a flag                                |
| PATCH  | `/api/flags/[id]`  | Engineer, if flag is or becomes prod       | Edit or toggle a flag                        |
| DELETE | `/api/flags/[id]`  | Engineer, always                           | Delete a flag                                |
| GET    | `/api/audit`       | none                                       | List audit entries, filterable by flag and action |

## What's real vs mocked

Real:

* Server-enforced RBAC in the API route handlers: production flag changes, production flag creation, and all deletes require the Engineer role, returning HTTP 403 otherwise. Enforced server-side, so raw API calls are blocked the same as UI actions.
* Write-through audit log: `createFlag`, `updateFlag`, and `deleteFlag` in `lib/store.ts` append an audit entry (old/new values, actor, role, timestamp) in the same operation as the mutation, so no mutation can occur without a log entry.

Mocked:

* Identity: the role arrives as a client-supplied `x-role` header set by the top-bar dropdown. Any caller can claim any role.
* Persistence: all data lives in an in-memory store that resets on server restart.
* The flags don't control anything: no production code reads them.

## What I deliberately didn't build and why

* Real auth / identity: the role selector stands in. Production needs Microsoft Entra or Okta SSO(single sign on), with the role derived server-side from the authenticated identity rather than a header.
* Database: in-memory, resets on restart. Deliberate for a 2-hour prototype.
* The Refunds and KYC apps: not built. Feature flags was chosen first deliberately, it has the lowest cost of failure, so it's the right vehicle for proving the audit and access-control patterns before anything riskier depends on them. Refunds needs these same two patterns plus an approval-threshold rule, buildable with identical discipline. KYC needs regulated-grade audit retention, evidence export, and identity-integrated access control, which exceed what should be built fast. This is why the recommendation is to keep KYC on Power Apps until these patterns are proven.
  
* External integrations: without a flag SDK that production code reads to actually apply flags to customer traffic, this is a UI over mock data. The same is true of any quick prototype, including Power Apps.
* Flag data model: real tools model a flag across environments, with separate state and targeting rules per environment. This models environment as a single property of the flag, a deliberate simplification that keeps the access-control rule simple enough to demonstrate clearly.

## Try it yourself

To see both patterns fire directly:

1. Set the role selector to Engineer and toggle any flag. Open /audit and confirm a new entry appears with old and new values.
2. Set the role selector to Ops. Try toggling a prod flag (e.g. instant-transfer-limits). A red "Access denied" banner appears and the flag is unchanged.
3. Still as Ops, click "Simulate raw API call". Same result. This sends the request directly, skipping the UI guards, so it demonstrates the same thing a curl command or a custom script would hit.
4. Open the browser's Network tab and repeat step 3. The request that fires returns HTTP 403.
5. Switch back to Engineer and repeat step 3. The request succeeds and the flag toggles.
6. Open /audit again. The blocked attempts from steps 2 to 4 produced no entries. Rejected requests never reach the store, so they leave no trace.
