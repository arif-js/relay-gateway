import type {
  SendMessageParams,
  TelegramClient,
  TelegramMessage,
  TelegramResult,
  TelegramUpdate,
  TelegramUser,
} from './types.js';

const API_BASE = 'https://api.telegram.org';

export interface LiveClientOptions {
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

/**
 * The real Bot API client. It is deliberately thin: one `call` method, no
 * retry logic (the limiter owns back-pressure), no state.
 */
export function createLiveTelegramClient(options: LiveClientOptions = {}): TelegramClient {
  const doFetch = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? API_BASE;

  async function call<T>(
    token: string,
    method: string,
    body?: Record<string, unknown>,
  ): Promise<TelegramResult<T>> {
    const url = `${baseUrl}/bot${token}/${method}`;
    let response: Response;
    try {
      response = await doFetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
    } catch (cause) {
      return { ok: false, description: `Network failure calling ${method}: ${String(cause)}` };
    }
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      return { ok: false, description: `Telegram returned a non-JSON response for ${method}` };
    }
    if (parsed && typeof parsed === 'object' && 'ok' in parsed) {
      return parsed as TelegramResult<T>;
    }
    return { ok: false, description: `Unexpected Telegram response for ${method}` };
  }

  return {
    kind: 'live',

    getMe: (token) => call<TelegramUser>(token, 'getMe'),

    sendMessage: (token, params: SendMessageParams) =>
      call<TelegramMessage>(token, 'sendMessage', { ...params }),

    getManagedBotToken: (token, userId) =>
      call<string>(token, 'getManagedBotToken', { user_id: userId }),

    getChat: (token, chatId) =>
      call<{ id: number; username?: string }>(token, 'getChat', { chat_id: chatId }),

    setWebhook: (token, url, secretToken, allowedUpdates) =>
      call<boolean>(token, 'setWebhook', {
        url,
        secret_token: secretToken,
        ...(allowedUpdates ? { allowed_updates: allowedUpdates } : {}),
      }),

    deleteWebhook: (token) => call<boolean>(token, 'deleteWebhook'),

    getUpdates: (token, offset, timeoutSeconds) =>
      call<TelegramUpdate[]>(token, 'getUpdates', { offset, timeout: timeoutSeconds }),
  };
}
