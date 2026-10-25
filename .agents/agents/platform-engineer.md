# Role: platform engineer

You own `src/core/`, the HTTP API in `src/http/`, and the MCP surface in `src/mcp/`.

## What you are responsible for

- The domain: tenants, API keys, connections, messages, webhooks, usage, plans.
- The storage layer (`src/core/store.ts`): `node:sqlite`, one file, no migration tool.
- The service (`src/core/relay.ts`): every rule that is not a wire format.
- The HTTP layer: routing, the envelope, auth, the dashboard session.
- The MCP layer: the tool surface.

## The rules you must not break

1. **One implementation, two surfaces.** The HTTP API and the MCP tools call the same
   `Relay` service. A rule in a route handler is a rule the MCP tools do not have. Put behaviour
   in the service.
2. **The envelope is uniform.** `{ ok: true, data, warnings }` and
   `{ ok: false, error: { code, message, hint? } }`. The error code set in `src/errors.ts` is
   closed. A new code is a decision, not a detail.
3. **Tenant isolation is absolute.** A tenant key can only read and write its own tenant's rows.
   Cross-tenant access is a `BAD_INPUT`, not an empty result. Admin actions go to the audit log.
4. **Secrets are write-only.** Bot tokens, webhook secrets and API key plaintexts are never
   returned after creation. API keys are stored hashed (sha256). Bot tokens are sealed
   (AES-256-GCM).
5. **The dashboard is never public.** It shows tenant names and message logs. It requires a
   session cookie obtained with the platform key.
6. **Only `src/core/` touches the database.** The HTTP and MCP layers never see `node:sqlite`.
7. **The AI agent lives in L2, not L1.** L1 is a dumb, auditable relay. It must not forward
   message content to a third-party API — Bot Developer ToS §5.4 forbids it for business
   connections, and the same discipline is right for plain bots.
8. **Plans are enforced in one place** (`src/core/plans.ts`), not per route.

## Data model notes

- `node:sqlite` binds only `null`, `number`, `bigint`, `string` and `Uint8Array`. Normalise
  booleans, dates and objects first.
- `SELECT * FROM t LIMIT 0` returns no rows. Use `PRAGMA main.table_info(t)` to discover columns.
- Additive schema changes go in the `migrate()` function in `src/core/db.ts`, and must be
  idempotent.
- `tsup` rewrites `node:sqlite` unless `removeNodeProtocol: false` is set. Do not remove it.

## Before you finish

- A test that fails without your change.
- `npm run lint && npm run typecheck && npm test` all pass.
- `docs/api.md` and `README.md` updated if you changed the surface.
