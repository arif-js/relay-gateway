---
name: change-web-ui
description: "Use when changing the web UI, the stylesheet, or a page."
---

# Changing the web UI

The UI is server-rendered HTML, one stylesheet, and a little vanilla JS. No framework, no
bundler, no CDN, no client build step. That is a constraint, not a preference: the whole point is
that a self-hoster gets a working product with `npm install` and nothing else.

## Where things live

| File | What it holds |
|---|---|
| `src/ui/styles.css` | The whole design system. Tokens at the top, then components. |
| `src/ui/app.js` | Copy buttons, the connect form, the send form. Plain ES2020, no modules. |
| `src/ui/pages.ts` | The layout, the landing page, the pricing page. |
| `src/ui/dashboard.ts` | The connect page, the dashboard, the docs page. |
| `src/ui/tenant.ts` | The tenant page, the sign-in page. |
| `src/http/html.ts` | The `html` tag and the escaping rules. |

## Rules

1. **Use the `html` tag for every page.** It escapes interpolated values and leaves the literal
   parts as markup. Interpolating a raw HTML string gets it escaped — that bug shipped once and
   broke every page. Use `html\`\`` for fragments and pass them as values; the tag marks them raw
   so they nest correctly.
2. **Never interpolate HTML into an attribute.** `class="${'hidden'}"` becomes
   `class="&quot;hidden&quot;"` and the class silently stops working. Put the class name in the
   literal and interpolate only the value: `class="connect-form${done ? ' hidden' : ''}"`.
3. **Keep the Warm Editorial Developer design system.** Follow
   `.agents/skills/warm-editorial-design/SKILL.md`. Warm paper canvas (`#FAF8F5` / `#fbf9f6`),
   sand insets (`#F4EFEB` / `#f4f0ea`), deep ink charcoal (`#18181B` / `#1a1714`), hairline rules
   (`#E6DFD5` / `#e2dbd1`), and vermilion accent (`#D84F1D` / `#b4532a`). Serif display
   (EB Garamond / Iowan Old Style), sans body (Hanken Grotesk / system sans), mono for code and
   labels (JetBrains Mono). Hairline rules, generous whitespace. No purple gradient, no
   glassmorphism, no card with four shadows.
4. **No new dependencies.** No CDN links, no web fonts from a third party, no framework. The
   stylesheet uses system fonts on purpose.
5. **Every page works without JavaScript.** The connect form posts normally and the server
   redirects. The script upgrades it to a fetch. A page that only works with JS is a page that
   does not work for the customer's phone on a bad connection.
6. **The dashboard needs a session.** Never render tenant names or message logs on a public page.
7. **Copy must be honest.** "Send order updates from your real account" is a lie for Mode A — the
   sender is a bot. Say what it is.

## Adding a page

1. Add the route in `src/http/server.ts` (public pages) or in the dashboard section (session
   pages).
2. Write the page function in the right `src/ui/*.ts` file, returning `layout({ …, body })`.
3. Add the nav entry in `NAV` in `src/ui/pages.ts` if it belongs in the header.
4. Add a test in `test/unit/ui.test.ts`. The UI tests exist because escaping bugs live here, not
   in the browser.

## Checking your work

```sh
npm run build && RELAY_DEMO=1 node dist/cli.js serve
```

Then walk the flow: landing → pricing → docs → sign in → dashboard → tenant → connect link →
connect page → send. `npm run lint` must be clean; Biome checks the CSS and the JS too.
