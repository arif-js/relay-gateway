import { createLiveTelegramClient } from './live.js';
import type {
  SendMessageParams,
  TelegramClient,
  TelegramMessage,
  TelegramResult,
  TelegramUpdate,
  TelegramUser,
} from './types.js';

export interface SentMessage {
  token: string;
  params: SendMessageParams;
  message: TelegramMessage;
}

export interface FakeState {
  sent: SentMessage[];
  webhooks: Map<string, { url: string; secret: string; allowed: string[] | undefined }>;
  updates: Map<string, TelegramUpdate[]>;
  managedBots: Map<number, string>;
  nextBotId: number;
  /** Usernames that already exist on "Telegram". Provisioned bots are added. */
  takenUsernames: Set<string>;
  /** What getMe reports as `can_manage_bots` for the manager bot. */
  canManageBots: boolean;
}

/**
 * An in-process stand-in for Telegram. It exists so the whole product is
 * clickable offline and so the test suite never touches the network.
 */
export function createFakeTelegramClient(): TelegramClient & { state: FakeState } {
  const state: FakeState = {
    sent: [],
    webhooks: new Map(),
    updates: new Map(),
    managedBots: new Map(),
    nextBotId: 1_000_000,
    takenUsernames: new Set(),
    canManageBots: true,
  };

  function ok<T>(result: T): TelegramResult<T> {
    return { ok: true, result };
  }

  return {
    kind: 'fake',
    state,

    async getMe(_token: string): Promise<TelegramResult<TelegramUser>> {
      return ok({
        id: 1,
        is_bot: true,
        first_name: 'relay-demo',
        username: 'relay_demo_bot',
        can_manage_bots: state.canManageBots,
      });
    },

    async getChat(_token: string, chatId: string) {
      const username = chatId.replace(/^@/, '').toLowerCase();
      if (state.takenUsernames.has(username)) return ok({ id: 1, username });
      return { ok: false, description: 'Bad Request: chat not found' };
    },

    async sendMessage(
      token: string,
      params: SendMessageParams,
    ): Promise<TelegramResult<TelegramMessage>> {
      const message: TelegramMessage = {
        message_id: state.sent.length + 1,
        from: { id: 1, is_bot: true, first_name: 'relay-demo', username: 'relay_demo_bot' },
        chat: {
          id: typeof params.chat_id === 'number' ? params.chat_id : 0,
          type: 'private',
          username:
            typeof params.chat_id === 'string' ? params.chat_id.replace(/^@/, '') : undefined,
        },
        date: 1_700_000_000,
        text: params.text,
      };
      state.sent.push({ token, params, message });
      return ok(message);
    },

    async getManagedBotToken(
      _managerToken: string,
      userId: number,
    ): Promise<TelegramResult<string>> {
      const token = state.managedBots.get(userId);
      if (!token) {
        return { ok: false, description: `No managed bot for user ${userId}` };
      }
      return ok(token);
    },

    async setWebhook(
      token: string,
      url: string,
      secret: string,
      allowedUpdates?: string[],
    ): Promise<TelegramResult<boolean>> {
      state.webhooks.set(token, { url, secret, allowed: allowedUpdates });
      return ok(true);
    },

    async deleteWebhook(token: string): Promise<TelegramResult<boolean>> {
      state.webhooks.delete(token);
      return ok(true);
    },

    async getUpdates(token: string, offset: number): Promise<TelegramResult<TelegramUpdate[]>> {
      const queued = state.updates.get(token) ?? [];
      const pending = queued.filter((u) => u.update_id >= offset);
      return ok(pending);
    },

    async provisionManagedBot(username: string, displayName: string) {
      const botId = state.nextBotId++;
      const token = `fake-managed-${botId}:${username}`;
      state.managedBots.set(botId, token);
      state.takenUsernames.add(username.toLowerCase());
      return { botId, username, token, displayName } as unknown as {
        botId: number;
        username: string;
        token: string;
      };
    },
  };
}

/**
 * Builds the client the platform should use. Demo mode swaps in the fake so
 * nothing touches the network.
 */
export function createTelegramClient(demo: boolean): TelegramClient {
  if (demo) return createFakeTelegramClient();
  return createLiveTelegramClient();
}
