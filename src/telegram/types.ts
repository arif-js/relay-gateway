export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  /** Only on getMe for a bot: whether Bot Management Mode is on in @BotFather. */
  can_manage_bots?: boolean;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number; type: string; username?: string; first_name?: string };
  date: number;
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  business_connection?: {
    id: string;
    user: TelegramUser;
    user_chat_id: number;
    date: number;
    is_enabled: boolean;
    rights?: Record<string, boolean>;
  };
  business_message?: TelegramMessage;
  managed_bot?: {
    user: TelegramUser;
    bot: TelegramUser;
  };
}

export interface SendMessageParams {
  chat_id: number | string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  business_connection_id?: string;
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_markup?: unknown;
  allow_paid_broadcast?: boolean;
}

export interface TelegramResult<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number; migrate_to_chat_id?: number };
}

/**
 * The narrow slice of the Bot API this platform uses. Keeping it an interface
 * means the demo fake and the test suite can substitute it wholesale.
 */
export interface TelegramClient {
  readonly kind: 'live' | 'fake';
  getMe(token: string): Promise<TelegramResult<TelegramUser>>;
  sendMessage(token: string, params: SendMessageParams): Promise<TelegramResult<TelegramMessage>>;
  getManagedBotToken(managerToken: string, userId: number): Promise<TelegramResult<string>>;
  /** Looks up a chat by id or `@username`. Used to tell whether a bot username is taken. */
  getChat(
    token: string,
    chatId: string,
  ): Promise<TelegramResult<{ id: number; username?: string }>>;
  setWebhook(
    token: string,
    url: string,
    secretToken: string,
    allowedUpdates?: string[],
  ): Promise<TelegramResult<boolean>>;
  deleteWebhook(token: string): Promise<TelegramResult<boolean>>;
  getUpdates(
    token: string,
    offset: number,
    timeoutSeconds: number,
  ): Promise<TelegramResult<TelegramUpdate[]>>;
  /** Only the fake implements this: provisions a managed bot without Telegram. */
  provisionManagedBot?(
    username: string,
    displayName: string,
  ): Promise<{ botId: number; username: string; token: string }>;
}
