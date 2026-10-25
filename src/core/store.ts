import { randomBytes, randomUUID } from 'node:crypto';
import { sha256 } from './crypto.js';
import type { SqlDatabase } from './db.js';
import { normaliseValue } from './db.js';

export type TenantStatus = 'pending' | 'connected' | 'revoked';
export type TenantMode = 'managed_bot' | 'business_account';

export interface Tenant {
  id: string;
  name: string;
  status: TenantStatus;
  mode: TenantMode;
  bot_id: number | null;
  bot_username: string | null;
  bot_token_enc: string | null;
  business_connection_id: string | null;
  business_rights: string | null;
  owner_clerk_user_id?: string | null;
  created_at: number;
  updated_at: number;
}

export interface ApiKey {
  id: string;
  tenant_id: string | null;
  label: string;
  prefix: string;
  hash: string;
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
}

export interface Connection {
  id: string;
  tenant_id: string;
  token_hash: string;
  token_enc: string | null;
  desired_username: string | null;
  desired_display_name: string | null;
  status: 'pending' | 'completed' | 'expired';
  created_at: number;
  completed_at: number | null;
}

export interface MessageRecord {
  id: string;
  tenant_id: string;
  direction: 'outbound' | 'inbound';
  chat_id: string;
  text: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  error: string | null;
  telegram_message_id: number | null;
  created_at: number;
}

export interface WebhookRecord {
  id: string;
  tenant_id: string;
  url: string;
  secret_enc: string;
  events: string;
  created_at: number;
  disabled_at: number | null;
}

export interface AuthContext {
  kind: 'admin' | 'tenant';
  tenantId: string | null;
  keyId: string | null;
}

function row<T>(value: unknown): T {
  return value as T;
}

export class Store {
  constructor(private readonly db: SqlDatabase) {}

  // ── tenants ────────────────────────────────────────────────────────────

