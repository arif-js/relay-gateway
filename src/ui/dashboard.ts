import type { Plan } from '../core/plans.js';
import type { MessageRecord, Tenant } from '../core/store.js';
import { html } from '../http/html.js';
import { layout } from './pages.js';

export interface ConnectPageData {
  token: string;
  tenantName: string;
  status: 'pending' | 'completed';
  botUsername?: string;
  error?: string;
}

export function connectPage(data: ConnectPageData): string {
  const completed = data.status === 'completed';

  const done = html`<div class="connect-done${completed ? '' : ' hidden'}" data-connect-done>
    <h1>You're connected.</h1>
    <p>
      <strong>${data.tenantName}</strong> now sends through its own Telegram bot
      <span class="inline-code" data-done-bot>@${data.botUsername ?? '…'}</span>. The operator of
      this platform can message your customers from it.
    </p>
    <div class="notice notice-ok">
      <div class="notice-title">What happens now</div>
      Your bot belongs to you. The platform holds the token so it can send on your behalf, and it
      never sends anything without a request from the operator.
    </div>
    <p class="muted small">You can close this tab.</p>
  </div>`;

  const form = html`<div class="connect-form${completed ? ' hidden' : ''}" data-connect-form-wrap data-connect-poll="/v1/connect/${data.token}/status">
    <h1 data-connect-heading>Connect your Telegram</h1>
    <p>
      <strong>${data.tenantName}</strong> wants to use Telegram to talk to its own customers. Pick
      a name for its bot — Telegram will create it, and you keep it.
    </p>

    <form data-connect-form action="/v1/connect/${data.token}/complete" method="post">
      <div class="field">
        <label for="display_name">Bot name</label>
        <input
          class="input"
          id="display_name"
          name="display_name"
          type="text"
          maxlength="64"
          placeholder="Sara's Phone Shop"
          required
        >
        <div class="hint">What customers see in their chat list.</div>
      </div>

      <div class="field">
        <label for="username">Bot username</label>
        <input
          class="input input-mono"
          id="username"
          name="username"
          type="text"
          maxlength="32"
          placeholder="sara_phone_shop_bot"
          data-username-input
          required
        >
        <div class="hint">
          Letters, digits and underscores. Must end in <code>bot</code>, 5–32 characters.
        </div>
        <div class="username-preview" data-username-preview>@your_brand_bot</div>
      </div>

      <button class="btn" type="submit">Create the bot</button>
      <a class="btn btn-ghost hidden" data-open-telegram href="#" target="_blank" rel="noopener">
        Open Telegram
      </a>
    </form>

    <div class="notice notice-info" data-connect-status>Pick a name to continue.</div>

    <p class="muted small" style="margin-top:26px">
      By continuing you agree that the platform may operate this bot on your behalf to deliver
      messages its own customers ask for. You can disconnect at any time in Telegram.
    </p>
  </div>`;

  const body = html`
    <div class="connect-shell">
      <div class="connect-card">
        <div class="stepper">
          <i class="on"></i><i class="${completed ? 'on' : ''}"></i><i class="${completed ? 'on' : ''}"></i>
        </div>

        ${
          data.error
            ? html`<div class="notice notice-error"><div class="notice-title">Not available</div>${data.error}</div>`
            : ''
        }

        ${done} ${form}
      </div>
    </div>
  `;

  return layout({
    title: 'Connect your Telegram',
    current: '',
    bare: true,
    body,
  });
}

export interface DashboardData {
  plan: Plan;
  tenants: Tenant[];
  messages: MessageRecord[];
  usageThisPeriod: number;
  flash?: { kind: 'ok' | 'error'; text: string };
}

function statusBadge(status: string): string {
  if (status === 'connected') return 'badge-connected';
  if (status === 'revoked') return 'badge-revoked';
  return 'badge-pending';
}

function fmtTime(ms: number): string {
  return `${new Date(ms).toISOString().replace('T', ' ').slice(0, 19)}Z`;
}

