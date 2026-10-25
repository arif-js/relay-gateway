# Deployment

Two supported ways to run it. Both serve the same application; the only
difference is where the process runs and where the database lives.

| | A small VPS (recommended) | Vercel (serverless) |
|---|---|---|
| Cost | ~$5/month for the box | $0 to start, then Vercel's usage pricing |
| Database | A SQLite file on a volume | Turso (libSQL), free tier |
| Rate limiting | One shared limiter, exactly right | Per instance (see the caveat below) |
| Reloading | `docker compose up -d` | A redeploy |
| You manage | The box | Nothing |

**The VPS is the better default.** One long-lived process means one rate
limiter, one SQLite file, no cold starts, and no vendor in the middle. The
Vercel path exists because it costs nothing to start and deploys from Git.

---

## The keys and credentials you need

Everything the platform needs, and where it comes from.

### 1. A Telegram manager bot — required

This is the bot that creates and holds your tenants' bots. It is the only
Telegram credential you need.

1. Open [@BotFather](https://t.me/botfather) and send `/newbot`.
2. Give it a name and a username. The username is the one you will need below.
3. Open the bot's settings and turn on **Bot Management Mode**.

That flag is what lets your manager bot create a bot on a user's behalf and
fetch its token. Without it, `getManagedBotToken` returns
`BOT_BUSINESS_MISSING` and the connect flow never completes.

Turn on **Secretary Mode** as well when you want Mode B (replying as a
customer's business account). It is not needed for Mode A.

You get two values:

| Value | Where | Example |
|---|---|---|
| The bot token | @BotFather, after it issues the token | `123456:AAE...` |
| The bot username | @BotFather, or the bot's URL | `your_manager_bot` |

### 2. Your public URL — required

The address your customers will see in their connect links, and the address
Telegram will call with updates. It must be **HTTPS**.

| Deployment | Where it comes from |
|---|---|
| VPS | Your domain, e.g. `https://relay.example.com` |
| Vercel | Your Vercel domain, e.g. `https://relay.vercel.app` |

### 3. The platform key — generated

The `rg_admin_…` key that L2 uses to create tenants. It is generated on first
boot and written to `admin.key` in the data directory. Set `RELAY_ADMIN_KEY`
explicitly in production so it lives in your secret manager, not on a disk.

```sh
node -e "console.log('rg_admin_' + require('crypto').randomBytes(24).toString('base64url'))"
```

### 4. The encryption key — generated, and you must keep it

Bot tokens are encrypted at rest with this key. **Lose it and every stored bot
token is gone** — your tenants have to reconnect. Store it somewhere other than
the box.

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 5. The Telegram webhook secret — generated

The secret Telegram sends in the `X-Telegram-Bot-Api-Secret-Token` header, so
we can tell a real update from a forged one. Generated on first boot and
written to `telegram-webhook.secret`.

### 6. Cloudflare — a domain and a DNS record

You need a domain you control. Cloudflare's free tier is enough.

- **VPS:** a DNS `A` record pointing the subdomain at the box's IP address.
  Keep the orange cloud **on** — Cloudflare then terminates TLS and proxies to
  your origin.
- **Vercel:** a `CNAME` record pointing the subdomain at your Vercel
  deployment. Vercel tells you the exact name to use.

### 7. Vercel only — a Turso database

A serverless function has no disk to keep a SQLite file on, so the database
has to be remote.

1. Create an account at [turso.tech](https://turso.tech) and a database.
2. Copy the database URL (`libsql://your-db.turso.io`) and the auth token.

The free tier is more than enough for a beta.

---

## Option A — a small VPS (recommended)

Any $5-a-month box with 1 GB of RAM works: Hetzner, Contabo, DigitalOcean,
Vultr, or a free Oracle/Aiven credit if you can find one.

### 1. Install Docker

```sh
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER" && newgrp docker
```

### 2. Get the code and write the environment file

```sh
git clone https://github.com/arif-js/relay-gateway
cd relay-gateway
cp relay.env.example relay.env
$EDITOR relay.env
```

Fill in `RELAY_PUBLIC_URL`, `RELAY_ADMIN_KEY`, `RELAY_ENCRYPTION_KEY`,
`RELAY_MANAGER_BOT_TOKEN` and `RELAY_MANAGER_BOT_USERNAME`. Leave
`RELAY_DATA_DIR=/data`.

### 3. Run it

```sh
docker compose up -d
docker compose logs -f relay
curl -s localhost:8787/healthz
```

### 4. Put TLS in front of it

The compose file binds the app to `127.0.0.1:8787`, so only a reverse proxy on
the same box can reach it. Caddy is the shortest path — it gets a certificate
by itself:

```sh
sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:

```
relay.example.com {
    reverse_proxy 127.0.0.1:8787
}
```

```sh
sudo systemctl reload caddy
```

Caddy asks Let's Encrypt for a certificate. If Cloudflare's proxy is on, use
Cloudflare's **Full (strict)** SSL mode and point Caddy at the origin.

### 5. Point the DNS at it

In Cloudflare's DNS panel, add an `A` record:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `relay` | your server's IPv4 | Proxied (orange) |

The address is now `https://relay.example.com`.

### 6. Point Telegram at the webhook

```sh
SECRET=$(cat ~/.relay-gateway/telegram-webhook.secret)
curl -X POST "https://api.telegram.org/bot$RELAY_MANAGER_BOT_TOKEN/setWebhook" \
  -d "url=https://relay.example.com/v1/telegram/webhook" \
  -d "secret_token=$SECRET" \
  -d 'allowed_updates=["managed_bot","message"]'
```

Check it:

```sh
curl -s "https://api.telegram.org/bot$RELAY_MANAGER_BOT_TOKEN/getWebhookInfo"
```

You want `"url"` to be your webhook and `"pending_update_count"` to stay at 0.

### 7. Back up the database and the key

```sh
sudo docker compose exec relay tar czf - -C /data . > relay-$(date +%F).sql.gz
```

Back up the encryption key separately. The database without the key is a
database full of ciphertext you cannot read.

---

## Option B — Vercel (serverless)

### 1. Create the database

At [turso.tech](https://turso.tech): create a database, then copy the URL and
the token.

```sh
turso db create relay
turso db tokens create --type jwt
```

### 2. Push the code and import the project

```sh
git remote add vercel https://github.com/arif-js/relay-gateway
npx vercel link
npx vercel env add RELAY_DATABASE_URL production
npx vercel env add RELAY_DATABASE_AUTH_TOKEN production
npx vercel env add RELAY_ADMIN_KEY production
npx vercel env add RELAY_ENCRYPTION_KEY production
npx vercel env add RELAY_MANAGER_BOT_TOKEN production
npx vercel env add RELAY_MANAGER_BOT_USERNAME production
npx vercel env add RELAY_TELEGRAM_WEBHOOK_SECRET production
npx vercel env add RELAY_PUBLIC_URL production
npx vercel env add RELAY_PLAN production
```

`RELAY_PUBLIC_URL` must be your Vercel domain
(`https://<your-project>.vercel.app`) or your Cloudflare subdomain. Set it
after the first deploy, when you know the domain.

`RELAY_PLAN=hosted` gives the beta limits (3 tenants, 2,000 messages a month,
5 webhooks). Use `selfhost` for no limits.

### 3. Deploy

```sh
npx vercel --prod
```

### 4. Add the Cloudflare subdomain

In Cloudflare's DNS panel:

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `relay` | `cname.vercel-dns.com` | Proxied (orange) |

Then add the custom domain to the Vercel project
(**Settings → Domains → Add**). Vercel issues the certificate.

### 5. Point Telegram at the webhook

Same as the VPS, with your Vercel or Cloudflare URL:

```sh
curl -X POST "https://api.telegram.org/bot$RELAY_MANAGER_BOT_TOKEN/setWebhook" \
  -d "url=https://relay.example.com/v1/telegram/webhook" \
  -d "secret_token=$RELAY_TELEGRAM_WEBHOOK_SECRET" \
  -d 'allowed_updates=["managed_bot","message"]'
```

### The serverless caveats

- **The rate limiter is per instance.** Vercel runs several copies of a
  function, and each has its own bucket. At beta traffic this is invisible; if
  it ever matters, move the bucket into the database.
- **Cold starts.** The first request after an idle minute takes a second or
  two. Telegram's webhook has a 60-second budget, so it is fine.
- **The database is a network call.** Every request now talks to Turso. It is
  fast, but it is not a local file read.

---

## After it is up

### 1. Create your first tenant

```sh
curl -X POST https://relay.example.com/v1/tenants \
  -H "Authorization: Bearer $RELAY_ADMIN_KEY" \
  -H "content-type: application/json" \
  -d '{"name":"Sara'"'"'s Phone Shop"}'
```

It returns the tenant's `rg_live_…` key. That key is shown once.

### 2. Mint a connect link and send it to them

```sh
curl -X POST https://relay.example.com/v1/tenants/$TENANT_ID/connect-links \
  -H "Authorization: Bearer $RELAY_ADMIN_KEY"
```

The `url` is a page your customer opens. They pick a bot name, Telegram
creates the bot, and the tenant flips to `connected`.

### 3. Send a message

```sh
curl -X POST https://relay.example.com/v1/messages \
  -H "Authorization: Bearer $TENANT_KEY" \
  -H "content-type: application/json" \
  -d '{"chat_id":15551234567,"text":"Your order #412 ships tomorrow."}'
```

A bot can only message people who have started a chat with it. To try this
end to end, message the tenant's bot from your own Telegram account first,
then send to your own user id.

### 4. Use the console

`https://relay.example.com/dashboard`. Sign in with `RELAY_ADMIN_KEY`. It
shows tenants, their connection state, the connect link, the message log, and
a panel for sending a test message.

---

## Troubleshooting

**The connect link never completes.** The manager bot has no *Bot Management
Mode*, or the webhook is not reaching us. Check `getWebhookInfo` and the
server logs.

**Telegram says `BOT_BUSINESS_MISSING`.** That is a manager bot without
*Bot Management Mode*. Turn it on in @BotFather.

**`401` on every request.** The key is wrong, or it was rotated. The platform
key is in `admin.key` in the data directory unless you set `RELAY_ADMIN_KEY`.

**`429` on sends.** Telegram is throttling. The limiter already handles this;
a 429 that reaches you means the limit was exceeded by several instances at
once, which is the serverless caveat above.

**The webhook is not receiving updates.** Telegram only delivers webhooks over
HTTPS, on ports 443, 80, 88 and 8443. A self-signed certificate is not
accepted — use a real one.

**Everything is encrypted and nobody can read it.** The encryption key changed.
Find the old one; it is not recoverable from the database.
