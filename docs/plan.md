# relay-gateway — plan

**One-line thesis:** a self-hostable, multi-tenant "Telegram for developers" platform: each of
your customers connects their own Telegram bot through a link, and you then message their
end-users from it through one API, one webhook, and one MCP server.

Status: pre-release (0.1). No public contract is frozen yet.

---

## 1. The layer map (who is who)

"Customer" is overloaded in this problem. Fix the labels once and use them everywhere.

```
L0  Telegram            — the infrastructure provider. We do not own it.
L1  Relay Gateway       — the platform. This repo. API + webhooks + inbox + MCP + web UI.
L2  The SaaS vendor     — deploys Relay Gateway into their product. Calls our API.
L3  The tenant          — L2's customer. A business. Connects their own Telegram bot.
L4  The end user        — the person who receives the messages. Never sees this platform.
```

In a proprietary hosted platform, L1 and L2 are often the same company. In an open-source
version they split: we build L1, anyone can deploy it as their L2.

Who holds what:

| Layer | Holds | Can do |
|---|---|---|
| L1 | bot tokens (encrypted), connection ids, message log | send, read, log |
| L2 | L1 API key, mapping of "their customer record → L3 tenant" | decides what to send, when |
| L3 | ownership of their bot, the rights they grant | grants access, revokes it, sees messages in their own Telegram |
| L4 | nothing | just receives messages |

The AI agent lives in **L2**, not L1. L1 stays a dumb, auditable relay — that is what makes it
sellable to non-technical L3s and compliant with Telegram's terms.

---

## 2. Capability modes

Telegram's identity model supports outbound and inbound differently, so they are separate modes
with separate storage columns and separate terms handling. One blended "messaging" feature would
hide the constraint that makes one of them unshippable.

### Mode A — outbound, per-tenant bot ("managed bot") — **building this first**

The tenant's own bot is the sender. L2 broadcasts to L4 through it.

Flow:

```
L3 opens connect link  →  Telegram creates a bot in L3's name
                         →  our manager bot receives `managed_bot` update
                         →  we fetch the token with getManagedBotToken
                         →  we hold the token, L3 owns the bot
L2 POST /v1/messages   →  L1 sends with that bot's token
L4 receives            →  "from @sara_shop, a bot"
```

This is the sanctioned path. Telegram's `bots.exportBotToken` / `getManagedBotToken` exists
precisely so a manager bot can operate a bot on a user's behalf. We never ask a tenant to paste
a token into a form, which would be the ToS-risky "operate by proxy with other users' Bot API
credentials" case (Bot Developer ToS §5.2(f)).

Scale: ~1 msg/sec per chat, 20 msg/min per group, ~30 msg/sec global for bulk. Enforced in
`src/core/limiter.ts` as a shared token bucket, not per-worker. Over the limit Telegram returns
429 with `parameters.retry_after`; we sleep exactly that long, we do not retry early.

### Mode B — inbound, business account ("Secretary Mode") — **later, behind a flag**

The tenant links their *own Telegram account*; we read their inbound DMs and reply as them.
The end user sees the tenant's real account, not a bot.

Constraint that decides the design: `can_reply` covers only **private chats with an incoming
message in the last 24 hours**. Mode B therefore cannot carry campaigns. It is a conversation
mechanism only, and Mode A is the campaign mechanism. They do not overlap.

Terms that bind Mode B (Bot Developer ToS §5.4): message content may be used only to provide the
service as a business chatbot; it may not be forwarded to third-party APIs (including an LLM
provider) without the user's authorization; nothing may be concealed from the account owner;
retention must be stated; scope changes must be notified with an opt-out.

Mode B is not in v0.1. The storage columns exist now (`connections.mode`, `business_connection_id`,
`rights`) so adding it later is not a migration.

---

## 3. API surface (v1)

