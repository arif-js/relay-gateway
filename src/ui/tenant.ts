import type { Plan } from '../core/plans.js';
import type { ApiKey, Connection, MessageRecord, Tenant } from '../core/store.js';
import { html } from '../http/html.js';
import { layout } from './pages.js';

export interface LoginPageData {
  error?: string;
}

export function loginPage(data: LoginPageData): string {
  const body = html`
    <div class="connect-shell">
      <div class="connect-card">
        <div class="eyebrow">Relay Gateway</div>
        <h1>Sign in to the console</h1>
        <p>
          The console shows your tenants, their connection state, and the message log. Paste the
          platform key to continue.
        </p>

        ${
          data.error
            ? html`<div class="notice notice-error"><div class="notice-title">Not signed in</div>${data.error}</div>`
            : ''
        }

        <form method="post" action="/dashboard/login">
          <div class="field">
            <label for="key">Platform key</label>
            <input
              class="input input-mono"
              id="key"
              name="key"
              type="password"
              autocomplete="current-password"
              placeholder="Platform key"
              required
            >
          </div>
          <button class="btn" type="submit">Sign in</button>
        </form>
      </div>
    </div>
  `;

  return layout({
    title: 'Sign in',
    current: '',
    bare: true,
    body,
  });
}

export interface TenantPageData {
  plan: Plan;
  tenant: Tenant;
  messages: MessageRecord[];
  connection: Connection | null;
  connectLink: { url: string; status: string; created_at: string } | null;
  usage: { period: string; messages_sent: number; limit: number | null };
  apiKeys: ApiKey[];
  flash?: { kind: 'ok' | 'error'; text: string };
}

function fmtTime(ms: number): string {
  return `${new Date(ms).toISOString().replace('T', ' ').slice(0, 19)}Z`;
}

export function tenantPage(data: TenantPageData): string {
  const { tenant } = data;
  const connected = tenant.status === 'connected';

  const body = html`
    <div class="shell dash">
      <aside class="side">
        <div class="side-title">Console</div>
        <a href="/dashboard">Overview</a>
        <a class="on" href="/dashboard/tenants/${tenant.id}">${tenant.name}</a>
        <a href="/docs">API reference</a>
        <a href="/pricing">Pricing</a>
        <hr>
        <form method="post" action="/dashboard/logout">
          <button class="btn btn-ghost btn-sm" type="submit">Sign out</button>
        </form>
      </aside>

      <main>
        ${
          data.flash
            ? html`<div class="notice notice-${data.flash.kind}">${data.flash.text}</div>`
            : ''
        }

        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>${tenant.name}</h2>
              <p class="muted small" style="margin:0">
                <span class="num">${tenant.id}</span> · created ${fmtTime(tenant.created_at)}
              </p>
            </div>
            <span class="badge ${connected ? 'badge-connected' : 'badge-pending'}">
              <span class="dot"></span>${tenant.status}
            </span>
          </div>

          <div class="metrics">
            <div class="metric">
              <div class="metric-label">Bot</div>
              <div class="metric-value" style="font-size:22px">
                ${tenant.bot_username ? `@${tenant.bot_username}` : '—'}
              </div>
              <div class="metric-sub">${tenant.mode}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Messages</div>
              <div class="metric-value">${data.usage.messages_sent}</div>
              <div class="metric-sub">this ${data.usage.period}</div>
            </div>
            <div class="metric">
              <div class="metric-label">API keys</div>
              <div class="metric-value">${data.apiKeys.length}</div>
              <div class="metric-sub">tenant-scoped</div>
            </div>
          </div>
        </div>

        ${
          connected
            ? ''
            : html`<div class="panel">
                <div class="panel-head">
                  <div>
                    <h2>Connect their bot</h2>
                    <p class="muted small" style="margin:0">
                      Mint a link and send it to this customer. They pick a bot name on it and
                      Telegram creates the bot for them.
                    </p>
                  </div>
                </div>
                <form method="post" action="/dashboard/tenants/${tenant.id}/connect">
                  <button class="btn" type="submit">Mint a connect link</button>
                </form>
                ${
                  data.connectLink
                    ? html`<div class="notice notice-info" style="margin-top:18px">
                        <div class="notice-title">
                          Send this link to ${tenant.name}
                        </div>
                        <div class="keyline" style="margin-top:10px">
                          <span class="grow">${data.connectLink.url}</span>
                          <button
                            class="btn btn-ghost btn-sm"
                            type="button"
                            data-copy-value="${data.connectLink.url}"
                          >
                            Copy
                          </button>
                        </div>
                        <div class="hint" style="margin-top:8px">
                          Status <strong>${data.connectLink.status}</strong> · minted
                          ${fmtTime(Date.parse(data.connectLink.created_at))}
                        </div>
                      </div>`
                    : ''
                }
              </div>`
        }

        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Send a test message</h2>
              <p class="muted small" style="margin:0">
                Uses the tenant's own bot, through the same API your integration uses.
              </p>
            </div>
          </div>
          ${
            connected
              ? html`<form data-send-form action="/dashboard/tenants/${tenant.id}/send">
                  <div class="field">
                    <label for="chat_id">Chat</label>
                    <input
                      class="input input-mono"
                      id="chat_id"
                      name="chat_id"
                      type="text"
                      placeholder="15551234567 or @username"
                      required
                    >
                  </div>
                  <div class="field">
                    <label for="text">Message</label>
                    <textarea class="textarea" id="text" name="text" required>Your order #412 ships tomorrow.</textarea>
                  </div>
                  <button class="btn" type="submit" data-send-test>Send</button>
                  <div class="notice hidden" data-send-out></div>
                </form>`
              : html`<p class="muted small" style="margin:0">
                  Connect a bot first. A bot can only message people who have started a chat with
                  it.
                </p>`
          }
        </div>

        <div class="panel">
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
                  <p>Send a test message above, or call the API.</p>
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
        </div>
      </main>
    </div>
  `;

  return layout({
    title: tenant.name,
    current: 'dashboard',
    body,
  });
}
