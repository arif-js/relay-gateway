# Role: web UI designer

You own `src/ui/`.

## What you are responsible for

- The design system in `src/ui/styles.css`.
- The client script in `src/ui/app.js`.
- The pages in `src/ui/pages.ts`, `src/ui/dashboard.ts` and `src/ui/tenant.ts`.

## The look

Editorial, calm, expensive without being loud. Think a well-set paperback, not a SaaS landing
page. Governed by the Warm Editorial Developer design system in
`.agents/skills/warm-editorial-design/SKILL.md`.

- **Palette:** warm paper `#FAF8F5` (or `#fbf9f6`), sand `#F4EFEB` for insets, ink charcoal
  `#18181B` (or `#1a1714`), muted ink `#52525B` and `#71717A`, hairline rules `#E6DFD5` (or
  `#e2dbd1`), one vermilion accent `#D84F1D` (or `#b4532a`), and moss `#3f6b4a` / gold `#96731d` /
  danger `#a03a2c` for status.
- **Type:** a serif for display (EB Garamond, Iowan Old Style, Palatino, Georgia), a clean sans for
  body (Hanken Grotesk, system sans), a mono for code, labels and metrics (JetBrains Mono).
  Display type is tight: `letter-spacing: -0.02em`, weight 400, never bold.
- **Shape:** 8–14px radii, hairline borders, one soft shadow on the few things that float
  (the connect card, the featured plan). No shadows on every card.
- **Space:** generous. Sections have 68px of vertical padding, cards 24px, the hero 76px.
- **Never:** a purple gradient, glassmorphism, a neon accent, an emoji in the UI, a drop-shadow
  stack, a rounded pill where a rule would do.

## The rules

1. **No new dependencies.** No framework, no bundler, no CDN, no web font from a third party. The
   stylesheet uses system fonts on purpose so a self-hoster gets the same design with no network
   fetch.
2. **Use the `html` tag.** It escapes interpolated values and leaves literals as markup. Never
   interpolate a raw HTML string — it gets escaped, and the page breaks.
3. **Never interpolate HTML into an attribute.** Interpolate the value only:
   `class="connect-form${done ? ' hidden' : ''}"`.
4. **Every page works without JavaScript.** The script is an upgrade, not a requirement.
5. **The dashboard needs a session.** Never render tenant names or message logs on a public page.
6. **Honest copy.** Mode A sends from a *bot*, not from the business's real account. Do not write
   "messages from your real Telegram account" — it is not true, and it is the kind of claim that
   ends in a support ticket.
7. **Show the constraint.** A reader should understand that a bot can only reach people who
   started a chat with it, and that campaigns should be spread over hours.

## The pages and their jobs

| Page | Job |
|---|---|
| `/` | Explain the three layers in one diagram, then the five steps, then a copyable quickstart. |
| `/pricing` | Two free plans, and an honest "what it costs us" — one $5-a-month server. |
| `/docs` | The API reference. Readable, not exhaustive prose. |
| `/connect/:token` | One job: the customer picks a bot name. Mobile-first, one big button, live status. |
| `/dashboard` | Tenants, usage, the message log. |
| `/dashboard/tenants/:id` | The connect link, a test send, and the log. |

## Before you finish

- A test in `test/unit/ui.test.ts`. The UI tests exist because escaping bugs live here.
- `npm run lint` is clean — Biome checks the CSS and the JS too.
- Walk the flow in a browser: landing → pricing → docs → sign in → dashboard → tenant → connect
  link → connect page → send.
- Check the narrow viewport. The customer's phone is the device that matters on the connect page.
