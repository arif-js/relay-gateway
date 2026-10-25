# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[semantic versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Two deployment paths.** A Docker image and a `docker-compose.yml` for a
  $5-a-month VPS, and a Vercel function for a serverless deployment. Both serve
  the same application; `docs/deployment.md` has the steps and every key.
- **A storage abstraction.** One `SqlDatabase` interface with a `node:sqlite`
  implementation (a local file) and a `libsql` implementation (a remote Turso
  database). It is what makes the serverless path possible, and the store
  itself did not change.
- **A production landing page.** Written for someone deciding whether to use
  this, including a section on what the platform does not do.
- **CI.** Lint, typecheck, tests and a build on Node 22 and 24, plus a job
  that builds the Docker image and checks the container becomes healthy.

## [0.1.0] — 2026-10-22

The first working version. Mode A: outbound messaging through a per-tenant Telegram bot.

### Added

- **The connect flow.** `POST /v1/tenants/:id/connect-links` mints a link; the customer opens
  it, picks a bot name, and Telegram creates a bot in their name through the `t.me/newbot` deep
  link. Our manager bot receives the `managed_bot` update and pulls the token with
  `getManagedBotToken`. The token is sealed and never returned by any endpoint.
- **The relay API.** Send a message as a tenant's bot, read the message log, register event
  webhooks, read usage. One envelope, one closed set of error codes.
- **Tenant-scoped API keys.** `rg_live_…` keys are stored hashed and can only touch their own
  tenant. `rg_admin_…` is the platform key.
- **The dashboard.** Sign in with the platform key, then see tenants, their connection state, the
  connect link, the message log, and a test-send panel.
- **The customer connect page.** One job, mobile-first, works without JavaScript, and polls for
  the bot being created in Telegram.
- **Event webhooks.** `message.sent`, `message.failed`, `message.received`, `tenant.connected`,
  `tenant.revoked`. Every delivery is signed with an HMAC-SHA256 over the raw body.
- **MCP tools.** `relay_list_tenants`, `relay_create_tenant`, `relay_create_connect_link`,
  `relay_send_message`, `relay_list_messages`, `relay_register_webhook`, `relay_get_usage`, plus
  a `relay://tenants` resource.
- **A rate limiter that matches Telegram's rules.** ~1/sec per chat, 20/min per group, 30/sec
  overall, in one shared limiter, honouring `parameters.retry_after` exactly.
- **Demo mode.** `RELAY_DEMO=1` swaps in an in-process fake Telegram client. The whole product is
  clickable offline and the test suite never touches the network.
- **Two free plans.** Self-host with no ceilings; hosted with 3 tenants, 2,000 messages a month
  and 5 webhooks, so one busy customer cannot eat the whole of the $5-a-month server. There is no
  billing integration — the limits are enforced in code, the money is not collected.
- **Storage.** One SQLite file via `node:sqlite`. Tokens and webhook secrets encrypted with
  AES-256-GCM.

### Not in this release

- **Mode B** (Telegram Business accounts, replying as the tenant). The storage columns exist and
  the design is in `docs/plan.md`, but Telegram's 24-hour reply window makes it a conversation
  feature, not a campaign one, so it is not enabled.
- **Billing.** The hosted plan exists and its limits are enforced, but there is no payment
  integration yet.
- **Inbound message delivery.** The webhook endpoint receives `managed_bot` updates; routing
  inbound `message` updates to tenants is not wired up.

[0.1.0]: https://github.com/arif-js/relay-gateway/releases/tag/v0.1.0
