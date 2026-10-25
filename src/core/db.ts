import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const require = createRequire(import.meta.url);

/**
 * The narrow SQL surface the store uses. Two implementations satisfy it:
 * `node:sqlite` for a local file (self-host, a VPS) and `libsql` for a remote
 * database (Turso, on a serverless host). Both are synchronous, so the store
 * does not care which one it has.
 */
export interface SqlStatement {
  all(...params: unknown[]): Record<string, unknown>[];
  get(...params: unknown[]): Record<string, unknown> | undefined;
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
}

export interface SqlDatabase {
  prepare(sql: string): SqlStatement;
  exec(sql: string): void;
  close(): void;
  readonly kind: 'local' | 'remote';
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tenants (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  mode           TEXT NOT NULL DEFAULT 'managed_bot',
  bot_id         INTEGER,
  bot_username   TEXT,
  bot_token_enc  TEXT,
  business_connection_id TEXT,
  business_rights TEXT,
  owner_clerk_user_id TEXT,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS api_keys (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT,
  label       TEXT NOT NULL DEFAULT 'default',
  prefix      TEXT NOT NULL,
  hash        TEXT NOT NULL UNIQUE,
  created_at  INTEGER NOT NULL,
  last_used_at INTEGER,
  revoked_at  INTEGER
);
CREATE INDEX IF NOT EXISTS api_keys_hash ON api_keys(hash);

CREATE TABLE IF NOT EXISTS connections (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash     TEXT NOT NULL UNIQUE,
  token_enc      TEXT,
  desired_username TEXT,
  desired_display_name TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',
  created_at     INTEGER NOT NULL,
  completed_at   INTEGER
);
CREATE INDEX IF NOT EXISTS connections_tenant ON connections(tenant_id);

CREATE TABLE IF NOT EXISTS messages (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  direction      TEXT NOT NULL,
  chat_id        TEXT NOT NULL,
  text           TEXT NOT NULL,
  status         TEXT NOT NULL,
  error          TEXT,
  telegram_message_id INTEGER,
  created_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_tenant ON messages(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS webhooks (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  secret_enc  TEXT NOT NULL,
  events      TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  disabled_at INTEGER
);
CREATE INDEX IF NOT EXISTS webhooks_tenant ON webhooks(tenant_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id   TEXT,
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,
  detail      TEXT,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS usage (
  tenant_id   TEXT NOT NULL,
  period      TEXT NOT NULL,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, period)
);
`;

/** `node:sqlite` only binds null, number, bigint, string and Uint8Array. */
export function normaliseValue(value: unknown): null | number | bigint | string | Uint8Array {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'string')
    return value;
  if (value instanceof Uint8Array) return value;
  return JSON.stringify(value);
}

/**
 * A local file, through `node:sqlite`. No native dependency, which keeps the
 * self-host install to `npm install` and nothing else.
 */
export function openLocalDatabase(path: string): SqlDatabase {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  return {
    kind: 'local',
    prepare(sql: string): SqlStatement {
      const statement = db.prepare(sql);
      // `node:sqlite` types its bindings narrowly. The store normalises every
      // value through `normaliseValue` before it reaches here.
      const bind = (params: unknown[]): never[] => params as never[];
      return {
        all: (...params) => statement.all(...bind(params)) as Record<string, unknown>[],
        get: (...params) => statement.get(...bind(params)) as Record<string, unknown> | undefined,
        run: (...params) => {
          const result = statement.run(...bind(params));
          return { changes: Number(result.changes), lastInsertRowid: result.lastInsertRowid };
        },
      };
    },
    exec: (sql: string) => db.exec(sql),
    close: () => db.close(),
  };
}

/**
 * A remote database, through the native `libsql` client. It speaks the same
 * synchronous better-sqlite3 dialect, so a Turso URL works on a serverless
 * host where a file on disk does not.
 *
 * The native module is loaded on demand: a self-hoster who never sets a
 * database URL never needs the binary.
 */
export function openRemoteDatabase(url: string, authToken?: string): SqlDatabase {
  // biome-ignore lint/suspicious/noExplicitAny: the native module ships no types
  const Database = require('libsql') as any;
  const db = authToken ? new Database(url, { authToken }) : new Database(url);

  const strip = (row: unknown): Record<string, unknown> => {
    const copy = { ...(row as Record<string, unknown>) };
    delete copy._metadata;
    return copy;
  };

  return {
    kind: 'remote',
    prepare(sql: string): SqlStatement {
      const statement = db.prepare(sql);
      return {
        all: (...params) => statement.all(...params).map(strip),
        get: (...params) => {
          const row = statement.get(...params);
          return row === undefined ? undefined : strip(row);
        },
        run: (...params) => {
          const result = statement.run(...params);
          return {
            changes: Number(result.changes ?? result.rowsAffected ?? 0),
            lastInsertRowid: result.lastInsertRowid ?? 0,
          };
        },
      };
    },
    exec: (sql: string) => db.exec(sql),
    close: () => db.close(),
  };
}

/**
 * Opens the database and brings the schema up to date.
 *
 * `RELAY_DATABASE_URL` picks a remote database (Turso, on a serverless host).
 * Without it the database is a file in `RELAY_DATA_DIR`.
 */
export function openDatabase(options: {
  url?: string;
  authToken?: string;
  path: string;
}): SqlDatabase {
  const db = options.url
    ? openRemoteDatabase(options.url, options.authToken)
    : openLocalDatabase(options.path);
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

/**
 * Additive migrations for databases created by an earlier version. Each one is
 * idempotent, so running it on a fresh database is a no-op. The ALTER is
 * attempted and the duplicate-column error swallowed, because `PRAGMA` is not
 * available in the same form on every backend.
 */
function migrate(db: SqlDatabase): void {
  try {
    db.exec('ALTER TABLE connections ADD COLUMN token_enc TEXT');
  } catch {
    // The column already exists. Nothing to do.
  }
  try {
    db.exec('ALTER TABLE tenants ADD COLUMN owner_clerk_user_id TEXT');
  } catch {
    // The column already exists. Nothing to do.
  }
}
