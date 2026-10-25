# API reference

Base path `/v1`. Every response uses the same envelope.

```json
{ "ok": true,  "data": { }, "warnings": [] }
{ "ok": false, "error": { "code": "BAD_INPUT", "message": "…", "hint": "…" } }
```

## Authentication

Send the key in the `Authorization` header:

```
Authorization: Bearer rg_live_xxxxxxxx
```

| Key | Scope |
|---|---|
| `rg_admin_…` | The platform key. Reaches every tenant. `RELAY_ADMIN_KEY`. |
| `rg_live_…` | Tenant-scoped. Touches only that tenant. Created with the tenant. |

Keys are stored hashed (sha256). The plaintext is returned once, at creation, and never again.

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `BAD_INPUT` | 400 | The request was malformed, or the key lacks the scope |
| `UNAUTHORIZED` | 401 | The key is missing or wrong |
| `NOT_FOUND` | 404 | No such tenant, webhook, message or link |
| `CONFLICT` | 409 | The link was already used |
| `NOT_CONNECTED` | 409 | The tenant has not connected a bot yet |
| `RATE_LIMITED` | 429 | Telegram throttled the send |
| `PLAN_LIMIT` | 402 | The plan's ceiling was reached |
| `TELEGRAM_ERROR` | 502 | Telegram rejected the call |
| `INTERNAL` | 500 | Our fault |

---

## Tenants

### `POST /v1/tenants` — create a tenant

Platform key only.

```json
{ "name": "Sara's Phone Shop" }
```

```json
{
  "ok": true,
  "data": {
    "id": "tn_8f3c…",
    "name": "Sara's Phone Shop",
    "status": "pending",
    "api_key": "rg_live_…",
    "created_at": "2026-10-22T10:41:40.238Z"
  }
}
```

The tenant's `api_key` is shown once. Store it.

### `GET /v1/tenants` — list tenants

Platform key: every tenant. Tenant key: only its own.

```json
{
  "ok": true,
  "data": [
    {
      "id": "tn_8f3c…",
      "name": "Sara's Phone Shop",
      "status": "connected",
      "mode": "managed_bot",
      "bot_username": "sara_phone_shop_bot",
      "created_at": "2026-10-22T10:41:40.238Z"
    }
  ]
}
```

`status` is `pending`, `connected` or `revoked`.

### `GET /v1/tenants/:id` — one tenant

Platform key, or the tenant's own key.

---

## The connect flow

### `POST /v1/tenants/:id/connect-links` — mint a link

Platform key, or the tenant's own key.

```json
{
  "ok": true,
  "data": {
    "connection_id": "cn_7b28…",
    "url": "https://relay.example.com/connect/_hYzg51fJ7tBEwMpp45rV94MkMSE9hMC",
    "token": "_hYzg51fJ7tBEwMpp45rV94MkMSE9hMC",
    "expires_at": "2026-10-29T10:41:43.764Z",
    "tenant_id": "tn_8f3c…"
  }
}
```

Send `url` to your customer. The link is valid for seven days.

### `GET /connect/:token` — the customer's page

Public. The customer picks a bot name here. The page works without JavaScript too.

### `POST /v1/connect/:token/complete` — choose the bot

Public. The token in the path is the credential.

```json
{ "username": "sara_phone_shop_bot", "display_name": "Sara's Phone Shop" }
```

Usernames must be 5–32 characters, letters/digits/underscore only, ending in `bot`.

Before handing back the Telegram link we check two things, so nobody lands on a dead end:
`CONFLICT` if the username is already taken on Telegram, and `TELEGRAM_ERROR` if the manager
bot does not have Bot Management Mode enabled in @BotFather.

```json
{
  "ok": true,
  "data": {
    "connection_id": "cn_7b28…",
    "status": "awaiting_bot",
    "next_url": "https://t.me/newbot/your_manager_bot/sara_phone_shop_bot?name=Sara%27s%20Phone%20Shop",
    "bot_username": null
  }
}
```

