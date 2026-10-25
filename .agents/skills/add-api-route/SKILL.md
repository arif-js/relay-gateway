---
name: add-api-route
description: "Use when adding or changing a REST endpoint in relay-gateway."
---

# Adding a REST endpoint

The HTTP API lives in `src/http/server.ts`. The rules below exist because every endpoint that
broke one of them was a bug we shipped.

## Procedure

1. **Decide where the behaviour belongs.** If it is a rule about tenants, keys, plans, messages or
   connections, it goes in `src/core/relay.ts` — not in the route handler. The MCP tools and the
   dashboard call the same service, so a rule in the route handler is a rule one of them does not
   have.
2. **Write the test first** in `test/integration/http-api.test.ts`. Use the `api()` helper from
   `test/harness.ts`.
3. **Add the route** with `router.get/post/delete(path, handler)`. The path uses `:name` for
   parameters.
4. **Return the envelope.** Success: `sendJson(res, status, { ok: true, data })`. Failure: throw a
   `RelayError` from `src/errors.ts` — the dispatcher turns it into
   `{ ok: false, error: { code, message, hint } }` with the right status. Never hand-roll an error
   response.
5. **Authenticate** with `requireAuth(ctx)`, which reads `Authorization: Bearer`. For a tenant
   key, pass `auth.tenantId` to the service; the service checks the scope.
6. **Update the docs** in `docs/api.md`, the endpoint table in `src/ui/dashboard.ts` (the docs
   page), and `README.md` if it is a headline endpoint.

## Rules

- **A tenant key can only reach its own tenant.** Call the service with the tenant id from the
  key, not from the request body, unless the caller is the platform key.
- **Never return a bot token.** Not in the data, not in an error message, not in a hint.
- **New error codes need a decision.** The set in `src/errors.ts` is closed. If a new one is
  genuinely needed, add it there and in `docs/api.md` — do not invent a code inline.
- **Status codes** come from the error code: 400 `BAD_INPUT`, 401 `UNAUTHORIZED`, 404 `NOT_FOUND`,
  409 `CONFLICT` / `NOT_CONNECTED`, 402 `PLAN_LIMIT`, 429 `RATE_LIMITED`, 502 `TELEGRAM_ERROR`,
  500 `INTERNAL`.
- **The request body** may be JSON or form-urlencoded. `readJsonBody` handles both. Read fields
  defensively — the body is `unknown` until you cast it.
- **The dashboard routes** are session-authenticated, not key-authenticated. They live in the
  dashboard section of `server.ts` and use `sessionFor(ctx)`.

## Definition of done

`npm run lint && npm run typecheck && npm test` pass, and the new endpoint has a test that fails
without the change.