export function dashboardPage(data: DashboardData): string {
  const body = html`
    <div class="shell dash">
      <aside class="side">
        <div class="side-title">Console</div>
        <a class="on" href="/dashboard">Overview</a>
        <a href="/docs">API reference</a>
        <a href="/pricing">Pricing</a>
        <hr>
        <div class="side-title">Plan</div>
        <div style="font-size:14px;color:var(--ink-2)">
          ${data.plan.label}
          ${data.plan.priceUsd ? html`<span class="muted">· $${data.plan.priceUsd}/mo</span>` : ''}
        </div>
      </aside>

      <main>
        ${
          data.flash
            ? html`<div class="notice notice-${data.flash.kind}">${data.flash.text}</div>`
            : ''
        }

        <div class="metrics">
          <div class="metric">
            <div class="metric-label">Tenants</div>
            <div class="metric-value">${data.tenants.length}</div>
            <div class="metric-sub">${data.plan.limits.maxTenants ?? 'unlimited'} allowed</div>
          </div>
          <div class="metric">
            <div class="metric-label">Messages this month</div>
            <div class="metric-value">${data.usageThisPeriod}</div>
            <div class="metric-sub">${data.plan.limits.maxMessagesPerMonth ?? 'unlimited'} included</div>
          </div>
          <div class="metric">
            <div class="metric-label">Connected</div>
            <div class="metric-value">
              ${data.tenants.filter((t) => t.status === 'connected').length}
            </div>
            <div class="metric-sub">of ${data.tenants.length} tenants</div>
          </div>
        </div>

        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>Tenants</h2>
              <p class="muted small" style="margin:0">
                Each tenant is one of your customers. They connect their own Telegram bot.
              </p>
            </div>
          </div>

          ${
            data.tenants.length === 0
              ? html`<div class="empty">
                <h3>No tenants yet</h3>
                <p>Create one with the API, then mint a connect link and send it to your customer.</p>
              </div>`
              : html`<table class="table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Status</th>
                    <th>Bot</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.tenants.map(
                    (tenant) => html`<tr>
                      <td>
                        <strong>${tenant.name}</strong>
                        <div class="num" style="font-size:12px">${tenant.id}</div>
                      </td>
                      <td><span class="badge ${statusBadge(tenant.status)}"><span class="dot"></span>${tenant.status}</span></td>
                      <td>${tenant.bot_username ? `@${tenant.bot_username}` : html`<span class="muted">—</span>`}</td>
                      <td class="num">${fmtTime(tenant.created_at)}</td>
                    </tr>`,
                  )}
                </tbody>
              </table>`
          }
        </section>

                <section class="panel">
          <div class="panel-head">
            <div>
              <h2>Message log</h2>
              <p class="muted small" style="margin:0">Everything sent and received, newest first.</p>
            </div>
          </div>
          ${
            data.messages.length === 0
              ? html`<div class="empty">
                <h3>Nothing sent yet</h3>
                <p>Once a tenant is connected, messages appear here with their delivery status.</p>
              </div>`
              : html`<div class="log">
                ${data.messages.map(
                  (message) => html`<div class="log-row">
                    <div class="log-dir log-${message.direction === 'outbound' ? 'out' : 'in'}">
                      ${message.direction}
                    </div>
                    <div class="log-text">${message.text}</div>
                    <div class="log-time">${fmtTime(message.created_at)}</div>
                  </div>`,
                )}
              </div>`
          }
        </section>
      </main>
    </div>
  `;

  return layout({
    title: 'Dashboard',
    current: 'dashboard',
    body,
  });
}

