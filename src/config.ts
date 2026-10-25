import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export type PlanName = 'selfhost' | 'hosted';

export interface Config {
  dataDir: string;
  host: string;
  port: number;
  publicUrl: string;
  adminKey: string;
  /**
   * A remote database (Turso / libSQL). When it is set, the database is not a
   * file on disk, which is what makes a serverless deployment possible.
   */
  databaseUrl: string | undefined;
  databaseAuthToken: string | undefined;
  managerBotToken: string;
  managerBotUsername: string;
  telegramWebhookSecret: string;
  encryptionKey: string;
  demo: boolean;
  plan: PlanName;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

function env(name: string): string | undefined {
  const v = process.env[name];
  if (v === undefined) return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function envBool(name: string, fallback = false): boolean {
  const v = env(name);
  if (v === undefined) return fallback;
  return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
}

function envInt(name: string, fallback: number): number {
  const v = env(name);
  if (v === undefined) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Reads a secret from the data dir, generating and persisting it on first run.
 * The file is 0600 because it holds the platform key and the encryption key.
 */
function persistentSecret(dataDir: string, name: string, generate: () => string): string {
  const file = join(dataDir, name);
  try {
    if (existsSync(file)) {
      const value = readFileSync(file, 'utf8').trim();
      if (value.length > 0) return value;
    }
  } catch {
    // Fall through to generating a new one.
  }
  const value = generate();
  try {
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(file, `${value}\n`, { mode: 0o600 });
  } catch {
    // A read-only data dir is not fatal: the key just will not survive a restart.
  }
  return value;
}

/**
 * The admin key is the L2 -> L1 platform key. It is generated on first boot and
 * persisted, so a restart does not lock the operator out.
 */
function resolveAdminKey(dataDir: string): string {
  const fromEnv = env('RELAY_ADMIN_KEY');
  if (fromEnv) return fromEnv;
  return persistentSecret(
    dataDir,
    'admin.key',
    () => `rg_admin_${randomBytes(24).toString('base64url')}`,
  );
}

/**
 * The encryption key protects bot tokens and webhook secrets at rest. Losing it
 * means losing every stored token, so it is persisted alongside the database.
 */
function resolveEncryptionKey(dataDir: string): string {
  const fromEnv = env('RELAY_ENCRYPTION_KEY');
  if (fromEnv) return fromEnv;
  return persistentSecret(dataDir, 'encryption.key', () => randomBytes(32).toString('base64'));
}

export function loadConfig(overrides: Partial<Config> = {}): Config {
  const fallbackDir = process.env.VERCEL
    ? join('/tmp', '.relay-gateway')
    : join(homedir(), '.relay-gateway');
  const dataDir = overrides.dataDir ?? env('RELAY_DATA_DIR') ?? fallbackDir;
  const host = overrides.host ?? env('RELAY_HOST') ?? '127.0.0.1';
  const port = overrides.port ?? envInt('RELAY_PORT', 8787);
  const rawPublicUrl =
    overrides.publicUrl ??
    env('RELAY_PUBLIC_URL') ??
    `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
  const publicUrl = rawPublicUrl.replace(/\/+$/, '');

  return {
    dataDir,
    host,
    port,
    publicUrl,
    adminKey: overrides.adminKey ?? resolveAdminKey(dataDir),
    databaseUrl: overrides.databaseUrl ?? env('RELAY_DATABASE_URL'),
    databaseAuthToken: overrides.databaseAuthToken ?? env('RELAY_DATABASE_AUTH_TOKEN'),
    managerBotToken: overrides.managerBotToken ?? env('RELAY_MANAGER_BOT_TOKEN') ?? '',
    managerBotUsername: overrides.managerBotUsername ?? env('RELAY_MANAGER_BOT_USERNAME') ?? '',
    telegramWebhookSecret:
      overrides.telegramWebhookSecret ??
      env('RELAY_TELEGRAM_WEBHOOK_SECRET') ??
      persistentSecret(dataDir, 'telegram-webhook.secret', () => randomBytes(16).toString('hex')),
    encryptionKey: overrides.encryptionKey ?? resolveEncryptionKey(dataDir),
    demo: overrides.demo ?? envBool('RELAY_DEMO', false),
    plan: overrides.plan ?? (env('RELAY_PLAN') as PlanName | undefined) ?? 'selfhost',
    logLevel:
      overrides.logLevel ?? (env('RELAY_LOG_LEVEL') as Config['logLevel'] | undefined) ?? 'info',
  };
}
