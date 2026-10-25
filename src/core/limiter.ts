/**
 * Telegram's rate limits, enforced by one shared limiter.
 *
 *   ~1 message/second to a single chat
 *   20 messages/minute to a single group
 *   ~30 messages/second overall for bulk
 *
 * The three are enforced independently. A single global token bucket with
 * per-chat and per-group budgets layered on top matches that. Per-worker
 * limiters multiply the real rate and get the bot throttled, so there is
 * exactly one limiter instance per process.
 */

const GLOBAL_PER_SECOND = 30;
const CHAT_PER_SECOND = 1;
const GROUP_PER_MINUTE = 20;

function now(): number {
  return Date.now();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = now();
  }

  private refill(): void {
    const t = now();
    const elapsed = (t - this.lastRefill) / 1000;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSecond);
    this.lastRefill = t;
  }

  /** Waits until a token is available, then consumes one. */
  async take(): Promise<void> {
    for (;;) {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const waitMs = Math.max(20, ((1 - this.tokens) / this.refillPerSecond) * 1000);
      await sleep(waitMs);
    }
  }
}

export interface LimiterOptions {
  globalPerSecond?: number;
  chatPerSecond?: number;
  groupPerMinute?: number;
}

export class RateLimiter {
  private readonly global: TokenBucket;
  private readonly chats = new Map<string, TokenBucket>();
  private readonly groups = new Map<string, { windowStart: number; count: number }>();

  constructor(private readonly options: LimiterOptions = {}) {
    this.global = new TokenBucket(
      options.globalPerSecond ?? GLOBAL_PER_SECOND,
      options.globalPerSecond ?? GLOBAL_PER_SECOND,
    );
  }

  private chatBucket(chatId: string): TokenBucket {
    let bucket = this.chats.get(chatId);
    if (!bucket) {
      const rate = this.options.chatPerSecond ?? CHAT_PER_SECOND;
      bucket = new TokenBucket(rate, rate);
      this.chats.set(chatId, bucket);
    }
    return bucket;
  }

  /**
   * Acquires permission to send one message to `chatId`.
   * `chatType` of `group` or `supergroup` also draws from the group budget.
   */
  async acquire(chatId: string, chatType?: string): Promise<void> {
    await this.global.take();
    await this.chatBucket(chatId).take();
    if (chatType === 'group' || chatType === 'supergroup') {
      await this.acquireGroup(chatId);
    }
  }

  private async acquireGroup(chatId: string): Promise<void> {
    const perMinute = this.options.groupPerMinute ?? GROUP_PER_MINUTE;
    for (;;) {
      const t = now();
      const state = this.groups.get(chatId) ?? { windowStart: t, count: 0 };
      if (t - state.windowStart >= 60_000) {
        state.windowStart = t;
        state.count = 0;
      }
      if (state.count < perMinute) {
        state.count += 1;
        this.groups.set(chatId, state);
        return;
      }
      this.groups.set(chatId, state);
      await sleep(Math.max(50, 60_000 - (t - state.windowStart)));
    }
  }
}

/** The single limiter instance the process uses. */
export const rateLimiter = new RateLimiter();
