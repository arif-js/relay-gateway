import { describe, expect, it } from 'vitest';
import { escapeHtml, html } from '../../src/http/html.js';
import { connectPage, dashboardPage, docsPage } from '../../src/ui/dashboard.js';
import { landingPage, pricingPage } from '../../src/ui/pages.js';
import { loginPage } from '../../src/ui/tenant.js';

describe('the html tag', () => {
  it('escapes interpolated values', () => {
    const out = html`<p>${'<script>alert(1)</script>'}</p>`;
    expect(out.value).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });

  it('does not escape the literal parts', () => {
    const out = html`<p class="x">hello</p>`;
    expect(out.value).toBe('<p class="x">hello</p>');
  });

  it('does not double-escape a nested template', () => {
    const inner = html`<strong>Sara</strong>`;
    const outer = html`<p>${inner}</p>`;
    expect(outer.value).toBe('<p><strong>Sara</strong></p>');
    expect(outer.value).not.toContain('&lt;strong&gt;');
  });

  it('escapes a plain string inside a nested template', () => {
    const outer = html`<p>${'<b>'}</p>`;
    expect(outer.value).toBe('<p>&lt;b&gt;</p>');
  });

  it('renders arrays of values', () => {
    const out = html`<ul>${['a', 'b'].map((x) => html`<li>${x}</li>`)}</ul>`;
    expect(out.value).toBe('<ul><li>a</li><li>b</li></ul>');
  });
});

describe('escapeHtml', () => {
  it('escapes the five dangerous characters', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });
});

describe('the pages', () => {
  it('never mention demo mode', () => {
    const pages = [
      landingPage(),
      pricingPage({
        name: 'selfhost',
        label: 'Self-host',
        priceUsd: 0,
        blurb: '',
        limits: { maxTenants: null, maxMessagesPerMonth: null, maxWebhooks: null },
        features: [],
      }),
      docsPage(),
      connectPage({ token: 'abc', tenantName: 'Acme', status: 'pending' }),
      connectPage({
        token: 'abc',
        tenantName: 'Acme',
        status: 'completed',
        botUsername: 'acme_bot',
      }),
      loginPage({}),
    ];
    for (const page of pages) {
      // The configuration reference documents RELAY_DEMO, which is a real
      // variable. What must not appear is the demo-mode branding.
      expect(page).not.toContain('Demo mode');
      expect(page).not.toContain('demo mode');
    }
  });

  it('renders the landing page without escaping its own markup', () => {
    const page = landingPage();
    expect(page).toContain('<h1>');
    expect(page).not.toContain('&lt;h1&gt;');
    expect(page).toContain('<section class="hero">');
    expect(page).not.toContain('&lt;section');
  });

  it('renders the pricing page with both plans and the $5 price', () => {
    const page = pricingPage({
      name: 'selfhost',
      label: 'Self-host',
      priceUsd: 0,
      blurb: '',
      limits: { maxTenants: null, maxMessagesPerMonth: null, maxWebhooks: null },
      features: [],
    });
    expect(page).toContain('Self-host');
    expect(page).toContain('Free');
    expect(page).toContain('$5');
    expect(page).not.toContain('&lt;div');
  });

  it('renders the connect page with the form', () => {
    const page = connectPage({
      token: 'abc',
      tenantName: "Sara's Phone Shop",
      status: 'pending',
    });
    expect(page).toContain('data-connect-form');
    expect(page).toContain('Connect your Telegram');
    expect(page).not.toContain('&lt;form');
    // The tenant name is user data and must be escaped.
    expect(page).toContain('Sara&#39;s Phone Shop');
  });

  it('renders the completed connect page', () => {
    const page = connectPage({
      token: 'abc',
      tenantName: 'Acme',
      status: 'completed',
      botUsername: 'acme_bot',
    });
    expect(page).toContain("You're connected");
    expect(page).toContain('@acme_bot');
  });

  it('renders the dashboard with the tenant table', () => {
    const page = dashboardPage({
      plan: {
        name: 'selfhost',
        label: 'Self-host',
        priceUsd: 0,
        blurb: '',
        limits: { maxTenants: null, maxMessagesPerMonth: null, maxWebhooks: null },
        features: [],
      },
      tenants: [
        {
          id: 'tn_1',
          name: 'Acme',
          status: 'connected',
          mode: 'managed_bot',
          bot_id: 1,
          bot_username: 'acme_bot',
          bot_token_enc: 'secret',
          business_connection_id: null,
          business_rights: null,
          created_at: 1_700_000_000_000,
          updated_at: 1_700_000_000_000,
        },
      ],
      messages: [],
      usageThisPeriod: 0,
    });
    expect(page).toContain('<table class="table">');
    expect(page).toContain('acme_bot');
    expect(page).not.toContain('secret');
    expect(page).not.toContain('&lt;table');
  });

  it('renders the docs page', () => {
    const page = docsPage();
    expect(page).toContain('/v1/tenants');
    expect(page).toContain('relay_send_message');
    expect(page).not.toContain('&lt;table');
  });
});