Base path `/v1`. Auth: `Authorization: Bearer <key>`.
`rg_live_…` keys are tenant-scoped. `rg_admin_…` is the platform key (L2 → L1).

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/v1/tenants` | admin | L2 creates an L3 tenant. Returns tenant + its first API key. |
| GET | `/v1/tenants` | admin | list tenants |
| GET | `/v1/tenants/:id` | admin or tenant | one tenant |
| POST | `/v1/tenants/:id/connect-links` | admin or tenant | mint a connect link for L3 |
| GET | `/v1/connect/:token` | public | L3 opens it, picks a bot name |
| POST | `/v1/connect/:token/complete` | public | L3 submits the chosen username/display name |
| GET | `/v1/tenants/:id/messages` | admin or tenant | message log for a tenant |
| POST | `/v1/messages` | tenant | send a message as the tenant's bot |
| GET | `/v1/messages` | tenant | message log for the calling tenant |
| POST | `/v1/webhooks` | tenant | register an event webhook (HMAC-signed) |
| GET | `/v1/webhooks` | tenant | list webhooks |
| DELETE | `/v1/webhooks/:id` | tenant | remove a webhook |
| GET | `/v1/usage` | tenant | messages sent this period, plan limits |
| GET | `/v1/events` | tenant | poll recent events (webhook alternative) |
| POST | `/v1/telegram/webhook` | secret header | Telegram → us (managed_bot, message, business_*) |
| GET | `/healthz` | public | liveness |

Envelope, everywhere:

```json
{ "ok": true,  "data": { … }, "warnings": [] }
{ "ok": false, "error": { "code": "NOT_FOUND", "message": "…", "hint": "…" } }
```

Error codes (closed set): `BAD_INPUT`, `UNAUTHORIZED`, `NOT_FOUND`, `CONFLICT`, `NOT_CONNECTED`,
`RATE_LIMITED`, `PLAN_LIMIT`, `TELEGRAM_ERROR`, `INTERNAL`.

### Connect-link flow (Mode A), concrete

1. L2 calls `POST /v1/tenants` → `{ id, name, api_key }`.
2. L2 calls `POST /v1/tenants/:id/connect-links` → `{ url, token, expires_at }`.
   `url` is `https://<base>/connect/<token>`. The token is stored hashed; the plaintext is shown once.
3. L3 opens the URL. They choose a display name and a bot username.
4. We redirect to `https://t.me/newbot/<manager_bot_username>/<username>?name=<display+name>`.
5. Telegram creates the bot. Our manager bot gets a `managed_bot` update on our Telegram webhook.
6. We match it to the pending connection (by chosen username, then by the bot id we stored at step 4),
   call `getManagedBotToken`, encrypt the token, mark the tenant `connected`.
7. `POST /v1/messages` now works for that tenant.

Step 6 needs one fallback: `getManagedBotToken` takes a *user id of the managed bot*. The
`managed_bot` update carries `user` (the creator) and `bot` (the bot). We try the bot id first
and fall back to the creator id, and we log which one worked.

### Demo mode

`RELAY_DEMO=1` swaps the Telegram client for an in-process fake. The connect page's button
completes the flow locally instead of redirecting to t.me, and sends are recorded and echoed.
The whole product is clickable offline, and the test suite runs with no network.

---

## 4. Web UI

Classy, editorial, no framework, no client build step. Server-rendered HTML + one hand-written
CSS file + a little vanilla JS. Zero runtime UI dependencies.

Pages:

- `/` — landing: what it is, the three-layer diagram, quickstart, pricing.
- `/connect/:token` — the L3 onboarding page. Choose a bot name, one big button, live status.
- `/dashboard` — L2's console: tenants, connection state, message log, usage, API keys.
- `/dashboard/tenants/:id` — one tenant: connection state, send a test message, recent messages.
- `/docs` — API reference and quickstart.
- `/pricing` — plans. Both free for now; the hosted tier's ceilings keep the $5 server healthy.

Design: warm paper background, ink text, one clay accent, serif display, hairline rules, generous
whitespace. No purple gradient, no glassmorphism, no card-with-4-shadows.

---

## 5. Plans and money

Open source does not mean free to run. Three separate things:

1. **Upstream Telegram cost** — zero. No per-message fee. Only "Paid Broadcasts" (above 30 msg/s)
   cost Telegram Stars, and we do not need them at normal scale. No approval process, no partner.
2. **Our running cost** — a $5 VPS and a domain is enough for a real deployment. That is the
   whole bill. It is *our* cost, not a price: while the project is finding its first users there
   is nobody to charge. The hosted plan is therefore free, with ceilings that exist only to stop
   one busy tenant from eating a $5 server. LLM API cost only applies if the L2 operator enables
   AI drafting, and even then it is L2's bill, not ours.
3. **What open source means for revenue** — the code is AGPL-3.0 and self-hostable for free,
   forever. When enough users show up to want a real tier, that is a decision to make later
   (hosted tier, usage, support, agency white-label). AGPL specifically means: if you run a
   modified version as a service, you publish your modifications. That is the point.

There is **no billing integration** in v0.1. The plan limits are enforced in code; the money is
not collected. `priceUsd` in `src/core/plans.ts` is where a future price goes.

Plan limits in v0.1 (enforced in `src/core/plans.ts`):