`next_url` is the Telegram deep link. Open it, and Telegram creates the bot. When the bot exists,
our webhook fires and the tenant becomes `connected`.

In demo mode there is no `next_url`: the bot is provisioned locally and `status` is `completed`.

### `GET /v1/connect/:token/status` — poll the link

Public. Used by the customer's page to notice the connection.

```json
{ "ok": true, "data": { "status": "completed", "bot_username": "sara_phone_shop_bot", "tenant_name": "Sara's Phone Shop" } }
```

---

## Messages

### `POST /v1/messages` — send

Tenant key required.

```json
{
  "chat_id": 15551234567,
  "text": "Your order #412 ships tomorrow.",
  "parse_mode": "HTML",
  "disable_notification": false,
  "protect_content": false
}
```

`chat_id` is a numeric user id or an `@username`. `text` is 1–4096 characters.

```json
{
  "ok": true,
  "data": {
    "id": "msg_8fba…",
    "chat_id": "15551234567",
    "status": "sent",
    "telegram_message_id": 412,
    "created_at": "2026-10-22T10:41:43.792Z"
  }
}
```

A bot can only message people who have started a chat with it. That is Telegram's rule.

### `GET /v1/messages` — the log

Tenant key. `?limit=` (1–200, default 50).

### `GET /v1/tenants/:id/messages` — one tenant's log

Platform key, or the tenant's own key. Same query parameters.

```json
{
  "ok": true,
  "data": [
    {
      "id": "msg_8fba…",
      "direction": "outbound",
      "chat_id": "15551234567",
      "text": "Your order #412 ships tomorrow.",
      "status": "sent",
      "error": null,
      "created_at": "2026-10-22T10:41:43.792Z"
    }
  ]
}
```

`direction` is `outbound` or `inbound`. `status` is `sent`, `delivered`, `failed` or `queued`.

---

## Webhooks

### `POST /v1/webhooks` — register

Tenant key (or the platform key plus `tenant_id`).

Webhook destinations must use HTTPS and resolve only to publicly reachable IP addresses. Delivery
does not follow redirects.

```json
{
  "url": "https://example.com/hooks/telegram",
  "events": ["message.sent", "message.received"]
}
```

```json
{ "ok": true, "data": { "id": "wh_1a2b…", "url": "https://example.com/hooks/telegram", "events": ["message.sent"], "secret": "…", "created_at": "…" } }
```

`secret` is the HMAC-SHA256 signing secret for this endpoint. Store it now — it is shown once.

### `GET /v1/webhooks` — list

Tenant key. `?tenant_id=` for the platform key.

### `DELETE /v1/webhooks/:id` — remove

Tenant key.

### The delivery

```http
POST /hooks/telegram
content-type: application/json
x-relay-event: message.sent
x-relay-signature: sha256=8f2b…
```

```json
{
  "type": "message.sent",
  "created_at": "2026-10-22T10:41:43.792Z",
  "data": {
    "message_id": "msg_8fba…",
    "chat_id": "15551234567",
    "telegram_message_id": 412,
    "text": "Your order #412 ships tomorrow."
  }
}
```

Verify the signature with an HMAC-SHA256 of the raw body using the secret returned at
registration:

```js
import { createHmac, timingSafeEqual } from 'node:crypto';

const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
const ok = timingSafeEqual(Buffer.from(expected), Buffer.from(req.headers['x-relay-signature']));
```

---

## Usage

### `GET /v1/usage`

Tenant key. `?tenant_id=` for the platform key.

```json
{ "ok": true, "data": { "period": "2026-10", "messages_sent": 128, "limit": 2000 } }
```

`limit` is `null` on the self-host plan.

---

## Telegram → us

### `POST /v1/telegram/webhook`

