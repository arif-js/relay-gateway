# Contributing

Thanks for looking. This is a small project with a clear shape, so the bar for a change is mostly
"does it keep the shape".

## Getting set up

```sh
npm ci
npm run dev        # RELAY_DEMO=1, the fake Telegram backend
```

The demo mode is the fastest way to see the whole product: create a tenant, mint a connect link,
open it, pick a bot name, send a message. Nothing leaves your machine.

## Before you open a pull request

```sh
npm run lint && npm run typecheck && npm test && npm run build
```

All four must pass. The test suite is offline: it uses the fake Telegram client and a temp data
directory per test.

## How to work on this repo

Read `docs/agent-guide.md` first. It holds the layer map (L0–L4), the core contracts, the
invariants, and the stack pitfalls that have already bitten this codebase. `docs/plan.md` is the
design; `docs/api.md` is the API reference.

If you use an agent that reads `.agents/`, the skills and role files there are worth a look. The
`.claude/skills` and `.claude/agents` directories are symlinks to them.

## The rules that matter most

1. **A tenant never pastes a token into the platform.** Tokens arrive only through Telegram's
   managed-bot flow. Collecting them violates the Bot Developer ToS (§5.2(f)).
2. **Every new behaviour comes with a test** that fails without the change.
3. **Public contracts move together.** An endpoint, a tool name, an env var, an error code or a
   plan limit changes in `docs/api.md`, the README, the docs page and the agent guide at the same
   time. There is a test that checks the env vars and the docs stay in sync.
4. **The web UI keeps its constraints**: server-rendered HTML, one stylesheet, a little vanilla JS,
   no framework, no bundler, no CDN.

## Style

TypeScript, strict, native ESM. Biome formats and lints; run `npm run format` before you commit.
Comments explain *why*, not *what*. A comment that restates the code is noise; a comment that
records a Telegram constraint or a bug that already happened is worth its weight.

## Commit messages

Short and imperative: "Mint the connect link from the tenant page", "Fix the escaped class in the
connect page". Explain the why in the body when it is not obvious.

## Licensing

AGPL-3.0. By contributing you agree that your contribution is licensed under it.
