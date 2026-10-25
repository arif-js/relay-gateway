import { getPlan, type Plan } from '../core/plans.js';
import { escapeHtml, html, type SafeHtml } from '../http/html.js';

export interface LayoutOptions {
  title: string;
  description?: string;
  current?: string;
  body: SafeHtml | string;
  bare?: boolean;
}

const NAV = [
  { href: '/', label: 'Overview', key: 'home' },
  { href: '/docs', label: 'Docs', key: 'docs' },
  { href: '/pricing', label: 'Pricing', key: 'pricing' },
  { href: '/dashboard', label: 'Dashboard', key: 'dashboard' },
];

export function layout(options: LayoutOptions): string {
  const { title, description, current, body, bare } = options;
  const nav = html`${NAV.map((item) =>
    item.key === current
      ? html`<a href="${item.href}" aria-current="page">${item.label}</a>`
      : html`<a href="${item.href}">${item.label}</a>`,
  )}`;

  const head = html`<header class="shell">
  <div class="masthead">
    <a class="wordmark" href="/">
      <img class="logo-img" src="/assets/logo.png" alt="Relay Gateway logo" width="60" height="26">
      <span>Relay Gateway</span>
    </a>
    <nav class="nav">${nav}</nav>
  </div>
</header>
<hr class="rule">`;

  const foot = html`<footer class="shell">
  <div class="footer">
    <div>AGPL-3.0 · self-host it, or let us run it. Free for now.</div>
    <div><a href="/docs">API reference</a> · <a href="/pricing">Pricing</a> · <a href="/healthz">Health</a></div>
  </div>
</footer>`;

  const clerkPublishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Relay Gateway</title>
<meta name="description" content="${escapeHtml(description ?? 'Multi-tenant Telegram messaging infrastructure for developers.')}">
<link rel="stylesheet" href="/assets/styles.css">
<link rel="stylesheet" href="/assets/main.css">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="alternate icon" type="image/png" href="/assets/favicon.png">
</head>
<body class="bg-[#fbf9f6] text-[#1a1714]">
<div id="root">
${bare ? '' : head.value}
${typeof body === 'string' ? body : body.value}
${bare ? '' : foot.value}
</div>
<script>window.__CLERK_PUBLISHABLE_KEY__ = ${JSON.stringify(clerkPublishableKey)};</script>
<script src="/assets/app.js"></script>
<script type="module" src="/assets/main.js"></script>
</body>
</html>`;
}

export function landingPage(): string {
  const body = html`
    <section class="hero">
      <div class="shell">
        <div class="eyebrow">Telegram infrastructure for developers</div>
        <h1>Add Telegram to your product.<br>In an afternoon.</h1>
        <p class="lede">
          Relay Gateway is the layer between your product and Telegram. It handles the
          multi-tenant machinery — onboarding, keys, isolation, quotas, logs, webhooks, rate
          limits — so you can add one API call to your app and your customers get their own
          Telegram sender, in their own name, that they own and can revoke.
        </p>
        <div class="actions">
          <a class="btn" href="/docs">Read the API reference</a>
          <a class="btn btn-ghost" href="/dashboard">Open the console</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="shell">
        <div class="section-head">
          <div class="eyebrow">What you get</div>
          <h2>The work we do, so you do not have to.</h2>
          <p>
            Sending a message over Telegram's API takes one HTTP request. Running Telegram for a
            hundred customers takes considerably more. That is the part we built.
          </p>
        </div>
        <div class="grid-3">
          <div class="card">
            <h3>One API for every customer</h3>
            <p>
              Each of your customers is a tenant with its own scoped key. Create one, and you get
              a key that can never read or write another tenant's data. We enforce the isolation.
            </p>
          </div>
          <div class="card">
            <h3>Onboarding that does not leak credentials</h3>
            <p>
              You send them a link. They pick a bot name; Telegram creates the bot for them. We
              fetch the token through Telegram's own managed-bot flow, so no customer ever pastes
              a credential into your product, and neither do you.
            </p>
          </div>
          <div class="card">
            <h3>Your customer keeps their sender</h3>
            <p>
              The bot is theirs. Their name, their control, revocable by them at any time. You are
              the infrastructure, not the sender — and you do not inherit the reputation of
              somebody else's message.
            </p>
          </div>
          <div class="card">
            <h3>Events, not polling</h3>
            <p>
              Register a URL and we push every send, failure and connection event to it, signed
              with an HMAC. You get a message log for every tenant without writing a line of
              bookkeeping.
            </p>
          </div>
          <div class="card">
            <h3>Rate limits handled</h3>
            <p>
              Telegram throttles hard: about 30 messages a second across the platform, one per
              second per chat, and 429s with a retry delay. We hold one shared limiter, we sleep
              exactly as long as Telegram says, and your bot does not get muted.
            </p>
          </div>
          <div class="card">
            <h3>Secrets handled</h3>
            <p>
              Bot tokens are encrypted at rest, write-only, and never returned by any endpoint.
              API keys are stored hashed. You never handle a customer credential, and you never
              store one in plain text.
            </p>
          </div>
          <div class="card">
            <h3>A console</h3>
            <p>
              Tenants, their connection state, the connect link to send them, the message log, and
              a panel for sending a test message. Built in, not something you have to write.
            </p>
          </div>
          <div class="card">
            <h3>Usable by your agents</h3>
            <p>
              The same operations are MCP tools, so Claude Code or Cursor can read a thread and
              send on a tenant's behalf. No second integration to build.
            </p>
          </div>
          <div class="card">
            <h3>Yours to self-host</h3>
            <p>
              One process, one database file, one command to run. AGPL-3.0, so if you run a
              modified version as a service, you publish the change and your users keep their data.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="shell">
        <div class="section-head">
          <div class="eyebrow">Who does what</div>
          <h2>Telegram creates the bot. We do everything else.</h2>
          <p>
            The division of labour matters, because the part Telegram does is the part you cannot
            do yourself, and the parts we do are the parts you would otherwise spend a month on.
          </p>
        </div>
        <div class="grid-3">
          <div class="card card-quiet">
            <h3>Telegram does</h3>
            <p>
              Creates the bot in your customer's name, holds the authoritative copy of it, delivers
              the messages, and enforces the rate limits. We do not replace any of that.
            </p>
          </div>
          <div class="card card-quiet">
            <h3>Relay Gateway does</h3>
            <p>
              Tenants and scoped keys. The connect flow. Fetching and encrypting the token.
              Isolation, quotas, usage. Message logs. Signed webhooks. Rate limiting. The console.
              The MCP server.
            </p>
          </div>
          <div class="card card-quiet">
            <h3>You do</h3>
            <p>
              Call one API. That is the whole integration.
            </p>
          </div>
        </div>

        <pre style="margin-top:30px"><code>L0  Telegram            creates the bot, delivers the messages, sets the limits.

L1  Relay Gateway       this platform. tenants, keys, connect flow, logs,
                         webhooks, quotas, rate limiting, console, MCP.

L2  The SaaS vendor     deploys Relay Gateway. calls our API.
      └─ their customer  "Acme Software" ships Telegram in its product

L3  The tenant          L2's customer. a business.
      └─ their customer  "Sara's phone shop" connects its own bot

L4  The end user        the person who receives the message.
                         never sees this platform.</code></pre>
      </div>
    </section>

    <section class="section">
      <div class="shell">
        <div class="section-head">
          <div class="eyebrow">The flow</div>
          <h2>Five steps, then you are sending.</h2>
        </div>
        <div class="steps">
          <div class="step">
            <div>
              <h3>Create a tenant</h3>
              <p>
                One API call gives you a tenant and its tenant-scoped key. The key can never touch
                another tenant's data.
              </p>
            </div>
          </div>
          <div class="step">
            <div>
              <h3>Mint a connect link</h3>
              <p>
                A hosted page your customer opens. It expires in seven days and can be re-shared
                from the console.
              </p>
            </div>
          </div>
          <div class="step">
            <div>
              <h3>They pick a bot name</h3>
              <p>
                We hand back a <span class="inline-code">t.me/newbot</span> deep link. Telegram does
                the creating; we never ask for a token.
              </p>
            </div>
          </div>
          <div class="step">
            <div>
              <h3>We fetch the token and seal it</h3>
              <p>
                A <span class="inline-code">managed_bot</span> update arrives; we ask Telegram for
                the token, encrypt it, and mark the tenant connected. Your customer sees their
                bot appear in Telegram.
              </p>
            </div>
          </div>
          <div class="step">
            <div>
              <h3>You send</h3>
              <p>
                One call per message. We handle the rate limiting, write the log, and push the
                event to your webhook.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="shell">
        <div class="section-head">
          <div class="eyebrow">Try it</div>
          <h2>Two calls and a message.</h2>
        </div>
        <div class="codeblock">
          <button class="copy" type="button">Copy</button>
          <pre><code># 1. create a tenant — we hand you its scoped key
curl -X POST https://relay.example.com/v1/tenants \\
  -H "Authorization: Bearer $RELAY_ADMIN_KEY" \\
  -H "content-type: application/json" \\
  -d '{"name":"Sara'"'"'s Phone Shop"}'

# 2. mint a connect link, send it to Sara
curl -X POST https://relay.example.com/v1/tenants/$TENANT_ID/connect-links \\
  -H "Authorization: Bearer $RELAY_ADMIN_KEY"

# 3. send a message as Sara'"'"'s bot
curl -X POST https://relay.example.com/v1/messages \\
  -H "Authorization: Bearer $TENANT_KEY" \\
  -H "content-type: application/json" \\
  -d '{"chat_id":15551234567,"text":"Your order #412 ships tomorrow."}'</code></pre>
        </div>
        <p class="muted small">
          The full reference, including webhooks and the MCP tools, is on the
          <a href="/docs">docs page</a>. The source is AGPL-3.0: self-host it, or let us run it.
        </p>
      </div>
    </section>

    <section class="section">
      <div class="shell">
        <div class="section-head">
          <div class="eyebrow">What it does not do</div>
          <h2>Read this before you build on it.</h2>
        </div>
        <div class="grid-2">
          <div class="card card-quiet">
            <h3>A bot can only message people who wrote to it first</h3>
            <p>
              That is Telegram's rule, not ours. A tenant's bot can answer the customers who
              started a chat with it, and cannot cold-broadcast to the rest of the world.
            </p>
          </div>
          <div class="card card-quiet">
            <h3>Campaigns are slow by design</h3>
            <p>
              About 30 messages a second across the platform, one per second per chat, and Telegram
              asks you to spread a large send over hours. We enforce the limit so you do not get
              throttled.
            </p>
          </div>
          <div class="card card-quiet">
            <h3>The sender is a bot, not their personal account</h3>
            <p>
              Telegram also lets a bot reply as a business account, but only within 24 hours of an
              incoming message, so it cannot run campaigns. It is on the roadmap, not in this
              release.
            </p>
          </div>
          <div class="card card-quiet">
            <h3>Your customers see a bot</h3>
            <p>
              The bot is in their name and their control, but it is still labelled a bot. If you
              need a message to look like it came from a person, that is a different product.
            </p>
          </div>
        </div>
      </div>
    </section>
  `;

  return layout({
    title: 'Telegram for developers',
    description:
      'Relay Gateway is the multi-tenant layer between your product and Telegram: one API, one webhook, one console, and every one of your customers gets their own Telegram sender.',
    current: 'home',
    body,
  });
}

export function pricingPage(currentPlan: Plan): string {
  const selfhost = getPlan('selfhost');
  const hosted = getPlan('hosted');

  const renderPlan = (plan: Plan, featured: boolean) => html`
    <div class="plan${featured ? ' plan-featured' : ''}">
      <div class="plan-name">${plan.name}</div>
      <div class="plan-price">
        ${plan.priceUsd === 0 ? 'Free' : `$${plan.priceUsd}`}
        ${plan.priceUsd === 0 ? '' : html`<span>/month</span>`}
      </div>
      <p class="plan-blurb">${plan.blurb}</p>
      <ul>
        ${plan.features.map((feature) => html`<li>${feature}</li>`)}
      </ul>
      <div style="margin-top:auto">
        ${
          plan.name === currentPlan.name
            ? html`<span class="badge badge-connected"><span class="dot"></span>This instance's plan</span>`
            : html`<a class="btn btn-ghost" href="/docs">How to set it</a>`
        }
      </div>
    </div>
  `;

  const body = html`
    <section class="section">
      <div class="shell">
        <div class="section-head">
          <div class="eyebrow">Pricing</div>
          <h2>Free, for now. On both sides.</h2>
          <p>
            The whole platform runs on one $5-a-month server, and while there are no users to
            serve there is nothing to charge for. Self-hosting is free forever under AGPL-3.0, and
            so is the hosted version until it takes off.
          </p>
        </div>
        <div class="plans">
          ${renderPlan(selfhost, false)} ${renderPlan(hosted, true)}
        </div>
        <p class="muted small" style="margin-top:26px">
          The hosted plan still has ceilings — three tenants, 2,000 messages a month — so one busy
          customer cannot eat the whole of a $5 server. If you need more than that, self-host it
          and there is no limit at all.
        </p>
      </div>
    </section>

    <section class="section">
      <div class="shell">
        <div class="section-head">
          <div class="eyebrow">What it costs us</div>
          <h2>One server and a domain. That is the whole bill.</h2>
        </div>
        <div class="grid-3">
          <div class="card">
            <h3>Telegram</h3>
            <p>
              $0. No per-message fee, no approval queue, no Business Partner application. Paid
              broadcasts exist above 30 messages/second and we do not need them.
            </p>
          </div>
          <div class="card">
            <h3>Our server</h3>
            <p>
              $5 a month. One Node process, one SQLite file, one domain for the connect links.
            </p>
          </div>
          <div class="card">
            <h3>AI, if you want it</h3>
            <p>
              Optional, and always your bill. The agent lives in your service, not ours, and
              Telegram's terms keep business content out of third-party APIs without consent.
            </p>
          </div>
        </div>
        <p class="muted small" style="margin-top:26px">
          When enough of you show up to need a real tier, we will add a paid one. Self-hosting
          stays free, and stays unlimited, whatever we do.
        </p>
      </div>
    </section>
  `;

  return layout({
    title: 'Pricing',
    current: 'pricing',
    body,
  });
}