Telegram's webhook. Authenticated with the `X-Telegram-Bot-Api-Secret-Token` header, which must
equal `RELAY_TELEGRAM_WEBHOOK_SECRET`.

This is where `managed_bot` updates arrive. When Telegram reports a managed bot, we fetch its
token with `getManagedBotToken`, seal it, and mark the tenant `connected`.

Set it with:

```sh
curl -X POST "https://api.telegram.org/bot$MANAGER_TOKEN/setWebhook" \
  -d "url=https://relay.example.com/v1/telegram/webhook" \
  -d "secret_token=$RELAY_TELEGRAM_WEBHOOK_SECRET" \
  -d 'allowed_updates=["managed_bot","message"]'
```

### `POST /v1/telegram/bots/:tenant_id`

Updates for a tenant's own bot. You never call or configure this: when a tenant connects, we
call `setWebhook` on their bot pointing here, with a per-tenant secret derived from
`RELAY_TELEGRAM_WEBHOOK_SECRET`. A request without that secret gets `401`.

When an end user writes to the bot (including tapping `/start`), we log an `inbound` message
and fire `message.received` to the tenant's webhooks. This is how you learn an end user's
`chat_id`, which you need before you can message them:

```json
{
  "type": "message.received",
  "data": {
    "message_id": "msg_…",
    "chat_id": "777",
    "text": "/start",
    "from_username": "alice",
    "from_first_name": "Alice"
  }
}
```

Tenants connected before this existed have no webhook on their bot. Reconnect them to fix it.

---

## Health

### `GET /healthz`

Public. `{"ok":true,"data":{"status":"alive","demo":false,"plan":"selfhost"}}`

---

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `RELAY_DATA_DIR` | `~/.relay-gateway` | The SQLite file and the generated keys |
| `RELAY_HOST` | `127.0.0.1` | HTTP bind address |
| `RELAY_PORT` | `8787` | HTTP port |
| `RELAY_PUBLIC_URL` | `http://host:port` | The base URL customers see in connect links |
| `RELAY_DATABASE_URL` | — | A remote database (Turso / libSQL). Empty means the local file. |
| `RELAY_DATABASE_AUTH_TOKEN` | — | The token for that remote database |
| `RELAY_ADMIN_KEY` | generated | The platform key |
| `RELAY_MANAGER_BOT_TOKEN` | — | The manager bot that holds the managed-bot tokens |
| `RELAY_MANAGER_BOT_USERNAME` | — | Its `@username`, used to build the deep link |
| `RELAY_TELEGRAM_WEBHOOK_SECRET` | generated | The header Telegram sends us |
| `RELAY_ENCRYPTION_KEY` | generated | 32 bytes, hex or base64 |
| `RELAY_DEMO` | `0` | Use the fake Telegram client |
| `RELAY_PLAN` | `selfhost` | `selfhost` or `hosted` |
| `RELAY_LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |

`RELAY_ADMIN_KEY`, `RELAY_TELEGRAM_WEBHOOK_SECRET` and `RELAY_ENCRYPTION_KEY` are generated on
first boot and persisted in `RELAY_DATA_DIR`. Keep the encryption key: losing it means losing
every stored bot token.

---

## The dashboard (session authenticated)

The console is a browser UI, not an API. It uses a session cookie obtained from the platform key.

| Route | What it does |
|---|---|
| `GET /dashboard/login` | The sign-in page |
| `POST /dashboard/login` | Exchange the platform key for a session cookie |
| `POST /dashboard/logout` | Clear the session |
| `GET /dashboard` | Tenants, usage, the message log |
| `GET /dashboard/tenants/:id` | One tenant: connection state, connect link, send, log |
| `POST /dashboard/tenants/:id/connect` | Mint a connect link |
| `POST /dashboard/tenants/:id/send` | Send a test message |

The `send` route returns JSON when the request asks for it (`Accept: application/json`) and
redirects back to the page otherwise.
