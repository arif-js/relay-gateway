# Security policy

## Reporting a vulnerability

Email the maintainer or open a private security advisory on the repository. Please do not open a
public issue for a vulnerability.

## What this project handles

Relay Gateway holds two kinds of secret:

- **Bot tokens.** Telegram gives the platform the token of each tenant's bot. It is encrypted at
  rest with AES-256-GCM (`RELAY_ENCRYPTION_KEY`) and is **never** returned by any endpoint, log
  line, error message or MCP result.
- **API keys.** `rg_admin_…` and `rg_live_…` are stored as sha256 hashes. The plaintext is
  returned exactly once, at creation.

Losing `RELAY_ENCRYPTION_KEY` means losing every stored bot token. Back it up separately from the
database.

## The rules the code enforces

- **Tenant isolation.** A tenant-scoped key can only read and write its own tenant's rows.
  Cross-tenant access is rejected, not silently empty.
- **The dashboard requires a session.** An HMAC-signed cookie obtained with the platform key.
  The dashboard shows tenant names, connect links and message logs, so it is never public.
- **The Telegram webhook is authenticated** with the `X-Telegram-Bot-Api-Secret-Token` header.
- **Connect links are bearer secrets.** Anyone with the link can connect a bot to that tenant. The
  token is stored hashed and sealed; it is shown once at creation and can be re-shared from the
  dashboard to the operator only.

## Operator guidance

- Run behind TLS. Telegram only delivers webhooks over HTTPS, and your connect links go to
  customers.
- Set `RELAY_ENCRYPTION_KEY` explicitly in production. The generated fallback lives in the data
  directory, which is fine for a laptop and not for a server.
- Set `RELAY_ADMIN_KEY` explicitly, or read it from the data directory on first boot and store it
  in your secret manager.
- Back up the SQLite file and the encryption key together. One without the other is useless.
- The MCP server runs with the platform key's authority. Do not expose its stdio transport to
  anything untrusted.