export function docsPage(): string {
  const body = html`
    <section class="section">
      <div class="shell">
        <div class="section-head">
          <div class="eyebrow">API reference</div>
          <h2>Everything is a JSON envelope.</h2>
          <p>
            Success is <code>{ ok: true, data, warnings }</code>. Failure is
            <code>{ ok: false, error: { code, message, hint } }</code>. Error codes are a closed
            set: <code>BAD_INPUT</code>, <code>UNAUTHORIZED</code>, <code>NOT_FOUND</code>,
            <code>CONFLICT</code>, <code>NOT_CONNECTED</code>, <code>RATE_LIMITED</code>,
            <code>PLAN_LIMIT</code>, <code>TELEGRAM_ERROR</code>, <code>INTERNAL</code>.
          </p>
          <p>
            Two kinds of key. <code>rg_admin_…</code> is the platform key: it creates tenants and
            reaches everything. <code>rg_live_…</code> is tenant-scoped: it can only ever touch
            its own tenant's data, and that is enforced on every route below.
          </p>
        </div>

        <h3>Authentication</h3>
        <p>
          Two kinds of key. <code>rg_admin_…</code> is the platform key and can reach every tenant.
          <code>rg_live_…</code> is tenant-scoped and can only ever touch its own tenant. Send it
          as <code>Authorization: Bearer &lt;key&gt;</code>.
        </p>

        <div class="codeblock">
          <button class="copy" type="button">Copy</button>
          <pre><code>curl http://localhost:8787/v1/tenants \\
  -H "Authorization: Bearer $RELAY_ADMIN_KEY"</code></pre>
        </div>

        <h3>Endpoints</h3>
        <table class="table">
          <thead>
            <tr><th>Method</th><th>Path</th><th>Who</th><th>What it does</th></tr>
          </thead>
          <tbody>
            <tr><td>POST</td><td><code>/v1/tenants</code></td><td>admin</td><td>Create a tenant, returns its tenant key</td></tr>
            <tr><td>GET</td><td><code>/v1/tenants</code></td><td>admin</td><td>List tenants</td></tr>
            <tr><td>GET</td><td><code>/v1/tenants/:id</code></td><td>admin, tenant</td><td>One tenant</td></tr>
            <tr><td>POST</td><td><code>/v1/tenants/:id/connect-links</code></td><td>admin, tenant</td><td>Mint a connect link</td></tr>
            <tr><td>POST</td><td><code>/v1/connect/:token/complete</code></td><td>public</td><td>Customer picks a bot name</td></tr>
            <tr><td>POST</td><td><code>/v1/messages</code></td><td>tenant</td><td>Send a message</td></tr>
            <tr><td>GET</td><td><code>/v1/messages</code></td><td>tenant</td><td>Message log</td></tr>
            <tr><td>GET</td><td><code>/v1/tenants/:id/messages</code></td><td>admin, tenant</td><td>Message log for a tenant</td></tr>
            <tr><td>POST</td><td><code>/v1/webhooks</code></td><td>tenant</td><td>Register an event webhook</td></tr>
            <tr><td>GET</td><td><code>/v1/webhooks</code></td><td>tenant</td><td>List webhooks</td></tr>
            <tr><td>DELETE</td><td><code>/v1/webhooks/:id</code></td><td>tenant</td><td>Remove a webhook</td></tr>
            <tr><td>GET</td><td><code>/v1/usage</code></td><td>tenant</td><td>Messages used this period</td></tr>
            <tr><td>POST</td><td><code>/v1/telegram/webhook</code></td><td>Telegram</td><td>Updates from Telegram</td></tr>
            <tr><td>GET</td><td><code>/healthz</code></td><td>public</td><td>Liveness</td></tr>
          </tbody>
        </table>

        <h3 style="margin-top:44px">Create a tenant</h3>
        <div class="codeblock">
          <button class="copy" type="button">Copy</button>
          <pre><code>curl -X POST http://localhost:8787/v1/tenants \\
  -H "Authorization: Bearer $RELAY_ADMIN_KEY" \\
  -H "content-type: application/json" \\
  -d '{"name":"Sara'"'"'s Phone Shop"}'</code></pre>
        </div>
        <p class="muted small">
          The response contains the tenant's <code>rg_live_…</code> key. It is shown once and
          stored only as a hash.
        </p>

        <h3 style="margin-top:44px">Send a message</h3>
        <div class="codeblock">
          <button class="copy" type="button">Copy</button>
          <pre><code>curl -X POST http://localhost:8787/v1/messages \\
  -H "Authorization: Bearer $TENANT_KEY" \\
  -H "content-type: application/json" \\
  -d '{
    "chat_id": 15551234567,
    "text": "Your order #412 ships tomorrow.",
    "parse_mode": "HTML"
  }'</code></pre>
        </div>
        <p class="muted small">
          <code>chat_id</code> is a numeric user id or a <code>@username</code>. Rate limits are
          enforced for you: about 1 message/second per chat, 20/minute per group, 30/second overall.
        </p>

        <h3 style="margin-top:44px">Webhooks</h3>
        <p>
          Register a URL and we POST every event to it. The body is signed:
          <code>x-relay-signature: sha256=…</code>, computed with the secret we returned at
          registration. Verify it with an HMAC-SHA256 over the raw body. Destinations must use
          HTTPS, resolve only to public IP addresses, and do not follow redirects.
        </p>
        <div class="codeblock">
          <button class="copy" type="button">Copy</button>
          <pre><code>curl -X POST http://localhost:8787/v1/webhooks \\
  -H "Authorization: Bearer $TENANT_KEY" \\
  -H "content-type: application/json" \\
  -d '{
    "url": "https://example.com/hooks/telegram",
    "events": ["message.sent", "message.received"]
  }'</code></pre>
        </div>

        <h3 style="margin-top:44px">MCP tools</h3>
        <p>
          The same operations are exposed to AI agents over MCP. Start it with
          <code>node dist/mcp.js</code> and point your client at it.
        </p>
        <table class="table">
          <thead><tr><th>Tool</th><th>What it does</th></tr></thead>
          <tbody>
            <tr><td><code>relay_list_tenants</code></td><td>List tenants and their connection state</td></tr>
            <tr><td><code>relay_create_tenant</code></td><td>Create a tenant and its key</td></tr>
            <tr><td><code>relay_create_connect_link</code></td><td>Mint a connect link for a tenant</td></tr>
            <tr><td><code>relay_send_message</code></td><td>Send a message as a tenant's bot</td></tr>
            <tr><td><code>relay_list_messages</code></td><td>Read a tenant's message log</td></tr>
            <tr><td><code>relay_register_webhook</code></td><td>Register an event webhook</td></tr>
            <tr><td><code>relay_get_usage</code></td><td>Messages used this period</td></tr>
          </tbody>
        </table>

        <h3 style="margin-top:44px">Configuration</h3>
        <table class="table">
          <thead><tr><th>Variable</th><th>Default</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>RELAY_DATA_DIR</code></td><td><code>~/.relay-gateway</code></td><td>SQLite file and dev key</td></tr>
            <tr><td><code>RELAY_HOST</code></td><td><code>127.0.0.1</code></td><td>HTTP bind address</td></tr>
            <tr><td><code>RELAY_PORT</code></td><td><code>8787</code></td><td>HTTP port</td></tr>
            <tr><td><code>RELAY_PUBLIC_URL</code></td><td><code>http://host:port</code></td><td>Base URL for connect links</td></tr>
            <tr><td><code>RELAY_ADMIN_KEY</code></td><td>generated</td><td>The platform key</td></tr>
            <tr><td><code>RELAY_MANAGER_BOT_TOKEN</code></td><td>—</td><td>The manager bot that holds managed-bot tokens</td></tr>
            <tr><td><code>RELAY_MANAGER_BOT_USERNAME</code></td><td>—</td><td>Its <code>@username</code>, for the deep link</td></tr>
            <tr><td><code>RELAY_TELEGRAM_WEBHOOK_SECRET</code></td><td>generated</td><td>Header Telegram sends us</td></tr>
            <tr><td><code>RELAY_ENCRYPTION_KEY</code></td><td>derived</td><td>32 bytes, hex or base64</td></tr>
            <tr><td><code>RELAY_DEMO</code></td><td><code>0</code></td><td>Use the fake Telegram client</td></tr>
            <tr><td><code>RELAY_PLAN</code></td><td><code>selfhost</code></td><td><code>selfhost</code> or <code>hosted</code></td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;

  return layout({
    title: 'Docs',
    current: 'docs',
    body,
  });
}
