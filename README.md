<p align="center">
  <img src="docs/logo.png" alt="Relay Gateway Logo" width="320">
</p>

# Relay Gateway

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node-%3E%3D22.16-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Live Demo](https://img.shields.io/badge/Demo-relay.arifcodes.com-orange.svg)](https://relay.arifcodes.com)

**Add Telegram to your product. In an afternoon.**

Relay Gateway is the multi-tenant layer between your product and Telegram. You send a customer a
link; they pick a bot name; Telegram creates a bot in their name; you then message their
end-users through it.

> **Live Preview:** Explore the production instance at **[relay.arifcodes.com](https://relay.arifcodes.com)**, or test merchant authentication at **[relay.arifcodes.com/login](https://relay.arifcodes.com/login)**.

What the layer gives you is the part that takes a month if you build it yourself:

- **One API for every customer.** Each customer is a tenant with its own scoped key, and the
  isolation is enforced for you.
- **Onboarding that does not leak credentials.** No customer pastes a token into your product, and
  neither do you. We fetch it through Telegram's own managed-bot flow and encrypt it.
- **Your customer keeps their sender.** Their name, their control, revocable by them.
- **Events, not polling.** Every send, failure and connection is pushed to your URL, signed, and
  written to a per-tenant message log.
- **Rate limits handled.** One shared limiter, `retry_after` honoured exactly, so your bot does
  not get muted.
- **A console and an MCP server.** Both included; neither is another thing to build.

No Telegram Business approval. No per-message fees. Nobody pastes a token into a form.

```
L0  Telegram            the infrastructure. we do not own it.
L1  Relay Gateway       this platform. API, webhooks, MCP, dashboard.
L2  The SaaS vendor     deploys Relay Gateway. calls our API.
L3  The tenant          L2's customer. a business. connects its own bot.
L4  The end user        the person who receives the message.
                         never sees this platform.
```

"Customer" means two different people here: L2's customer is L3, and L3's customer is L4. The
difference is the whole product — the end user must receive the message from *the business they
chose*, not from a shared platform account.

---

## Why Telegram, and why not a shared bot

A plain bot can only talk to people who opened a chat with it. That kills the use case most
products want: telling a customer their order shipped.

So Relay Gateway does not ask your customer for a bot. It asks Telegram to create one *for* them:

1. You create a tenant and mint a connect link.
2. Your customer opens the link and picks a bot name.
3. We hand back a `t.me/newbot` deep link. Telegram does the creating.
4. Telegram tells our manager bot about it; we fetch the token and seal it.
5. You send.

The customer keeps their bot and can revoke us at any time. We hold the token so we can send on
their behalf. That is the sanctioned path — Telegram ships `getManagedBotToken` for exactly this,
and collecting a customer's token to proxy their traffic is explicitly forbidden by the Bot
Developer ToS (§5.2(f)).

## What it does not do (yet)

Telegram also lets a bot read and reply to a *business account*'s DMs — a "Secretary". That is a
different product surface with a hard constraint: the bot may only reply in private chats that had
an incoming message in the **last 24 hours**. It is a conversation mechanism, never a campaign
mechanism. Mode B is designed for in `docs/plan.md` and the storage columns already exist, but it
is not in v0.1.

## Install

```sh
git clone https://github.com/arif-js/relay-gateway
cd relay-gateway
npm install
npm run build
```

Requires Node ≥ 22.16. Runtime dependencies: the MCP SDK and zod. Nothing else.

## Try it in 30 seconds

```sh
RELAY_DEMO=1 npm run dev
```

Demo mode fakes Telegram in-process: nothing leaves your machine, and the whole flow — create a
tenant, mint a link, connect a bot, send a message — is clickable in the browser.

Open <http://localhost:8787>, sign in to the console with the printed key, and follow the flow.

## Run it for real

```sh
export RELAY_MANAGER_BOT_TOKEN=123456:AA...
export RELAY_MANAGER_BOT_USERNAME=your_manager_bot
export RELAY_PUBLIC_URL=https://relay.example.com
export RELAY_PLAN=hosted
node dist/cli.js serve
```

Two things to set up first:

1. **A manager bot.** Create one with [@BotFather](https://t.me/botfather) and turn on *Bot
   Management Mode* (and *Secretary Mode*, when Mode B lands). This is the bot that creates and
   holds the managed bots.
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

## Autonomous AI Customer Support Agent Example

An end-to-end autonomous customer support bot is included in [`examples/ai-sales-agent.mjs`](examples/ai-sales-agent.mjs).

```text
[Customer] ➔ (Telegram) ➔ [Relay Gateway] ➔ (Signed Webhook) ➔ [SalesShop AI Agent] ➔ (Relay API) ➔ [Telegram] ➔ [Customer]
```

When a customer messages the merchant's bot on Telegram:
1. Relay Gateway pushes the `message.received` event to the merchant's webhook over HTTPS.
2. The AI Agent (`examples/ai-sales-agent.mjs`) verifies the HMAC signature, queries the customer order database (order status, tracking ETA, return policies), and generates an intelligent contextual response with Gemini, OpenAI, or the built-in matcher.
3. The agent dispatches the response via `POST /v1/messages` through Relay Gateway, delivering it instantly back to the customer on Telegram.

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
20/minute per group, 30/second overall. On a 429 we sleep exactly as long as Telegram says. If
you need more than 30/second, Telegram's Paid Broadcasts cost 0.1 Stars per message, charged to
the bot's balance.

A bot can only message people who have started a chat with it. That is Telegram's rule, not ours.

## Pricing

Free, for now. Both plans.

| | Self-host | Hosted |
|---|---|---|
| Price | Free | Free |
| Tenants | Unlimited | 3 |
| Messages/month | Unlimited | 2,000 |
| Webhooks | Unlimited | 5 |

Telegram charges nothing for normal sending, so the whole platform costs **us** one $5-a-month
server and a domain. While there are no users to serve there is nothing to charge for, so the
hosted plan is free too.

The hosted plan still has ceilings — three tenants, 2,000 messages a month — so one busy customer
cannot eat the whole of a $5 server. If you need more than that, self-host it: unlimited, no
limits, AGPL-3.0, forever.

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

AGPL-3.0. Self-host it, host it for your customers, or run it as a service — if you modify it and
run it as a service, publish your modifications.
