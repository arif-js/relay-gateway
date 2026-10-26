# relay-gateway — guide for AI coding agents

relay-gateway is an open-source, self-hostable multi-tenant messaging platform on Telegram: each
of your customers connects their own Telegram bot through a link, and you message their end-users
from it through one API, one webhook, and one MCP server.

## Project

- `src/core/` — the domain: tenants, API keys, connections, messages, webhooks, plans, limiter, crypto.
- `api/index.ts` — the Vercel entry point. It wraps the same request handler the CLI uses.
- `src/telegram/` — the Bot API client, and the fake used in demo mode and by the tests.
- `src/http/` — the HTTP server, the router, the REST API, the dashboard session.
- `src/ui/` — the hand-written stylesheet, the client script, and the server-rendered pages.
- `src/mcp/` — the MCP tool surface (stdio).
- `src/config.ts` — env-driven configuration.
- `docs/plan.md` — the design, the layer map, the plan/pricing model.
- `docs/api.md` — the API reference.
- `docs/deployment.md` — how to deploy it (a VPS or Vercel) and every key you need.
- `Dockerfile`, `docker-compose.yml`, `vercel.json`, `api/index.ts` — the two deployment paths.

## The layer map (use these labels, never "the customer")

```
L0  Telegram            — the infrastructure provider. We do not own it.
L1  Relay Gateway       — this repo. The platform.
L2  The SaaS vendor     — deploys Relay Gateway. Calls our API.
L3  The tenant          — L2's customer. A business. Connects their own bot.
L4  The end user        — the person who receives the messages. Never sees this platform.
```

"Customer" is overloaded: L2's customer is L3, L3's customer is L4. If a sentence says "the
customer" and the reader has to guess which one, the sentence is wrong.

## Status

M0–M4 in progress. Pre-release (0.1). No public contract is frozen yet.

## Capability modes

- **Mode A (built):** outbound. The tenant's own *bot* is the sender. L2 broadcasts to L4.
  Sourced from Telegram's managed-bot flow: our manager bot creates the bot via the
  `t.me/newbot/<manager>/<username>` deep link and pulls the token with `getManagedBotToken`.
- **Mode B (later, behind a flag):** inbound. The tenant links their *Telegram Business account*
  and we reply as them. Bounded by Telegram's 24-hour window — it can only reply in private chats
  that had an incoming message in the last 24 hours, so it is a conversation mechanism, never a
  campaign mechanism. Storage columns for it already exist.

## Commands

```sh
npm ci             # install deps
npm test           # vitest run (offline, no network)
npm run typecheck  # tsc --noEmit
npm run lint       # biome check .
npm run format     # biome check --write .
npm run build      # generate the assets module, then tsup -> dist/
npm run dev        # start the server with the fake Telegram backend
```

**Definition of done:** `npm run lint && npm run typecheck && npm test && npm run build` all pass,
and the demo flow works end to end offline (`RELAY_DEMO=1`).

## Skills & roles (plain Markdown, readable by any agent)

| Path | Use it when |
|---|---|
| `.agents/skills/add-api-route/SKILL.md` | Adding or changing a REST endpoint |
| `.agents/skills/add-mcp-tool/SKILL.md` | Adding or changing an MCP tool |
| `.agents/skills/change-connection-flow/SKILL.md` | Changing the connect / managed-bot flow |
| `.agents/skills/change-web-ui/SKILL.md` | Changing the web UI |
| `.agents/skills/change-storage/SKILL.md` | Changing the database layer |
| `.agents/skills/warm-editorial-design/SKILL.md` | Applying or updating the Warm Editorial Developer design system |
| `.agents/agents/telegram-integrator.md` | Role: the Telegram client and the connect flow |
| `.agents/agents/platform-engineer.md` | Role: core domain, store, API |
| `.agents/agents/web-ui-designer.md` | Role: the web UI |
| `.agents/agents/reviewer.md` | Role: read-only review before work is marked done |

If your tool doesn't load skills or subagents natively, read the file and follow it as instructions.
When asked to "act as the reviewer" (or another role), adopt that role file. `.claude/skills` and
`.claude/agents` are symlinks to `.agents/`, for Claude Code's auto-discovery. Cursor rules live
in `.cursor/rules/` and `.cursorrules`.

## Workflow

1. Read this guide and `docs/plan.md` before changing code.
2. Write the failing test first, watch it fail, then implement.
3. Finish with a reviewer pass against the invariants below.
4. Keep `README.md`, `docs/api.md` and this guide in sync with the API surface.

## Core contracts

- **Envelope, everywhere.** Success: `{ ok: true, data, warnings }`. Failure:
  `{ ok: false, error: { code, message, hint? } }`. The HTTP API and the MCP tools use it.
- **Error codes (closed set):** `BAD_INPUT`, `UNAUTHORIZED`, `NOT_FOUND`, `CONFLICT`,
  `NOT_CONNECTED`, `RATE_LIMITED`, `PLAN_LIMIT`, `TELEGRAM_ERROR`, `INTERNAL`.
- **Auth.** `rg_admin_…` is the platform key (L2 → L1). `rg_live_…` is tenant-scoped and can
  never touch another tenant's data. Keys are stored hashed (sha256); the plaintext is shown once.
- **Bot tokens are write-only.** Encrypted at rest with AES-256-GCM, and never returned by any
  endpoint, log line, error message or MCP result.
- **Rate limiting.** One shared limiter: ~1 msg/sec per chat, 20 msg/min per group, ~30 msg/sec
  global. On HTTP 429 we sleep exactly `parameters.retry_after` seconds. No per-worker limiters.
