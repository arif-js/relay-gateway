import { createHmac, randomBytes } from 'node:crypto';
import type { Config } from '../config.js';
import {
  badInput,
  conflict,
  notConnected,
  notFound,
  planLimit,
  telegramError,
  unauthorized,
} from '../errors.js';
import type { Logger } from '../logger.js';
import type { TelegramClient, TelegramUpdate } from '../telegram/types.js';
import { createSealer, type Sealer, safeEqual } from './crypto.js';
import { RateLimiter } from './limiter.js';
import { currentPeriod, getPlan } from './plans.js';
import type { AuthContext, MessageRecord, Store, Tenant } from './store.js';
import { postWebhookEvent, validateWebhookUrl } from './webhook-delivery.js';

export interface RelayEvent {
  type:
    | 'message.sent'
    | 'message.failed'
    | 'message.received'
    | 'tenant.connected'
    | 'tenant.revoked';
  tenant_id: string;
  data: Record<string, unknown>;
}

export interface SendMessageInput {
  tenantId: string;
  chatId: string | number;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  businessConnectionId?: string;
  disableNotification?: boolean;
  protectContent?: boolean;
  replyMarkup?: unknown;
}

export interface ConnectLinkResult {
  connection_id: string;
  url: string;
  token: string;
  expires_at: string;
  tenant_id: string;
}

export interface ConnectChoice {
  username: string;
  displayName: string;
}

const USERNAME_RE = /^[A-Za-z0-9_]{4,28}bot$/;
const USERNAME_MIN = 5;
const USERNAME_MAX = 32;

/**
 * The domain service. Everything the HTTP API and the MCP tools do goes
 * through here, so both surfaces share one behaviour and one set of rules.
 */
export class Relay {
  private readonly sealer: Sealer;
  private readonly limiter: RateLimiter;

  constructor(
    private readonly config: Config,
    private readonly store: Store,
    private readonly telegram: TelegramClient,
    private readonly logger: Logger,
    limiter?: RateLimiter,
  ) {
    this.sealer = createSealer(config.encryptionKey);
    this.limiter = limiter ?? new RateLimiter();
  }

  // ── auth ───────────────────────────────────────────────────────────────

  authenticate(secret: string | undefined): AuthContext {
    if (!secret) {
      throw badInput('Missing Authorization header', 'Use `Authorization: Bearer <key>`.');
    }
    if (safeEqual(secret, this.config.adminKey)) {
      return { kind: 'admin', tenantId: null, keyId: null };
    }
    const key = this.store.findApiKey(secret);
    if (!key || key.revoked_at !== null) {
      throw unauthorized('Invalid API key', 'Check the key, or mint a new one from the dashboard.');
    }
    this.store.touchApiKey(key.id);
    if (key.tenant_id === null) {
      return { kind: 'admin', tenantId: null, keyId: key.id };
    }
    return { kind: 'tenant', tenantId: key.tenant_id, keyId: key.id };
  }

  private requireTenantScope(auth: AuthContext, tenantId: string): void {
    if (auth.kind === 'admin') return;
    if (auth.tenantId !== tenantId) {
      throw badInput('This key cannot access that tenant', 'Tenant keys are scoped to one tenant.');
    }
  }

  // ── tenants ────────────────────────────────────────────────────────────

