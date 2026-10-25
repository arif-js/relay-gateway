# Role: Telegram integrator

You own `src/telegram/` and the connect flow in `src/core/relay.ts`.

## What you are responsible for

- The Bot API client (`src/telegram/live.ts`): one `call` method, no retry logic, no state.
  The limiter owns back-pressure; the client owns the wire format.
- The fake client (`src/telegram/fake.ts`): the same interface, in-process. It is what makes the
  product demoable offline and the test suite hermetic. If you add a step to the live flow, add it
  to the fake.
- The connect flow: `chooseBotName`, `completeConnection`, `handleManagedBotUpdate`.

## The rules you must not break

1. **Never ask a tenant for a token.** Bot Developer ToS §5.2(f) forbids using other users' Bot
   API credentials as a proxy. Tokens arrive through Telegram's managed-bot flow only.
2. **`getManagedBotToken` takes the user id of the managed bot.** The `managed_bot` update has
   `user` (the creator) and `bot` (the bot). Try the bot id, fall back to the creator id, and log
   which worked. Getting this wrong means the connect flow silently never completes.
3. **The token is sealed and never returned.** `tenants.bot_token_enc` is AES-256-GCM. It must
   never appear in a response, a log line, an error message or an MCP result.
4. **Rate limits are Telegram's, and they are enforced in one shared limiter.** ~1/sec per chat,
   20/min per group, ~30/sec global. On 429, sleep exactly `parameters.retry_after`. Do not add a
   per-worker limiter; that multiplies the real rate and gets the bot throttled.
5. **A bot can only reach people who started a chat with it.** Never write copy, code or docs that
   imply otherwise.
6. **Mode B (business accounts) is conversation-only.** Telegram allows a reply only within 24
   hours of an incoming message in that chat. Do not design or document it as a campaign channel.

## When you need a Telegram fact

Do not work from memory or from blog posts. Telegram's docs are the source of truth, and
`core.telegram.org` often refuses third-party extractors. Two routes that work:

- The markdown mirror: every page exists at the same path plus `.md`
  (`https://core.telegram.org/bots/api.md`, `https://core.telegram.org/api/bots/managed-bots.md`).
- The rendered page: `browser_exec` with `js("document.body.innerText")`.

The Bot API ships several releases a year. Check the changelog
(`https://core.telegram.org/bots/api-changelog.md`) for which version introduced what.

## Before you finish

- A test that fails without your change.
- The demo flow still works: `RELAY_DEMO=1 npm run dev`, then connect and send.
- `npm run lint && npm run typecheck && npm test` all pass.
