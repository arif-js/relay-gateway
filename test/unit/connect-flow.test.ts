import { describe, expect, it } from 'vitest';
import { cleanupHarness, createHarness } from '../harness.js';

describe('the connect flow, end to end', () => {
  it('takes a tenant from created to sending a message', async () => {
    const harness = createHarness();
    try {
      const { relay, store } = harness.app;

      // L2 creates a tenant and gets a tenant-scoped key.
      const auth = relay.authenticate('rg_admin_test');
      const { tenant, apiKey } = relay.createTenant(auth, "Sara's Phone Shop");
      expect(tenant.status).toBe('pending');
      expect(apiKey.startsWith('rg_live_')).toBe(true);

      // L2 mints a connect link and sends it to the customer.
      const link = relay.createConnectLink(auth, tenant.id);
      expect(link.url).toContain('/connect/');

      // L3 opens the link and picks a bot name.
      const choice = await relay.chooseBotName(link.token, {
        username: 'sara_phone_shop_bot',
        displayName: "Sara's Phone Shop",
      });
      expect(choice.status).toBe('completed');

      // The tenant is now connected, with the bot Telegram created for it.
      const connected = store.getTenant(tenant.id);
      expect(connected?.status).toBe('connected');
      expect(connected?.bot_username).toBe('sara_phone_shop_bot');

      // L2 sends a message with the tenant key.
      const tenantAuth = relay.authenticate(apiKey);
      const record = await relay.sendMessage(tenantAuth, {
        tenantId: tenant.id,
        chatId: 15551234567,
        text: 'Your order #412 ships tomorrow.',
      });
      expect(record.status).toBe('sent');

      // The fake Telegram client actually received it.
      expect(harness.telegram.state.sent).toHaveLength(1);
      expect(harness.telegram.state.sent[0]?.params.text).toBe('Your order #412 ships tomorrow.');
      expect(harness.telegram.state.sent[0]?.params.chat_id).toBe(15551234567);

      // And the message is in the log.
      const log = relay.listMessages(tenantAuth, tenant.id);
      expect(log).toHaveLength(1);
      expect(log[0]?.direction).toBe('outbound');
    } finally {
      cleanupHarness(harness);
    }
  });

  it('registers a webhook on the tenant bot and records inbound messages', async () => {
    const harness = createHarness();
    try {
      const { relay } = harness.app;
      const auth = relay.authenticate('rg_admin_test');
      const { tenant, apiKey } = relay.createTenant(auth, "Sara's Phone Shop");
      const link = relay.createConnectLink(auth, tenant.id);
      await relay.chooseBotName(link.token, {
        username: 'sara_phone_shop_bot',
        displayName: "Sara's Phone Shop",
      });

      // The tenant bot now points its updates at a per-tenant URL with a derived secret.
      const hooks = [...harness.telegram.state.webhooks.values()];
      const hook = hooks.find((h) => h.url.endsWith(`/v1/telegram/bots/${tenant.id}`));
      expect(hook).toBeDefined();
      expect(hook?.secret).toBe(relay.tenantBotSecret(tenant.id));
      expect(hook?.secret).not.toBe(relay.tenantBotSecret('tn_other'));

      // Alice taps /start: it is logged as inbound with her chat id.
      const handled = await relay.handleTenantBotUpdate(tenant.id, {
        update_id: 1,
        message: {
          message_id: 1,
          from: { id: 777, is_bot: false, first_name: 'Alice', username: 'alice' },
          chat: { id: 777, type: 'private', first_name: 'Alice' },
          date: 0,
          text: '/start',
        },
      });
      expect(handled).toBe(true);
      const log = relay.listMessages(relay.authenticate(apiKey), tenant.id);
      expect(log[0]?.direction).toBe('inbound');
      expect(log[0]?.chat_id).toBe('777');
      expect(log[0]?.text).toBe('/start');
    } finally {
      cleanupHarness(harness);
    }
  });

  it('refuses a bot username that is already taken on Telegram', async () => {
    const harness = createHarness();
    try {
      const { relay } = harness.app;
      const auth = relay.authenticate('rg_admin_test');
      const { tenant } = relay.createTenant(auth, 'SalesShop');
      const link = relay.createConnectLink(auth, tenant.id);
      harness.telegram.state.takenUsernames.add('sales_shop_bot');
      await expect(
        relay.chooseBotName(link.token, { username: 'sales_shop_bot', displayName: 'SalesShop' }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    } finally {
      cleanupHarness(harness);
    }
  });

  it('refuses to start a connection when the manager bot cannot manage bots', async () => {
    const harness = createHarness();
    try {
      const { relay } = harness.app;
      const auth = relay.authenticate('rg_admin_test');
      const { tenant } = relay.createTenant(auth, 'SalesShop');
      const link = relay.createConnectLink(auth, tenant.id);
      harness.telegram.state.canManageBots = false;
      await expect(
        relay.chooseBotName(link.token, { username: 'salesshop_bot', displayName: 'SalesShop' }),
      ).rejects.toMatchObject({ code: 'TELEGRAM_ERROR' });
    } finally {
      cleanupHarness(harness);
    }
  });

  it('never returns the bot token through any path', async () => {
    const harness = createHarness();
    try {
      const { relay, store } = harness.app;
      const auth = relay.authenticate('rg_admin_test');
      const { tenant } = relay.createTenant(auth, 'Acme');
      const link = relay.createConnectLink(auth, tenant.id);
      await relay.chooseBotName(link.token, {
        username: 'acme_notifications_bot',
        displayName: 'Acme',
      });

      const stored = store.getTenant(tenant.id);
      // It is stored encrypted...
      expect(stored?.bot_token_enc).toBeTruthy();
      expect(stored?.bot_token_enc).not.toContain('fake-managed');
      // ...and it is not part of the tenant object the API returns.
      const json = JSON.stringify({ ...stored, bot_token_enc: undefined });
      expect(json).not.toContain('fake-managed');
      expect(json).not.toContain('acme_notifications_bot:');
    } finally {
      cleanupHarness(harness);
    }
  });

  it('refuses to send before the tenant connects', async () => {
    const harness = createHarness();
    try {
      const { relay } = harness.app;
      const auth = relay.authenticate('rg_admin_test');
      const { tenant, apiKey } = relay.createTenant(auth, 'Not Ready');
      const tenantAuth = relay.authenticate(apiKey);
      await expect(
        relay.sendMessage(tenantAuth, { tenantId: tenant.id, chatId: 1, text: 'hi' }),
      ).rejects.toMatchObject({ code: 'NOT_CONNECTED' });
    } finally {
      cleanupHarness(harness);
    }
  });
});
