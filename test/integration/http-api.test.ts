import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHttpServer } from '../../src/http/server.js';
import { api, cleanupHarness, createHarness, type Harness } from '../harness.js';

describe('the HTTP API', () => {
  let harness: Harness;
  let server: Server;
  let base: string;

  beforeEach(async () => {
    harness = createHarness();
    server = createHttpServer({
      config: harness.app.config,
      relay: harness.app.relay,
      logger: harness.app.logger,
      store: harness.app.store,
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    base = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    cleanupHarness(harness);
  });

  it('serves the landing page', async () => {
    const response = await fetch(`${base}/`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('Relay Gateway');
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('href="/favicon-32x32.png"');
    expect(html).toContain('href="/favicon-16x16.png"');
    expect(html).toContain('href="/favicon.ico"');
    expect(html).toContain('href="/apple-touch-icon.png"');
  });

  it('serves the stylesheet and the client script and the logo', async () => {
    const css = await fetch(`${base}/assets/styles.css`);
    expect(css.status).toBe(200);
    expect(css.headers.get('content-type')).toContain('text/css');
    expect(await css.text()).toContain('--paper');

    const js = await fetch(`${base}/assets/app.js`);
    expect(js.status).toBe(200);

    const logo = await fetch(`${base}/assets/logo.png`);
    expect(logo.status).toBe(200);
    expect(logo.headers.get('content-type')).toContain('image/png');
    const bytes = await logo.arrayBuffer();
    expect(bytes.byteLength).toBeGreaterThan(1000);

    const faviconPng = await fetch(`${base}/assets/favicon.png`);
    expect(faviconPng.status).toBe(200);
    expect(faviconPng.headers.get('content-type')).toContain('image/png');

    const faviconSvg = await fetch(`${base}/assets/favicon.svg`);
    expect(faviconSvg.status).toBe(200);
    expect(faviconSvg.headers.get('content-type')).toContain('image/svg+xml');

    const faviconIco = await fetch(`${base}/favicon.ico`);
    expect(faviconIco.status).toBe(200);
    expect(faviconIco.headers.get('content-type')).toContain('image/x-icon');

    const publicDir = fileURLToPath(new URL('../../client/public/', import.meta.url));
    for (const [url, file, contentType] of [
      ['/favicon-16x16.png', 'favicon-16x16.png', 'image/png'],
      ['/favicon-32x32.png', 'favicon-32x32.png', 'image/png'],
      ['/favicon.ico', 'favicon.ico', 'image/x-icon'],
      ['/apple-touch-icon.png', 'apple-touch-icon.png', 'image/png'],
    ]) {
      const response = await fetch(`${base}${url}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain(contentType);
      expect(Buffer.from(await response.arrayBuffer())).toEqual(
        readFileSync(join(publicDir, file)),
      );
    }
  });

  it('walks a tenant from created to connected to sending', async () => {
    const created = await api(base, 'POST', '/v1/tenants', {
      key: 'rg_admin_test',
      body: { name: "Sara's Phone Shop" },
    });
    expect(created.status).toBe(201);
    expect(created.body.ok).toBe(true);
    const tenantId = created.body.data.id as string;
    const tenantKey = created.body.data.api_key as string;
    expect(tenantKey.startsWith('rg_live_')).toBe(true);

    const link = await api(base, 'POST', `/v1/tenants/${tenantId}/connect-links`, {
      key: 'rg_admin_test',
    });
    expect(link.status).toBe(201);
    const token = link.body.data.token as string;

    const connectPage = await fetch(`${base}/connect/${token}`);
    expect(connectPage.status).toBe(200);
    expect(await connectPage.text()).toContain('Connect your Telegram');

    const complete = await api(base, 'POST', `/v1/connect/${token}/complete`, {
      body: { username: 'sara_phone_shop_bot', display_name: "Sara's Phone Shop" },
    });
    expect(complete.status).toBe(200);
    expect(complete.body.data.status).toBe('completed');
    expect(complete.body.data.bot_username).toBe('sara_phone_shop_bot');

    const sent = await api(base, 'POST', '/v1/messages', {
      key: tenantKey,
      body: { chat_id: 15551234567, text: 'Your order #412 ships tomorrow.' },
    });
    expect(sent.status).toBe(201);
    expect(sent.body.data.status).toBe('sent');

    const log = await api(base, 'GET', '/v1/messages', { key: tenantKey });
    expect(log.status).toBe(200);
    expect(log.body.data).toHaveLength(1);
    expect(log.body.data[0].text).toBe('Your order #412 ships tomorrow.');

    // Platform admin can also dispatch for this tenant by providing tenant_id
    const adminSent = await api(base, 'POST', '/v1/messages', {
      key: 'rg_admin_test',
      body: { tenant_id: tenantId, chat_id: 15551234567, text: 'Admin test dispatch' },
    });
    expect(adminSent.status).toBe(201);
    expect(adminSent.body.ok).toBe(true);
    expect(adminSent.body.data.status).toBe('sent');
  });

  it('accepts tenant bot updates only with the derived secret', async () => {
    const { relay } = harness.app;
    const auth = relay.authenticate('rg_admin_test');
    const { tenant, apiKey } = relay.createTenant(auth, 'Acme');
    const link = relay.createConnectLink(auth, tenant.id);
    await relay.chooseBotName(link.token, { username: 'acme_shop_bot', displayName: 'Acme' });
    const update = {
      update_id: 1,
      message: { message_id: 1, chat: { id: 42, type: 'private' }, date: 0, text: 'hello' },
    };
    const post = (secret: string) =>
      fetch(`${base}/v1/telegram/bots/${tenant.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': secret },
        body: JSON.stringify(update),
      });

    expect((await post('wrong')).status).toBe(401);
    expect((await post(relay.tenantBotSecret(tenant.id))).status).toBe(200);
    const log = relay.listMessages(relay.authenticate(apiKey), tenant.id);
    expect(log).toHaveLength(1);
    expect(log[0]?.chat_id).toBe('42');
  });

  it('rejects a send without a key, with the error envelope', async () => {
    const response = await api(base, 'POST', '/v1/messages', { body: { chat_id: 1, text: 'hi' } });
    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.error?.code).toBe('BAD_INPUT');
  });

  it('returns a JSON 404 for an unknown API route', async () => {
    const response = await api(base, 'GET', '/v1/nope');
    expect(response.status).toBe(404);
    expect(response.body.error?.code).toBe('NOT_FOUND');
  });

  it('requires a session for the dashboard', async () => {
    const response = await fetch(`${base}/dashboard`, { redirect: 'manual' });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/dashboard/login');
  });

  it('signs in to the dashboard with the platform key', async () => {
    const login = await fetch(`${base}/dashboard/login`, { redirect: 'manual' });
    expect(login.status).toBe(200);
    expect(await login.text()).toContain('Platform key');

    const wrong = await fetch(`${base}/dashboard/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'nope' }),
      redirect: 'manual',
    });
    expect(wrong.status).toBe(401);

    const ok = await fetch(`${base}/dashboard/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'rg_admin_test' }),
      redirect: 'manual',
    });
    expect(ok.status).toBe(302);
    const cookie = ok.headers.get('set-cookie');
    expect(cookie).toContain('relay_session=');

    const dashboard = await fetch(`${base}/dashboard`, {
      headers: { cookie: cookie ?? '' },
    });
    expect(dashboard.status).toBe(200);
    expect(await dashboard.text()).toContain('Tenants');
  });

  it('shows a tenant page with a connect-link action', async () => {
    const created = await api(base, 'POST', '/v1/tenants', {
      key: 'rg_admin_test',
      body: { name: 'Acme' },
    });
    const tenantId = created.body.data.id as string;

    const login = await fetch(`${base}/dashboard/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'rg_admin_test' }),
      redirect: 'manual',
    });
    const cookie = login.headers.get('set-cookie') ?? '';

    const page = await fetch(`${base}/dashboard/tenants/${tenantId}`, { headers: { cookie } });
    expect(page.status).toBe(200);
    const text = await page.text();
    expect(text).toContain('Acme');
    expect(text).toContain('Mint a connect link');
  });

  it('serves the pricing page with the free plans', async () => {
    const response = await fetch(`${base}/pricing`);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('$5');
    expect(text).toContain('Self-host');
    expect(text).toContain('Free');
  });

  it('serves the docs page', async () => {
    const response = await fetch(`${base}/docs`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('/v1/tenants');
  });

  it('supports self-serve merchant onboarding up to 3 tenants and enforces quota', async () => {
    // 1. Unauthenticated merchant gets 401
    const unauth = await fetch(`${base}/v1/merchant/tenant`);
    expect(unauth.status).toBe(401);

    // 2. Demo mode Clerk user creates up to 3 tenants
    const clerkHeaders = {
      'Content-Type': 'application/json',
      'x-clerk-user-id': 'user_clerk_test_123',
    };
    const createRes1 = await fetch(`${base}/v1/merchant/tenant`, {
      method: 'POST',
      headers: clerkHeaders,
      body: JSON.stringify({ name: 'Sales Shop' }),
    });
    expect(createRes1.status).toBe(201);
    const createJson1 = (await createRes1.json()) as {
      ok: boolean;
      data: {
        tenant: { id: string; name: string };
        tenants: Array<{ id: string; name: string }>;
        max_tenants: number;
        connect_link: { token: string };
        api_key: string;
      };
    };
    expect(createJson1.ok).toBe(true);
    expect(createJson1.data.tenant.name).toBe('Sales Shop');
    expect(createJson1.data.tenants).toHaveLength(1);
    expect(createJson1.data.max_tenants).toBe(3);
    expect(createJson1.data.connect_link.token).toBeDefined();
    expect(createJson1.data.api_key).toMatch(/^rg_live_/);

    // Create Tenant 2 (Org A) and Tenant 3 (Org B)
    const createRes2 = await fetch(`${base}/v1/merchant/tenant`, {
      method: 'POST',
      headers: clerkHeaders,
      body: JSON.stringify({ name: 'Organization A' }),
    });
    expect(createRes2.status).toBe(201);

    const createRes3 = await fetch(`${base}/v1/merchant/tenant`, {
      method: 'POST',
      headers: clerkHeaders,
      body: JSON.stringify({ name: 'Organization B' }),
    });
    expect(createRes3.status).toBe(201);

    // 3. 4th tenant attempt returns 403 PLAN_LIMIT
    const createRes4 = await fetch(`${base}/v1/merchant/tenant`, {
      method: 'POST',
      headers: clerkHeaders,
      body: JSON.stringify({ name: 'Organization C' }),
    });
    expect(createRes4.status).toBe(403);
    const createJson4 = (await createRes4.json()) as {
      ok: boolean;
      error: { code: string };
    };
    expect(createJson4.ok).toBe(false);
    expect(createJson4.error.code).toBe('PLAN_LIMIT');

    // 4. GET /v1/merchant/tenant returns all 3 tenants and selects requested tenant_id
    const getRes = await fetch(
      `${base}/v1/merchant/tenant?tenant_id=${createJson1.data.tenant.id}`,
      { headers: clerkHeaders },
    );
    expect(getRes.status).toBe(200);
    const getJson = (await getRes.json()) as {
      ok: boolean;
      data: {
        tenant: { id: string; name: string };
        tenants: Array<{ id: string; name: string }>;
      };
    };
    expect(getJson.data.tenant.id).toBe(createJson1.data.tenant.id);
    expect(getJson.data.tenants).toHaveLength(3);
  });

  it('returns the webhook signing secret once on registration and never on list', async () => {
    const created = await api(base, 'POST', '/v1/tenants', {
      key: 'rg_admin_test',
      body: { name: 'Webhook Tenant' },
    });
    const tenantKey = created.body.data.api_key as string;

    const reg = await api(base, 'POST', '/v1/webhooks', {
      key: tenantKey,
      body: {
        url: 'https://example.com/webhooks/telegram',
        events: ['message.received', 'message.sent'],
      },
    });
    expect(reg.status).toBe(201);
    expect(reg.body.ok).toBe(true);
    expect(typeof reg.body.data.secret).toBe('string');
    expect((reg.body.data.secret as string).length).toBeGreaterThanOrEqual(16);

    const listed = await api(base, 'GET', '/v1/webhooks', {
      key: tenantKey,
    });
    expect(listed.status).toBe(200);
    expect(listed.body.ok).toBe(true);
    const items = listed.body.data as unknown as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(items[0]?.secret).toBeUndefined();
  });
});
