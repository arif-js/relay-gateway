import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type App, createApp } from '../src/app.js';
import { RateLimiter } from '../src/core/limiter.js';
import { Relay } from '../src/core/relay.js';
import { createFakeTelegramClient } from '../src/telegram/fake.js';

export interface JsonBody {
  ok?: boolean;
  data?: any;
  error?: { code: string; message: string; hint?: string };
}

export interface Harness {
  app: App;
  telegram: ReturnType<typeof createFakeTelegramClient>;
  dataDir: string;
}

/**
 * Every test gets its own data dir, its own database and the fake Telegram
 * client. Nothing touches the network and nothing is shared between tests.
 */
export function createHarness(overrides: Partial<App['config']> = {}): Harness {
  const dataDir = mkdtempSync(join(tmpdir(), 'relay-test-'));
  const app = createApp({
    dataDir,
    demo: true,
    adminKey: 'rg_admin_test',
    encryptionKey: 'test-encryption-key',
    publicUrl: 'http://localhost:8787',
    plan: 'selfhost',
    logLevel: 'error',
    ...overrides,
  });
  const telegram = createFakeTelegramClient();
  // Swap in the fake so the tests can inspect what was "sent", and give the
  // limiter headroom so the tests do not sleep.
  app.relay = new Relay(
    app.config,
    app.store,
    telegram,
    app.logger,
    new RateLimiter({ globalPerSecond: 1000, chatPerSecond: 1000 }),
  );
  return { app, telegram, dataDir };
}

export function cleanupHarness(harness: Harness): void {
  harness.app.db.close();
  rmSync(harness.dataDir, { recursive: true, force: true });
}

/** A tiny fetch wrapper for talking to a running server in an integration test. */
export async function api(
  base: string,
  method: string,
  path: string,
  options: { key?: string; body?: unknown } = {},
): Promise<{ status: number; body: JsonBody }> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(options.key ? { authorization: `Bearer ${options.key}` } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const text = await response.text();
  let body: JsonBody;
  try {
    body = JSON.parse(text) as JsonBody;
  } catch {
    body = { error: { code: 'NOT_JSON', message: text } };
  }
  return { status: response.status, body };
}
