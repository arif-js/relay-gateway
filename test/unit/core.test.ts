import { describe, expect, it } from 'vitest';
import { createSealer, safeEqual, sha256 } from '../../src/core/crypto.js';
import { RateLimiter } from '../../src/core/limiter.js';
import { getPlan, RUNNING_COST } from '../../src/core/plans.js';
import {
  isPublicWebhookAddress,
  resolvePublicWebhookAddress,
} from '../../src/core/webhook-delivery.js';
import { cleanupHarness, createHarness } from '../harness.js';

describe('the sealer', () => {
  it('round-trips a secret', () => {
    const sealer = createSealer('a-key');
    const sealed = sealer.seal('123456:AAF-super-secret-token');
    expect(sealed).not.toContain('super-secret');
    expect(sealer.open(sealed)).toBe('123456:AAF-super-secret-token');
  });

  it('produces a different ciphertext every time', () => {
    const sealer = createSealer('a-key');
    expect(sealer.seal('same')).not.toBe(sealer.seal('same'));
  });

  it('refuses a tampered value', () => {
    const sealer = createSealer('a-key');
    const sealed = sealer.seal('secret');
    const parts = sealed.split('.');
    const tampered = [parts[0], parts[1], parts[2], 'dGFtcGVyZWQ'].join('.');
    expect(() => sealer.open(tampered)).toThrow();
  });

  it('cannot open a value sealed with another key', () => {
    const a = createSealer('key-one');
    const b = createSealer('key-two');
    expect(() => b.open(a.seal('secret'))).toThrow();
  });
});

describe('safeEqual', () => {
  it('compares equal and unequal values', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('sha256', () => {
  it('is stable', () => {
    expect(sha256('x')).toBe(sha256('x'));
    expect(sha256('x')).not.toBe(sha256('y'));
  });
});

describe('the rate limiter', () => {
  it('lets a burst through up to the global ceiling, then waits', async () => {
    const limiter = new RateLimiter({ globalPerSecond: 2, chatPerSecond: 100 });
    const start = Date.now();
    await limiter.acquire('chat-1');
    await limiter.acquire('chat-1');
    await limiter.acquire('chat-1');
    // The third call has to wait for a token.
    expect(Date.now() - start).toBeGreaterThanOrEqual(400);
  });

  it('applies the per-chat limit separately to each chat', async () => {
    const limiter = new RateLimiter({ globalPerSecond: 100, chatPerSecond: 1 });
    const start = Date.now();
    await limiter.acquire('chat-1');
    await limiter.acquire('chat-2');
    // Two different chats, two different budgets, no wait.
    expect(Date.now() - start).toBeLessThan(300);
  });
});

describe('the plans', () => {
  it('has no ceilings on self-host', () => {
    const plan = getPlan('selfhost');
    expect(plan.limits.maxTenants).toBeNull();
    expect(plan.limits.maxMessagesPerMonth).toBeNull();
    expect(plan.priceUsd).toBe(0);
  });

  it('keeps the hosted plan free, with ceilings', () => {
    const plan = getPlan('hosted');
    // The $5 a month is our running cost, not a price we charge.
    expect(plan.priceUsd).toBe(0);
    expect(plan.limits.maxTenants).toBe(3);
  });

  it('records the running cost we pay', () => {
    expect(RUNNING_COST.telegram).toBe(0);
    expect(RUNNING_COST.server).toBe(5);
  });
});

describe('webhook URL validation', () => {
  it('requires HTTPS and rejects literal private network addresses', () => {
    const harness = createHarness();
    try {
      const auth = harness.app.relay.authenticate('rg_admin_test');
      const tenant = harness.app.relay.createTenant(auth, 'Webhook Tenant');

      for (const url of [
        'http://hooks.example.com/events',
        'https://127.0.0.1/events',
        'https://[::1]/events',
      ]) {
        expect(() =>
          harness.app.relay.registerWebhook(auth, {
            tenantId: tenant.tenant.id,
            url,
            events: ['message.received'],
          }),
        ).toThrow();
      }
    } finally {
      cleanupHarness(harness);
    }
  });
});

describe('webhook destination resolution', () => {
  it('rejects non-public addresses', () => {
    for (const address of [
      '10.1.2.3',
      '127.0.0.1',
      '169.254.1.1',
      '192.168.1.1',
      '::1',
      'fc00::1',
      'fe80::1',
      '::ffff:127.0.0.1',
    ]) {
      expect(isPublicWebhookAddress(address), address).toBe(false);
    }
    expect(isPublicWebhookAddress('8.8.8.8')).toBe(true);
    expect(isPublicWebhookAddress('2001:4860:4860::8888')).toBe(true);
  });

  it('rejects a DNS response if any resolved address is non-public', async () => {
    await expect(
      resolvePublicWebhookAddress('hooks.example', async () => [
        { address: '8.8.8.8', family: 4 },
        { address: '127.0.0.1', family: 4 },
      ]),
    ).rejects.toThrow(/public IP addresses/);
  });

  it('returns a public DNS answer to pin for delivery', async () => {
    await expect(
      resolvePublicWebhookAddress('hooks.example', async () => [
        { address: '8.8.8.8', family: 4 },
        { address: '2001:4860:4860::8888', family: 6 },
      ]),
    ).resolves.toEqual({ address: '8.8.8.8', family: 4 });
  });
});
