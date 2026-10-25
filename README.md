<p align="center">
  <img src="docs/logo.png" alt="Relay Gateway Logo" width="320">
</p>

# Relay Gateway

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node-%3E%3D22.16-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Live Demo](https://img.shields.io/badge/Demo-relay.arifcodes.com-orange.svg)](https://relay.arifcodes.com)

**Self-hostable Telegram messaging infrastructure for SaaS products.**

Relay Gateway lets a software vendor give each tenant its own Telegram bot, then send messages
through one API. It handles bot onboarding, tenant-scoped keys, signed webhooks, message logs,
rate limits, a dashboard, and MCP tools.

### How it works

1. The software vendor creates a tenant and sends its business a one-time connect link.
2. The tenant chooses a bot name; Telegram creates a bot that belongs to that tenant.
3. The software vendor sends messages through Relay Gateway, and the tenant's bot delivers them to
   end users.

No one needs to paste a bot token into your product. Relay Gateway obtains it through Telegram's
managed-bot flow and encrypts it at rest.

> **Live preview:** Explore [relay.arifcodes.com](https://relay.arifcodes.com) or try merchant
> sign-in at [relay.arifcodes.com/login](https://relay.arifcodes.com/login).

## Try it locally

Requires Node.js 22.16 or later.

```sh
git clone https://github.com/arif-js/relay-gateway
cd relay-gateway
npm install
RELAY_DEMO=1 npm run dev
```

Open <http://localhost:8787>, sign in to the console with the key printed in the terminal, and
follow the demo flow. Demo mode uses a fake Telegram client in-process: it makes no Telegram
network calls.

## What you get

- **One API, isolated tenants.** Each tenant has a scoped key that cannot access another tenant's
  data.
- **Zero-paste bot onboarding.** Telegram creates the tenant's bot through its managed-bot flow;
  Relay Gateway encrypts the token.
- **The tenant's own sender.** Messages come from the bot the tenant created and controls, not a
  shared platform bot.
- **Signed events and message logs.** Delivery, failure, and connection events are pushed to your
  webhook and recorded per tenant.
- **Shared rate limiting.** The rate limiter honors Telegram's `retry_after` value.
- **Dashboard and MCP server.** A browser console and tools for MCP-compatible AI clients are
  included.

## Who is who

- **Software vendor:** deploys Relay Gateway and calls its API.
- **Tenant:** the vendor's business user; connects and controls its own bot.
- **End user:** the person who messages or receives messages from the tenant's bot.

When this README says “tenant,” it means the business using your software. “End user” means that
business's own user.

## Why managed bots

A Telegram bot can message people only after they have started a chat with it. Relay Gateway
therefore does not use one shared bot: each tenant connects its own bot through Telegram's
managed-bot flow.

The software vendor creates a tenant and connect link; the tenant chooses a bot name and completes
the flow in Telegram. Relay Gateway obtains and encrypts the bot token, then sends messages on the
tenant's behalf. The tenant owns the bot and can revoke access. This avoids asking the tenant to
paste a token into the software vendor's product.

## Not supported yet: Telegram Business

Replying as a Telegram Business account is a separate, future capability. Telegram limits those
replies to private chats with an incoming message in the **last 24 hours**. It is a conversation
feature, not a campaign feature, and is not available in v0.1.

## Run it for real

```sh
npm run build
export RELAY_MANAGER_BOT_TOKEN=123456:AA...
export RELAY_MANAGER_BOT_USERNAME=your_manager_bot
export RELAY_PUBLIC_URL=https://relay.example.com
export RELAY_PLAN=hosted
node dist/cli.js serve
```

Two things to set up first:

1. **A manager bot.** Create one with [@BotFather](https://t.me/botfather) and turn on *Bot
   Management Mode*. This is the bot that creates and manages the tenant bots.
2. **A webhook.** Point Telegram at `https://relay.example.com/v1/telegram/webhook` for the
   manager bot, with the secret in `RELAY_TELEGRAM_WEBHOOK_SECRET`. Telegram only delivers
   webhooks over HTTPS on ports 443, 80, 88 and 8443.

Then set `RELAY_ENCRYPTION_KEY` to 32 bytes (hex or base64) and keep it — losing it means losing
every stored bot token. `RELAY_ADMIN_KEY` is the platform key; one is generated and persisted in
the data dir if you do not set it.

## The API

```sh
# 1. create a tenant
curl -X POST http://localhost:8787/v1/tenants \
  -H "Authorization: Bearer $RELAY_ADMIN_KEY" \
  -H "content-type: application/json" \
  -d '{"name":"Sara'"'"'s Phone Shop"}'
# → { "id": "tn_…", "api_key": "rg_live_…" }

# 2. mint a connect link and send it to Sara
curl -X POST http://localhost:8787/v1/tenants/$TENANT_ID/connect-links \
  -H "Authorization: Bearer $RELAY_ADMIN_KEY"
# → { "url": "https://relay.example.com/connect/…" }

# 3. send a message as Sara's bot
curl -X POST http://localhost:8787/v1/messages \
  -H "Authorization: Bearer $TENANT_KEY" \
  -H "content-type: application/json" \
  -d '{"chat_id":15551234567,"text":"Your order #412 ships tomorrow."}'
```

Every response is the same envelope:

```json
{ "ok": true,  "data": { }, "warnings": [] }
{ "ok": false, "error": { "code": "NOT_FOUND", "message": "…", "hint": "…" } }
```

Error codes are a closed set: `BAD_INPUT`, `UNAUTHORIZED`, `NOT_FOUND`, `CONFLICT`,
`NOT_CONNECTED`, `RATE_LIMITED`, `PLAN_LIMIT`, `TELEGRAM_ERROR`, `INTERNAL`.

Two kinds of key. `rg_admin_…` is the platform key and reaches every tenant. `rg_live_…` is
tenant-scoped and can only ever touch its own tenant. Keys are stored hashed; the plaintext is
shown once.

Full reference: <http://localhost:8787/docs>, or [`docs/api.md`](docs/api.md).

## Webhooks

Register a URL and we POST every event to it. The body is signed with
`x-relay-signature: sha256=…`, an HMAC-SHA256 over the raw body.
Destinations must use HTTPS, resolve only to public IP addresses, and do not follow redirects.

```sh
curl -X POST http://localhost:8787/v1/webhooks \
  -H "Authorization: Bearer $TENANT_KEY" \
  -H "content-type: application/json" \
  -d '{"url":"https://example.com/hooks/telegram","events":["message.sent","message.received"]}'
```

Events: `message.sent`, `message.failed`, `message.received`, `tenant.connected`, `tenant.revoked`.

`message.received` fires when an end user writes to a tenant's bot, including tapping `/start`.
It carries their `chat_id`, which is how you get the id you need to message them.

## AI support example

[`examples/ai-sales-agent.mjs`](examples/ai-sales-agent.mjs) demonstrates a webhook-driven support
agent. It uses an example order and store knowledge base defined in the script; it does not connect
to an order database.

```text
[End user] ➔ (Telegram) ➔ [Relay Gateway] ➔ (Signed Webhook) ➔ [Support agent] ➔ (Relay API) ➔ [Telegram] ➔ [End user]
```

When an end user messages a tenant's bot:
1. Relay Gateway posts a signed `message.received` event to the configured webhook.
2. The example verifies the signature and generates a reply using the in-script sample knowledge
   base. Gemini and OpenAI are optional; without their API keys, the built-in matcher is used.
3. The agent sends its reply through Relay Gateway, which delivers it from the tenant's bot.

If you enable Gemini or OpenAI, the example sends the incoming message and its prompt context to
that provider. Replace the sample data carefully, and do not send real user or tenant data to a
third party without the required authorization.

Run it locally:
```sh
node examples/ai-sales-agent.mjs
```

## Self-Serve Merchant Portal

While SaaS vendors can provision tenants via REST API (`POST /v1/tenants`), Relay Gateway also provides an out-of-the-box **Merchant Onboarding Portal** powered by Clerk:

1. Merchants visit `/login` or `/signup` to authenticate using Google or Email.
2. If their store was pre-created via API, they click **Claim Store** to link it to their user account.
3. If new, they follow the 1-click wizard to launch and connect their branded Telegram bot.
4. Merchants can view their live message stream, bot connection status, and API credentials from a self-serve dashboard without platform admin intervention.

## For AI agents

The same operations are MCP tools. Point your client at the stdio server:

```json
{
  "mcpServers": {
    "relay-gateway": {
      "command": "node",
      "args": ["/path/to/relay-gateway/dist/mcp.js"],
      "env": { "RELAY_DATA_DIR": "/path/to/data" }
    }
  }
}
```

| Tool | What it does |
|---|---|
| `relay_list_tenants` | List tenants and their connection state |
| `relay_create_tenant` | Create a tenant and its key |
| `relay_create_connect_link` | Mint a connect link for a tenant |
| `relay_send_message` | Send a message as a tenant's bot |
| `relay_list_messages` | Read a tenant's message log |
| `relay_register_webhook` | Register an event webhook |
| `relay_get_usage` | Messages used this period |

There is also a `relay://tenants` resource.

## Rate limits

Telegram's limits are enforced for you by one shared limiter: about 1 message/second per chat,
20/minute per group, 30/second overall. On a 429 we sleep exactly as long as Telegram says.
Standard Bot API sending has no per-message fee. For higher throughput, Telegram's Paid Broadcasts
may cost 0.1 Stars per message, charged to the bot's balance.

A bot can only message people who have started a chat with it. That is Telegram's rule, not ours.

## Pricing

Free, for now. Both plans.

| | Self-host | Hosted |
|---|---|---|
| Price | Free | Free |
| Tenants | Unlimited | 3 |
| Messages/month per tenant | Unlimited | 2,000 |
| Webhooks | Unlimited | 5 |

Telegram charges nothing for normal sending, so the whole platform costs **us** one $5-a-month
server and a domain. While there are no users to serve there is nothing to charge for, so the
hosted plan is free too.

The hosted plan allows up to three tenants, with a separate 2,000-message monthly limit for each
tenant. If you need different limits or more control, self-host it under AGPL-3.0.

There is no billing integration yet. The limits are enforced in code; the money is not collected.
When enough users show up to want a real tier, that is a decision to make, and `priceUsd` in
`src/core/plans.ts` is where it goes.

## Deploying it

Two ways, both serving the same app. The full guide, with every key you need
and where it comes from, is in **[docs/deployment.md](docs/deployment.md)**.

**A small VPS (recommended, ~$5/month)** — one process, one SQLite file, one
rate limiter:

```sh
git clone https://github.com/arif-js/relay-gateway && cd relay-gateway
cp relay.env.example relay.env && $EDITOR relay.env
docker compose up -d
```

Then point a Cloudflare DNS record at the box and put Caddy in front of it for
TLS.

**Vercel (serverless, free to start)** — the database has to be remote, because
a function has no disk. Create one at [turso.tech](https://turso.tech), set
`RELAY_DATABASE_URL` and `RELAY_DATABASE_AUTH_TOKEN`, and deploy:

```sh
npx vercel link
npx vercel env add RELAY_DATABASE_URL production
npx vercel env add RELAY_DATABASE_AUTH_TOKEN production
npx vercel --prod
```

Then add a Cloudflare `CNAME` to `cname.vercel-dns.com` and the custom domain
to the Vercel project.

### The keys you need

| What | Where | Required |
|---|---|---|
| A Telegram manager bot token | [@BotFather](https://t.me/botfather), with **Bot Management Mode** on | yes |
| The manager bot's `@username` | @BotFather | yes |
| Your public HTTPS URL | your domain | yes |
| The platform key (`rg_admin_…`) | generated; set `RELAY_ADMIN_KEY` | yes, in production |
| The encryption key | generated; set `RELAY_ENCRYPTION_KEY` | yes, and keep it |
| The Telegram webhook secret | generated | generated |
| A Turso database URL and token | [turso.tech](https://turso.tech) | Vercel only |
| Clerk publishable & secret keys | [clerk.com](https://clerk.com) | for merchant self-serve auth |
| A domain you control | Cloudflare | yes |

The only Telegram credential in the whole product is the manager bot token.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `RELAY_DATA_DIR` | `~/.relay-gateway` | SQLite file, keys |
| `RELAY_HOST` | `127.0.0.1` | HTTP bind address |
| `RELAY_PORT` | `8787` | HTTP port |
| `RELAY_PUBLIC_URL` | `http://host:port` | Base URL for connect links |
| `RELAY_DATABASE_URL` | — | A remote database (Turso). Empty means a local file. |
| `RELAY_DATABASE_AUTH_TOKEN` | — | The token for that database |
| `RELAY_ADMIN_KEY` | generated | The platform key |
| `RELAY_MANAGER_BOT_TOKEN` | — | The manager bot that holds managed-bot tokens |
| `RELAY_MANAGER_BOT_USERNAME` | — | Its `@username`, for the deep link |
| `RELAY_TELEGRAM_WEBHOOK_SECRET` | generated | Header Telegram sends us |
| `RELAY_ENCRYPTION_KEY` | generated | 32 bytes, hex or base64 |
| `RELAY_DEMO` | `0` | Use the fake Telegram client |
| `RELAY_PLAN` | `selfhost` | `selfhost` or `hosted` |
| `RELAY_LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | — | Clerk publishable key for merchant auth (`pk_...`) |
| `CLERK_SECRET_KEY` | — | Clerk backend secret key for JWT verification (`sk_...`) |

## Security

- Bot tokens are encrypted at rest (AES-256-GCM) and are **never** returned by any endpoint.
- API keys are stored as hashes and shown once.
- The dashboard requires a session (an HMAC-signed cookie) obtained with the platform key.
- A tenant key can only read and write its own tenant. Cross-tenant access is a 400, not a
  silent empty result.
- The Telegram webhook is authenticated with a secret header.

## Development

```sh
npm ci
npm test           # vitest, offline, no network
npm run typecheck
npm run lint
npm run build
```

The test suite covers the connect flow end to end against a fake Telegram client, tenant
isolation, the plan limits, the crypto, the rate limiter, the HTTP API, the MCP surface over a
real client/server pair, and the web UI.

`AGENTS.md` is the guide for AI coding agents working on this repo. `docs/plan.md` is the design.

## License

AGPL-3.0. Self-host it, host it for your tenants, or run it as a service — if you modify it and
run it as a service, publish your modifications.