| | self-host | hosted (free) |
|---|---|---|
| price | free | free |
| tenants | unlimited | 3 |
| messages / month | unlimited | 2,000 |
| inbound webhooks | unlimited | 5 |

---

## 5b. Deployment

Two supported paths, serving the same application. `docs/deployment.md` has the
step-by-step for both, and every key they need.

| | A small VPS (recommended) | Vercel (serverless) |
|---|---|---|
| Cost | ~$5/month for the box | $0 to start |
| Database | A SQLite file on a volume | Turso (libSQL), free tier |
| Rate limiting | One shared limiter | Per instance |
| Reloading | `docker compose up -d` | A redeploy |

**Why the VPS is the default.** The platform is one long-lived process. That
gives one rate limiter (Telegram's limits are per bot, not per instance), one
SQLite file with no network round trip, no cold starts, and no vendor between
us and the users. It is also the cheapest thing that works.

**Why the Vercel path exists.** It costs nothing to start, it deploys from Git,
and it needs no box to maintain. The price is that a function has no disk, so
the database has to be remote, and the rate limiter becomes per instance.

The design consequence is a storage abstraction: one `SqlDatabase` interface
with a `node:sqlite` implementation (a local file) and a `libsql`
implementation (a remote Turso database). Both are synchronous, so the store
and everything above it is unchanged.

The UI assets are inlined at build time for the same reason: a serverless
bundler cannot see a file read with a dynamic path.

## 6. Stack

TypeScript, strict, native ESM, Node ≥ 22.16. Biome for lint+format, Vitest for tests, tsup for
the build. Dependencies: `@modelcontextprotocol/sdk`, `zod`. Nothing else at runtime.

- **Storage** — `node:sqlite` (`DatabaseSync`). One file, no server, no migration tool.
- **HTTP** — `node:http` with a small router. No Express, no Hono, no Fastify.
- **MCP** — stdio server, same tool surface as the HTTP API, same code paths underneath.
- **Crypto** — `node:crypto` AES-256-GCM for bot tokens and webhook secrets. Key from
  `RELAY_ENCRYPTION_KEY`; in dev it is derived once and stored in the data dir with 0600.

### Env

| Var | Default | Meaning |
|---|---|---|
| `RELAY_DATA_DIR` | `~/.relay-gateway` | sqlite file + dev key |
| `RELAY_HOST` / `RELAY_PORT` | `127.0.0.1` / `8787` | HTTP bind |
| `RELAY_PUBLIC_URL` | `http://host:port` | base URL for connect links |
| `RELAY_ADMIN_KEY` | generated on first boot | the L2 → L1 platform key |
| `RELAY_MANAGER_BOT_TOKEN` | — | the manager bot that creates/holds managed bots |
| `RELAY_MANAGER_BOT_USERNAME` | — | its `@username`, for the `t.me/newbot` deep link |
| `RELAY_TELEGRAM_WEBHOOK_SECRET` | generated | secret header Telegram sends us |
| `RELAY_ENCRYPTION_KEY` | derived in dev | 32 bytes, base64 or hex |
| `RELAY_DEMO` | `0` | in-process fake Telegram |
| `RELAY_PLAN` | `selfhost` | `selfhost` or `hosted` |

---

## 7. Milestones

- **M0** — scaffolding, config, sqlite schema, envelope, errors, logger.
- **M1** — tenants, API keys, connect links, managed-bot flow, message send + log.
- **M2** — webhooks (Telegram → us, us → L2), rate limiter, plans/usage.
- **M3** — web UI: landing, connect page, dashboard, docs, pricing.
- **M4** — MCP server, CLI, demo mode, docs polish, release.

Order of work in this pass: M0 → M1 → M3 (UI) → M2 → M4, because the UI is what makes the
demo convincing and the user asked for it explicitly.

---

## 8. Invariants (never violate)

1. **A tenant's bot token is never returned by the API.** Encrypted at rest, write-only.
2. **A tenant never pastes a token into the platform.** Tokens arrive only through Telegram's
   own managed-bot flow. Collecting tenant tokens is the ToS-risky path (§5.2(f)).
3. **Every outbound send is rate-limited by one shared limiter**, honouring Telegram's
   `retry_after` exactly. Per-worker limiters multiply the real rate and get us banned.
4. **One API key is tenant-scoped.** A tenant key can never touch another tenant's data. The
   admin key can, and every admin action is written to the audit log.
5. **Telegram's 24-hour business window is never promised away.** Mode B is a conversation
   feature, not a campaign feature.
6. **The demo mode never touches the network**, and the test suite never does either.
7. **stdout is for the CLI/MCP transport only.** The HTTP server logs to stderr.