- **Storage.** One `SqlDatabase` interface with two implementations: `node:sqlite` for a local
  file (self-host, a VPS) and the native `libsql` client for a remote database (Turso, on a
  serverless host). Both are synchronous, so the store does not know which it has. Only
  `src/core/` touches it.
- **One request handler.** `createRequestHandler` is the app; `createHttpServer` wraps it in an
  `http.Server` and the Vercel function calls it directly. There is one implementation of the
  product, not two.
- **The `html` tag** in `src/http/html.ts` escapes interpolated values and leaves the literal
  parts as markup. A value produced by the tag is marked raw, so templates nest without
  double-escaping. Never interpolate a raw HTML fragment as a plain string — it gets escaped.

## Invariants (never violate)

1. **A tenant never pastes a token into the platform.** Tokens arrive only through Telegram's own
   managed-bot flow. Collecting tenant tokens is the "operate by proxy with other users' Bot API
   credentials" case that Bot Developer ToS §5.2(f) forbids.
2. **One shared limiter, `retry_after` honoured exactly.** Retrying early extends the penalty.
3. **Tenant isolation.** A tenant key can only read and write its own tenant's rows. The admin
   key can cross tenants and every admin action is written to the audit log.
4. **Mode B's 24-hour window is never promised away.** Business connections are a conversation
   feature. Any doc or UI copy that implies a business account can run campaigns is wrong.
5. **Business message content never leaves the tenant's own service.** ToS §5.4 forbids
   forwarding it to third-party APIs (including an LLM provider) without the user's authorization.
   The AI agent lives in L2, not in L1.
6. **No network in demo mode or in tests.** `RELAY_DEMO=1` swaps in the fake Telegram client;
   the test suite uses the same fake. Tests never touch the real Telegram API.
7. **stdout belongs to the CLI/MCP transport.** No `console.log`. Log to stderr.
8. **The web UI has no client build step and no runtime UI dependencies.** Server-rendered HTML,
   one stylesheet, a little vanilla JS. No framework, no bundler, no CDN.
9. **The dashboard requires a session.** An HMAC-signed cookie obtained with the platform key.
   The dashboard shows tenant names and message logs; it is never public.
10. **Every documented env var appears in `.env.example`** and in `docs/api.md`.

## Stack pitfalls

These are verified problems with the chosen stack. Don't rediscover them:

- **`tsup` 8.5 defaults `removeNodeProtocol: true`**, which rewrites `node:sqlite` into a bare
  `sqlite` import. There is no bare `sqlite` builtin, so the built server crashes on startup.
  `tsup.config.ts` sets `removeNodeProtocol: false`. Do not remove that line, and do not "fix" it
  with an `esbuildPlugins` `onResolve` hook — esbuild resolves builtins before plugins run, so
  the hook never fires.
- **`node:sqlite` is experimental** and emits an `ExperimentalWarning` on load. Noisy, harmless;
  do not suppress it globally.
- **`node:sqlite` only binds `null`, `number`, `bigint`, `string` and `Uint8Array`.** Never bind a
  raw `unknown`; normalise booleans, dates and objects first.
- **`node:sqlite` requires Node ≥ 22.16.** `engines.node` is `>=22.16.0`.
- **`SELECT * FROM t LIMIT 0` returns no rows**, so it cannot be used to discover column names.
  Use `PRAGMA main.table_info(t)` instead.
- **The UI assets are inlined at build time.** `scripts/gen-assets.mjs` writes
  `src/ui/assets.generated.ts` from `src/ui/styles.css` and `src/ui/app.js`, and the server
  imports that module. It has to be this way: a serverless bundler cannot see a file read with a
  dynamic path. The generated module is committed so serverless bundlers include it. It is
  recreated by `npm run build`, `npm test`, and `npm run typecheck`; CI checks it is current.
  **Edit the CSS and the JS, never the generated file.**
- **`libsql` is a native module.** It is loaded with `createRequire` only when
  `RELAY_DATABASE_URL` is set, so a self-hoster who never uses a remote database never needs the
  binary. On Vercel the binary has to be traced into the function, which is what
  `vercel.json`'s `includeFiles` is for.
- **Telegram's `getManagedBotToken` takes the *user id of the managed bot*.** The `managed_bot`
  update carries `user` (the creator) and `bot` (the bot). Try the bot id first, fall back to the
  creator id, and log which one worked — otherwise the connect flow silently never completes.
- **Telegram's `t.me/newbot` deep link needs the username *with* the `bot` suffix**, 5–32 chars,
  letters/digits/underscore only.
- **Telegram's 429 response puts the delay in `parameters.retry_after`,** not in the message text.
- **Telegram webhook delivery only works on ports 443, 80, 88, 8443** and requires HTTPS.

## Testing

- Every behavior change comes with a test. Every bug fix comes with a regression test that fails
  without the fix.
- Tests never touch the network and never use a shared data dir. Each test uses a temp dir.
- The MCP surface is tested over a real client/server pair (`InMemoryTransport`).
- Tests must be deterministic: no wall-clock assertions, no reliance on host state or locale.
- The demo flow (connect → send → log) is covered end to end against the fake client.
- The web UI has its own test file. Escaping bugs live there, not in the browser.

## Working style

- Small, focused changes. Read the code around your change and match its conventions before
  writing new code.
- Don't commit, push, tag or publish unless asked.
- Update `README.md`, `docs/` and this guide when you change an endpoint, a tool name, an env var,
  an error code or a default.
- If a choice is hard to reverse (the API surface, the envelope shape, the error codes, the plan
  limits), ask instead of guessing.