  createTenant(
    auth: AuthContext,
    name: string,
    ownerClerkUserId?: string | null,
  ): { tenant: Tenant; apiKey: string } {
    if (auth.kind !== 'admin') {
      throw badInput('Only the platform key can create tenants');
    }
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 120) {
      throw badInput('Tenant name must be between 1 and 120 characters');
    }
    const plan = getPlan(this.config.plan);
    if (plan.limits.maxTenants !== null && this.store.countTenants() >= plan.limits.maxTenants) {
      throw planLimit(
        `The ${plan.label} plan allows ${plan.limits.maxTenants} tenants`,
        'Self-host for unlimited tenants, or upgrade the hosted plan.',
      );
    }
    const tenant = this.store.createTenant(trimmed, ownerClerkUserId);
    const { secret } = this.store.createApiKey(tenant.id, 'default', 'live');
    this.store.audit('admin', 'tenant.create', tenant.id, { name: trimmed });
    return { tenant, apiKey: secret };
  }

  listTenants(auth: AuthContext): Tenant[] {
    if (auth.kind === 'admin') return this.store.listTenants();
    return this.store.listTenants().filter((t) => t.id === auth.tenantId);
  }

  getTenant(auth: AuthContext, tenantId: string): Tenant {
    this.requireTenantScope(auth, tenantId);
    const tenant = this.store.getTenant(tenantId);
    if (!tenant) throw notFound('Tenant');
    return tenant;
  }

  // ── connect flow (Mode A: managed bot) ────────────────────────────────

  createConnectLink(auth: AuthContext, tenantId: string): ConnectLinkResult {
    this.requireTenantScope(auth, tenantId);
    const tenant = this.store.getTenant(tenantId);
    if (!tenant) throw notFound('Tenant');

    const token = randomBytes(24).toString('base64url');
    const connection = this.store.createConnection(tenant.id, token, this.sealer.seal(token));
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    this.store.audit(auth.kind, 'connection.create', tenant.id, { connection_id: connection.id });
    return {
      connection_id: connection.id,
      url: `${this.config.publicUrl}/connect/${token}`,
      token,
      expires_at: expiresAt,
      tenant_id: tenant.id,
    };
  }

  /**
   * The L3 side of the connect flow: they pick the bot's name and username.
   * In live mode we hand back a `t.me/newbot` deep link for our manager bot,
   * which is how Telegram sanctions a platform-created bot.
   */
  async chooseBotName(
    token: string,
    choice: ConnectChoice,
  ): Promise<{
    connection_id: string;
    status: string;
    next_url: string | null;
    tenant_name: string;
  }> {
    const connection = this.store.getConnectionByToken(token);
    if (!connection) throw notFound('Connect link');
    if (connection.status === 'completed') {
      throw conflict('This connect link has already been used');
    }
    const username = choice.username.trim().replace(/^@/, '');
    if (!USERNAME_RE.test(username)) {
      throw badInput(
        'That is not a valid bot username',
        'Letters, digits and underscores only, 5-32 characters, ending in "bot".',
      );
    }
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
      throw badInput('Bot usernames are 5 to 32 characters long');
    }
    const displayName = choice.displayName.trim();
    if (displayName.length < 1 || displayName.length > 64) {
      throw badInput('The bot display name must be between 1 and 64 characters');
    }

    await this.preflightManagedBot(username);

    this.store.updateConnection(connection.id, {
      desired_username: username,
      desired_display_name: displayName,
    });

    if (this.telegram.kind === 'fake' && this.telegram.provisionManagedBot) {
      const provisioned = await this.telegram.provisionManagedBot(username, displayName);
      this.completeConnection(connection.id, {
        botId: provisioned.botId,
        botUsername: provisioned.username,
        token: provisioned.token,
      });
      return {
        connection_id: connection.id,
        status: 'completed',
        next_url: null,
        tenant_name: this.store.getTenant(connection.tenant_id)?.name ?? '',
      };
    }

    const manager = this.config.managerBotUsername.replace(/^@/, '');
    if (!manager) {
      throw telegramError(
        'This instance has no manager bot configured',
        'Set RELAY_MANAGER_BOT_USERNAME and RELAY_MANAGER_BOT_TOKEN, then restart.',
      );
    }
    const nextUrl = `https://t.me/newbot/${manager}/${username}?name=${encodeURIComponent(displayName)}`;
    return {
      connection_id: connection.id,
      status: 'awaiting_bot',
      next_url: nextUrl,
      tenant_name: this.store.getTenant(connection.tenant_id)?.name ?? '',
    };
  }

  /**
   * Whether the manager bot has Bot Management Mode on. Without it Telegram
   * silently ignores the `t.me/newbot` link, so we check before sending anyone there.
   * Returns null when it cannot tell (no token, or Telegram unreachable).
   */
  async managerCanManageBots(): Promise<boolean | null> {
    const token = this.config.managerBotToken;
    if (!token && this.telegram.kind === 'live') return null;
    const me = await this.telegram.getMe(token);
    if (!me.ok || !me.result) return null;
    return me.result.can_manage_bots !== false;
  }

  /** Fails early, with a clear message, instead of a dead end in Telegram. */
  private async preflightManagedBot(username: string): Promise<void> {
    const canManage = await this.managerCanManageBots();
    if (canManage === false) {
      this.logger.error('Manager bot has Bot Management Mode off; connections cannot complete');
      throw telegramError(
        'This platform is not set up to create bots yet',
        'The operator must enable Bot Management Mode for the manager bot in @BotFather.',
      );
    }
    const existing = await this.telegram.getChat(this.config.managerBotToken, `@${username}`);
    if (existing.ok) {
      throw conflict(`@${username} is already taken on Telegram`, 'Pick a different username.');
    }
  }

  /**
   * The connect link for a tenant, if one is still open. The token is stored
   * sealed so the operator can re-share the link from the dashboard.
   */
  connectLinkFor(tenantId: string): { url: string; status: string; created_at: string } | null {
    const connections = this.store.listConnections(tenantId);
    const open = connections.find((c) => c.status === 'pending') ?? connections[0];
    if (!open?.token_enc) return null;
    return {
      url: `${this.config.publicUrl}/connect/${this.sealer.open(open.token_enc)}`,
      status: open.status,
      created_at: new Date(open.created_at).toISOString(),
    };
  }

  /**
   * Called when Telegram tells us a managed bot was created. We pull the token
   * with the manager bot and seal it. The bot itself is never asked for a token.
   */
  async completeConnection(
    connectionId: string,
    details: { botId: number; botUsername: string; token: string },
  ): Promise<{ tenant_id: string; bot_username: string }> {
    const connection = this.store.getConnection(connectionId);
    if (!connection) throw notFound('Connection');

    const tenant = this.store.getTenant(connection.tenant_id);
    if (!tenant) throw notFound('Tenant');

    this.store.updateTenant(tenant.id, {
      status: 'connected',
      mode: 'managed_bot',
      bot_id: details.botId,
      bot_username: details.botUsername,
      bot_token_enc: this.sealer.seal(details.token),
    });
    this.store.updateConnection(connection.id, {
      status: 'completed',
      completed_at: Date.now(),
    });
    this.store.audit('system', 'tenant.connected', tenant.id, {
      bot_username: details.botUsername,
    });

    // Point the tenant bot's updates at us, so end users' messages (and their
    // chat ids) reach the tenant's webhook. Non-fatal: sending still works.
    const hook = await this.telegram.setWebhook(
      details.token,
      `${this.config.publicUrl}/v1/telegram/bots/${tenant.id}`,
      this.tenantBotSecret(tenant.id),
      ['message'],
    );
    if (!hook.ok) {
      this.logger.warn('Could not set the tenant bot webhook', {
        tenant_id: tenant.id,
        description: hook.description,
      });
    }

    await this.emit({
      type: 'tenant.connected',
      tenant_id: tenant.id,
      data: { bot_username: details.botUsername, name: tenant.name },
    });

    return { tenant_id: tenant.id, bot_username: details.botUsername };
  }

  /**
   * Handles a `managed_bot` update from Telegram. The update carries the bot and
   * its creator; `getManagedBotToken` takes the *user id of the managed bot*, so
   * we try the bot id first and fall back to the creator id.
   */
  async handleManagedBotUpdate(update: NonNullable<TelegramUpdate['managed_bot']>): Promise<void> {
    const username = update.bot.username;
    if (!username) return;

    const connection = this.store.findPendingConnectionByUsername(username);
    if (!connection) {
      this.logger.warn('managed_bot update with no matching connection', { username });
      return;
    }

    const managerToken = this.config.managerBotToken;
    if (!managerToken) {
      this.logger.error('Cannot fetch managed bot token: no manager bot token configured');
      return;
    }

    const attempts: number[] = [update.bot.id, update.user.id];
    for (const userId of attempts) {
      const result = await this.telegram.getManagedBotToken(managerToken, userId);
      if (result.ok && typeof result.result === 'string') {
        this.logger.info('Fetched managed bot token', { username, user_id: userId });
        await this.completeConnection(connection.id, {
          botId: update.bot.id,
          botUsername: username,
          token: result.result,
        });
        return;
      }
    }
    this.logger.error('Could not fetch managed bot token for any candidate id', {
      username,
      attempts,
    });
  }

  // ── sending ───────────────────────────────────────────────────────────

  async sendMessage(auth: AuthContext, input: SendMessageInput): Promise<MessageRecord> {
    const tenantId = auth.kind === 'admin' ? input.tenantId : auth.tenantId;
    if (!tenantId) {
      throw badInput('Sending requires a tenant-scoped API key or tenant_id');
    }
    this.requireTenantScope(auth, tenantId);
    const tenant = this.store.getTenant(tenantId);
    if (!tenant) throw notFound('Tenant');
    if (tenant.status !== 'connected' || !tenant.bot_token_enc) {
      throw notConnected(
        'This tenant has not connected a Telegram bot yet',
        'Mint a connect link and send it to the customer.',
      );
    }
    if (input.text.length < 1 || input.text.length > 4096) {
      throw badInput('Message text must be between 1 and 4096 characters');
    }

    const plan = getPlan(this.config.plan);
    const period = currentPeriod();
    const used = this.store.getUsage(tenant.id, period);
    if (plan.limits.maxMessagesPerMonth !== null && used >= plan.limits.maxMessagesPerMonth) {
      throw planLimit(
        `The ${plan.label} plan includes ${plan.limits.maxMessagesPerMonth} messages per month`,
        'Self-host for unlimited messages.',
      );
    }

    const token = this.sealer.open(tenant.bot_token_enc);
    const chatId = input.chatId;

    await this.limiter.acquire(String(chatId));

    const result = await this.telegram.sendMessage(token, {
      chat_id: chatId,
      text: input.text,
      ...(input.parseMode ? { parse_mode: input.parseMode } : {}),
      ...(input.businessConnectionId ? { business_connection_id: input.businessConnectionId } : {}),
      ...(input.disableNotification ? { disable_notification: true } : {}),
      ...(input.protectContent ? { protect_content: true } : {}),
      ...(input.replyMarkup ? { reply_markup: input.replyMarkup } : {}),
    });

    if (!result.ok) {
      const retryAfter = result.parameters?.retry_after;
      const record = this.store.recordMessage({
        tenant_id: tenant.id,
        direction: 'outbound',
        chat_id: String(chatId),
        text: input.text,
        status: 'failed',
        error: result.description ?? 'Telegram rejected the message',
      });
      this.logger.warn('Telegram rejected a message', {
        tenant_id: tenant.id,
        error_code: result.error_code,
        retry_after: retryAfter,
      });
      await this.emit({
        type: 'message.failed',
        tenant_id: tenant.id,
        data: { message_id: record.id, error: record.error, retry_after: retryAfter ?? null },
      });
      throw telegramError(
        result.description ?? 'Telegram rejected the message',
        retryAfter !== undefined ? `Retry after ${retryAfter}s.` : undefined,
      );
    }

    const record = this.store.recordMessage({
      tenant_id: tenant.id,
      direction: 'outbound',
      chat_id: String(chatId),
      text: input.text,
      status: 'sent',
      telegram_message_id: result.result?.message_id ?? null,
    });
    this.store.bumpUsage(tenant.id, period);

    await this.emit({
      type: 'message.sent',
      tenant_id: tenant.id,
      data: {
        message_id: record.id,
        chat_id: record.chat_id,
        telegram_message_id: record.telegram_message_id,
        text: record.text,
      },
    });

    return record;
  }

  listMessages(auth: AuthContext, tenantId: string, limit = 50, before?: number): MessageRecord[] {
    this.requireTenantScope(auth, tenantId);
    if (!this.store.getTenant(tenantId)) throw notFound('Tenant');
    return this.store.listMessages(tenantId, limit, before);
  }

  /**
   * The secret Telegram sends with a tenant bot's updates. Derived from the
   * platform webhook secret, so it is per-tenant without being stored.
   */
  tenantBotSecret(tenantId: string): string {
    return createHmac('sha256', this.config.telegramWebhookSecret)
      .update(`tenant-bot:${tenantId}`)
      .digest('hex');
  }

  /** Handles an update sent to a tenant's own bot. Returns false if ignored. */
  async handleTenantBotUpdate(tenantId: string, update: TelegramUpdate): Promise<boolean> {
    const message = update.message;
    if (!message?.text) return false;
    const tenant = this.store.getTenant(tenantId);
    if (tenant?.status !== 'connected') return false;
    await this.recordInbound(tenantId, String(message.chat.id), message.text, {
      from_username: message.from?.username ?? null,
      from_first_name: message.from?.first_name ?? null,
    });
    return true;
  }

  /** Records an inbound message that arrived over the Telegram webhook. */
  async recordInbound(
    tenantId: string,
    chatId: string,
    text: string,
    sender: { from_username?: string | null; from_first_name?: string | null } = {},
  ): Promise<MessageRecord> {
    const record = this.store.recordMessage({
      tenant_id: tenantId,
      direction: 'inbound',
      chat_id: chatId,
      text,
      status: 'delivered',
    });
    await this.emit({
      type: 'message.received',
      tenant_id: tenantId,
      data: { message_id: record.id, chat_id: chatId, text, ...sender },
    });
    return record;
  }

  // ── webhooks ───────────────────────────────────────────────────────────

  registerWebhook(
    auth: AuthContext,
    input: { tenantId: string; url: string; events: string[] },
  ): { id: string; url: string; events: string[]; secret: string; created_at: string } {
    this.requireTenantScope(auth, input.tenantId);
    const tenant = this.store.getTenant(input.tenantId);
    if (!tenant) throw notFound('Tenant');

    const url = validateWebhookUrl(input.url);
    const events = input.events.length > 0 ? input.events : ['message.sent', 'message.received'];
    const known = new Set([
      'message.sent',
      'message.failed',
      'message.received',
      'tenant.connected',
      'tenant.revoked',
    ]);
    for (const event of events) {
      if (!known.has(event)) {
        throw badInput(`Unknown event "${event}"`, `Known events: ${[...known].join(', ')}`);
      }
    }

    const plan = getPlan(this.config.plan);
    if (plan.limits.maxWebhooks !== null) {
      const existing = this.store.listWebhooks(input.tenantId).length;
      if (existing >= plan.limits.maxWebhooks) {
        throw planLimit(
          `The ${plan.label} plan allows ${plan.limits.maxWebhooks} webhooks per tenant`,
          'Self-host for unlimited webhooks.',
        );
      }
    }

    const secret = randomBytes(24).toString('base64url');
    const record = this.store.createWebhook(
      input.tenantId,
      url.toString(),
      this.sealer.seal(secret),
      events,
    );
    this.store.audit(auth.kind, 'webhook.create', input.tenantId, { id: record.id });
    return {
      id: record.id,
      url: record.url,
      events,
      secret,
      created_at: new Date(record.created_at).toISOString(),
    };
  }

  listWebhooks(
    auth: AuthContext,
    tenantId: string,
  ): { id: string; url: string; events: string[] }[] {
    this.requireTenantScope(auth, tenantId);
    return this.store.listWebhooks(tenantId).map((w) => ({
      id: w.id,
      url: w.url,
      events: JSON.parse(w.events) as string[],
    }));
  }

  deleteWebhook(auth: AuthContext, tenantId: string, id: string): void {
    this.requireTenantScope(auth, tenantId);
    const webhook = this.store.listWebhooks(tenantId).find((w) => w.id === id);
    if (!webhook) throw notFound('Webhook');
    this.store.disableWebhook(id);
    this.store.audit(auth.kind, 'webhook.delete', tenantId, { id });
  }

  // ── usage ──────────────────────────────────────────────────────────────

  usage(
    auth: AuthContext,
    tenantId: string,
  ): { period: string; messages_sent: number; limit: number | null } {
    this.requireTenantScope(auth, tenantId);
    const plan = getPlan(this.config.plan);
    const period = currentPeriod();
    return {
      period,
      messages_sent: this.store.getUsage(tenantId, period),
      limit: plan.limits.maxMessagesPerMonth,
    };
  }

  // ── event delivery ─────────────────────────────────────────────────────

  async emit(event: RelayEvent): Promise<void> {
    const hooks = this.store.listWebhooks(event.tenant_id);
    for (const hook of hooks) {
      const events = JSON.parse(hook.events) as string[];
      if (!events.includes(event.type)) continue;
      const secret = this.sealer.open(hook.secret_enc);
      const body = JSON.stringify({
        type: event.type,
        created_at: new Date().toISOString(),
        data: event.data,
      });
      const signature = createHmac('sha256', secret).update(body).digest('hex');
      try {
        const status = await postWebhookEvent(hook.url, body, {
          'content-type': 'application/json',
          'x-relay-event': event.type,
          'x-relay-signature': `sha256=${signature}`,
        });
        if (status < 200 || status >= 300) {
          this.logger.warn('Webhook delivery failed', { url: hook.url, status });
        }
      } catch (cause) {
        this.logger.warn('Webhook delivery threw', { url: hook.url, error: String(cause) });
      }
    }
  }
}