  createTenant(name: string, ownerClerkUserId?: string | null): Tenant {
    const now = Date.now();
    const tenant: Tenant = {
      id: `tn_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
      name,
      status: 'pending',
      mode: 'managed_bot',
      bot_id: null,
      bot_username: null,
      bot_token_enc: null,
      business_connection_id: null,
      business_rights: null,
      owner_clerk_user_id: ownerClerkUserId ?? null,
      created_at: now,
      updated_at: now,
    };
    this.db
      .prepare(
        `INSERT INTO tenants (id, name, status, mode, bot_id, bot_username, bot_token_enc,
          business_connection_id, business_rights, owner_clerk_user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        tenant.id,
        tenant.name,
        tenant.status,
        tenant.mode,
        tenant.bot_id,
        tenant.bot_username,
        tenant.bot_token_enc,
        tenant.business_connection_id,
        tenant.business_rights,
        tenant.owner_clerk_user_id,
        tenant.created_at,
        tenant.updated_at,
      );
    return tenant;
  }

  getTenant(id: string): Tenant | null {
    const r = this.db.prepare('SELECT * FROM tenants WHERE id = ?').get(id);
    return r ? row<Tenant>(r) : null;
  }

  getTenantByClerkUserId(clerkUserId: string): Tenant | null {
    const r = this.db
      .prepare(
        'SELECT * FROM tenants WHERE owner_clerk_user_id = ? ORDER BY created_at DESC LIMIT 1',
      )
      .get(clerkUserId);
    return r ? row<Tenant>(r) : null;
  }

  listTenantsByClerkUserId(clerkUserId: string): Tenant[] {
    return this.db
      .prepare('SELECT * FROM tenants WHERE owner_clerk_user_id = ? ORDER BY created_at DESC')
      .all(clerkUserId)
      .map((r) => row<Tenant>(r));
  }

  listTenants(): Tenant[] {
    return this.db
      .prepare('SELECT * FROM tenants ORDER BY created_at DESC')
      .all()
      .map((r) => row<Tenant>(r));
  }

  updateTenant(id: string, patch: Partial<Tenant>): void {
    const allowed: (keyof Tenant)[] = [
      'name',
      'status',
      'mode',
      'bot_id',
      'bot_username',
      'bot_token_enc',
      'business_connection_id',
      'business_rights',
      'owner_clerk_user_id',
    ];
    const sets: string[] = [];
    const values: (string | number | null)[] = [];
    for (const key of allowed) {
      if (key in patch) {
        sets.push(`${key} = ?`);
        values.push(normaliseValue(patch[key]) as string | number | null);
      }
    }
    sets.push('updated_at = ?');
    values.push(Date.now());
    this.db.prepare(`UPDATE tenants SET ${sets.join(', ')} WHERE id = ?`).run(...values, id);
  }

  countTenants(): number {
    const r = this.db.prepare('SELECT COUNT(*) AS n FROM tenants').get();
    return Number((r as { n: number }).n);
  }

  // ── api keys ───────────────────────────────────────────────────────────

  createApiKey(
    tenantId: string | null,
    label: string,
    scope: 'admin' | 'live',
  ): { record: ApiKey; secret: string } {
    const secret = `rg_${scope}_${randomBytes(24).toString('base64url')}`;
    const record: ApiKey = {
      id: `key_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      label,
      prefix: secret.slice(0, 12),
      hash: sha256(secret),
      created_at: Date.now(),
      last_used_at: null,
      revoked_at: null,
    };
    this.db
      .prepare(
        `INSERT INTO api_keys (id, tenant_id, label, prefix, hash, created_at, last_used_at, revoked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.tenant_id,
        record.label,
        record.prefix,
        record.hash,
        record.created_at,
        record.last_used_at,
        record.revoked_at,
      );
    return { record, secret };
  }

  findApiKey(secret: string): ApiKey | null {
    const r = this.db.prepare('SELECT * FROM api_keys WHERE hash = ?').get(sha256(secret));
    return r ? row<ApiKey>(r) : null;
  }

  listApiKeys(tenantId: string | null): ApiKey[] {
    if (tenantId === null) {
      return this.db
        .prepare('SELECT * FROM api_keys ORDER BY created_at DESC')
        .all()
        .map((r) => row<ApiKey>(r));
    }
    return this.db
      .prepare('SELECT * FROM api_keys WHERE tenant_id = ? ORDER BY created_at DESC')
      .all(tenantId)
      .map((r) => row<ApiKey>(r));
  }

  touchApiKey(id: string): void {
    this.db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').run(Date.now(), id);
  }

  revokeApiKey(id: string): void {
    this.db.prepare('UPDATE api_keys SET revoked_at = ? WHERE id = ?').run(Date.now(), id);
  }

  // ── connections ────────────────────────────────────────────────────────

  createConnection(
    tenantId: string,
    token: string,
    tokenEnc: string | null = null,
    desiredUsername?: string,
    displayName?: string,
  ): Connection {
    const connection: Connection = {
      id: `cn_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
      tenant_id: tenantId,
      token_hash: sha256(token),
      token_enc: tokenEnc,
      desired_username: desiredUsername ?? null,
      desired_display_name: displayName ?? null,
      status: 'pending',
      created_at: Date.now(),
      completed_at: null,
    };
    this.db
      .prepare(
        `INSERT INTO connections (id, tenant_id, token_hash, token_enc, desired_username,
          desired_display_name, status, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        connection.id,
        connection.tenant_id,
        connection.token_hash,
        connection.token_enc,
        connection.desired_username,
        connection.desired_display_name,
        connection.status,
        connection.created_at,
        connection.completed_at,
      );
    return connection;
  }

  getConnectionByToken(token: string): Connection | null {
    const r = this.db.prepare('SELECT * FROM connections WHERE token_hash = ?').get(sha256(token));
    return r ? row<Connection>(r) : null;
  }

  getConnection(id: string): Connection | null {
    const r = this.db.prepare('SELECT * FROM connections WHERE id = ?').get(id);
    return r ? row<Connection>(r) : null;
  }

  updateConnection(id: string, patch: Partial<Connection>): void {
    const allowed: (keyof Connection)[] = [
      'desired_username',
      'desired_display_name',
      'status',
      'completed_at',
    ];
    const sets: string[] = [];
    const values: (string | number | null)[] = [];
    for (const key of allowed) {
      if (key in patch) {
        sets.push(`${key} = ?`);
        values.push(normaliseValue(patch[key]) as string | number | null);
      }
    }
    this.db.prepare(`UPDATE connections SET ${sets.join(', ')} WHERE id = ?`).run(...values, id);
  }

  findPendingConnectionByUsername(username: string): Connection | null {
    const r = this.db
      .prepare(
        `SELECT * FROM connections WHERE desired_username = ? AND status = 'pending'
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(username);
    return r ? row<Connection>(r) : null;
  }

  listConnections(tenantId: string): Connection[] {
    return this.db
      .prepare('SELECT * FROM connections WHERE tenant_id = ? ORDER BY created_at DESC')
      .all(tenantId)
      .map((r) => row<Connection>(r));
  }

  // ── messages ───────────────────────────────────────────────────────────

  recordMessage(
    message: Omit<MessageRecord, 'id' | 'created_at' | 'error' | 'telegram_message_id'> & {
      id?: string;
      error?: string | null;
      telegram_message_id?: number | null;
    },
  ): MessageRecord {
    const record: MessageRecord = {
      id: message.id ?? `msg_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
      tenant_id: message.tenant_id,
      direction: message.direction,
      chat_id: message.chat_id,
      text: message.text,
      status: message.status,
      error: message.error ?? null,
      telegram_message_id: message.telegram_message_id ?? null,
      created_at: Date.now(),
    };
    this.db
      .prepare(
        `INSERT INTO messages (id, tenant_id, direction, chat_id, text, status, error,
          telegram_message_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.tenant_id,
        record.direction,
        record.chat_id,
        record.text,
        record.status,
        record.error,
        record.telegram_message_id,
        record.created_at,
      );
    return record;
  }

  listMessages(tenantId: string, limit = 50, before?: number): MessageRecord[] {
    const beforeClause = before === undefined ? '' : ' AND created_at < ?';
    const params: (string | number)[] =
      before === undefined ? [tenantId, limit] : [tenantId, before, limit];
    return this.db
      .prepare(
        `SELECT * FROM messages WHERE tenant_id = ?${beforeClause}
         ORDER BY created_at DESC LIMIT ?`,
      )
      .all(...params)
      .map((r) => row<MessageRecord>(r));
  }

  // ── webhooks ───────────────────────────────────────────────────────────

  createWebhook(tenantId: string, url: string, secretEnc: string, events: string[]): WebhookRecord {
    const record: WebhookRecord = {
      id: `wh_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      url,
      secret_enc: secretEnc,
      events: JSON.stringify(events),
      created_at: Date.now(),
      disabled_at: null,
    };
    this.db
      .prepare(
        `INSERT INTO webhooks (id, tenant_id, url, secret_enc, events, created_at, disabled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.tenant_id,
        record.url,
        record.secret_enc,
        record.events,
        record.created_at,
        record.disabled_at,
      );
    return record;
  }

  listWebhooks(tenantId: string): WebhookRecord[] {
    return this.db
      .prepare(
        'SELECT * FROM webhooks WHERE tenant_id = ? AND disabled_at IS NULL ORDER BY created_at DESC',
      )
      .all(tenantId)
      .map((r) => row<WebhookRecord>(r));
  }

  disableWebhook(id: string): void {
    this.db.prepare('UPDATE webhooks SET disabled_at = ? WHERE id = ?').run(Date.now(), id);
  }

  // ── usage & audit ──────────────────────────────────────────────────────

  bumpUsage(tenantId: string, period: string, count = 1): void {
    this.db
      .prepare(
        `INSERT INTO usage (tenant_id, period, messages_sent) VALUES (?, ?, ?)
         ON CONFLICT(tenant_id, period) DO UPDATE SET messages_sent = messages_sent + excluded.messages_sent`,
      )
      .run(tenantId, period, count);
  }

  getUsage(tenantId: string, period: string): number {
    const r = this.db
      .prepare('SELECT messages_sent FROM usage WHERE tenant_id = ? AND period = ?')
      .get(tenantId, period);
    return r ? Number((r as { messages_sent: number }).messages_sent) : 0;
  }

  audit(actor: string, action: string, tenantId: string | null, detail?: unknown): void {
    this.db
      .prepare(
        'INSERT INTO audit_log (tenant_id, actor, action, detail, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(
        tenantId,
        actor,
        action,
        detail === undefined ? null : JSON.stringify(detail),
        Date.now(),
      );
  }
}
