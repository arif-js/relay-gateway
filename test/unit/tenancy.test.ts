import { describe, expect, it } from 'vitest';
import { cleanupHarness, createHarness } from '../harness.js';

describe('tenant isolation', () => {
  it('a tenant key cannot touch another tenant', async () => {
    const harness = createHarness();
    try {
      const { relay } = harness.app;
      const admin = relay.authenticate('rg_admin_test');
      const a = relay.createTenant(admin, 'Tenant A');
      const b = relay.createTenant(admin, 'Tenant B');

      const authA = relay.authenticate(a.apiKey);

      expect(() => relay.getTenant(authA, b.tenant.id)).toThrowError(/cannot access that tenant/i);
      expect(relay.listTenants(authA)).toHaveLength(1);
      expect(relay.listTenants(authA)[0]?.id).toBe(a.tenant.id);

      // A tenant key cannot create tenants either.
      expect(() => relay.createTenant(authA, 'Sneaky')).toThrowError(/Only the platform key/);
    } finally {
      cleanupHarness(harness);
    }
  });

  it('the admin key can see every tenant', () => {
    const harness = createHarness();
    try {
      const { relay } = harness.app;
      const admin = relay.authenticate('rg_admin_test');
      relay.createTenant(admin, 'One');
      relay.createTenant(admin, 'Two');
      expect(relay.listTenants(admin)).toHaveLength(2);
    } finally {
      cleanupHarness(harness);
    }
  });

  it('rejects an unknown key', () => {
    const harness = createHarness();
    try {
      const { relay } = harness.app;
      expect(() => relay.authenticate('rg_live_nope')).toThrowError(/Invalid API key/);
      expect(() => relay.authenticate(undefined)).toThrowError(/Missing Authorization/);
      // An invalid key is an auth failure, not a malformed request.
      try {
        relay.authenticate('rg_live_nope');
      } catch (cause) {
        expect(cause).toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
      }
    } finally {
      cleanupHarness(harness);
    }
  });
});

describe('plan limits', () => {
  it('caps tenants on the hosted plan', () => {
    const harness = createHarness({ plan: 'hosted' });
    try {
      const { relay } = harness.app;
      const admin = relay.authenticate('rg_admin_test');
      relay.createTenant(admin, 'One');
      relay.createTenant(admin, 'Two');
      relay.createTenant(admin, 'Three');
      expect(() => relay.createTenant(admin, 'Four')).toThrowError(/allows 3 tenants/);
    } finally {
      cleanupHarness(harness);
    }
  });

  it('does not cap tenants on the self-host plan', () => {
    const harness = createHarness({ plan: 'selfhost' });
    try {
      const { relay } = harness.app;
      const admin = relay.authenticate('rg_admin_test');
      for (let i = 0; i < 12; i++) relay.createTenant(admin, `Tenant ${i}`);
      expect(relay.listTenants(admin)).toHaveLength(12);
    } finally {
      cleanupHarness(harness);
    }
  });
});
