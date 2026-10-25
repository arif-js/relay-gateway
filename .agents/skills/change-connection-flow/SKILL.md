---
name: change-connection-flow
description: "Use when changing the connect flow, the managed-bot handling, or the Telegram client."
---

# Changing the connect flow

The connect flow is the heart of the product. Get it wrong and the platform stops working
silently, because the failure is on Telegram's side, not ours.

## The flow

```
L2  POST /v1/tenants/:id/connect-links      → a link with a random token
L3  opens /connect/:token, picks a name
    POST /v1/connect/:token/complete        → we return a t.me/newbot deep link
Telegram creates the bot
    → managed_bot update arrives at /v1/telegram/webhook
    → we call getManagedBotToken(managerToken, userId)
    → we seal the token, mark the tenant connected
L2  POST /v1/messages                        → we send with that token
```

## Rules

1. **Never ask a tenant for a token.** Tokens come from Telegram's managed-bot flow. Collecting
   them is the "operate by proxy with other users' Bot API credentials" case that Bot Developer
   ToS §5.2(f) forbids, and it gets the platform banned.
2. **`getManagedBotToken` takes the user id of the managed bot.** The `managed_bot` update carries
   `user` (the creator) and `bot` (the bot). Try the bot id first, fall back to the creator id,
   and log which one worked. If you only try one, the connect flow sometimes never completes and
   there is no error to look at.
3. **The bot username must end in `bot`**, 5–32 characters, letters/digits/underscore only. The
   `t.me/newbot` deep link needs it with the suffix.
4. **A bot can only message people who started a chat with it.** Never write copy that implies
   otherwise.
5. **The demo path must exercise the same code.** `createFakeTelegramClient().provisionManagedBot`
   exists so the flow is testable offline. If you add a step to the live flow, add it to the fake.
6. **The connect token is stored twice**: hashed (for lookup) and sealed (so the operator can
   re-share the link from the dashboard). Do not return the plaintext in an API response after
   creation.
7. **Never return the bot token.** It is sealed in `tenants.bot_token_enc` and that column is
   never serialised into a response.

## Verifying a change

- `test/unit/connect-flow.test.ts` covers the whole flow against the fake.
- `test/integration/http-api.test.ts` covers it over HTTP.
- Manually: `RELAY_DEMO=1 npm run dev`, then walk the dashboard → connect link → connect page →
  send.
- Against real Telegram: you need a manager bot with *Bot Management Mode* enabled in @BotFather,
  and a webhook on `https://…/v1/telegram/webhook` with the secret header. Telegram only delivers
  webhooks over HTTPS on ports 443, 80, 88 and 8443.
