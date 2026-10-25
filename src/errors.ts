/**
 * The closed set of error codes. Every failure the API or an MCP tool returns
 * uses one of these, so a caller can branch on `error.code` without parsing prose.
 */
export const ERROR_CODES = [
  'BAD_INPUT',
  'UNAUTHORIZED',
  'NOT_FOUND',
  'CONFLICT',
  'NOT_CONNECTED',
  'RATE_LIMITED',
  'PLAN_LIMIT',
  'TELEGRAM_ERROR',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class RelayError extends Error {
  readonly code: ErrorCode;
  readonly hint: string | undefined;
  readonly status: number;

  constructor(code: ErrorCode, message: string, hint?: string, status?: number) {
    super(message);
    this.name = 'RelayError';
    this.code = code;
    this.hint = hint;
    this.status = status ?? defaultStatus(code);
  }

  toJSON(): { code: ErrorCode; message: string; hint?: string } {
    return this.hint === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, hint: this.hint };
  }
}

function defaultStatus(code: ErrorCode): number {
  switch (code) {
    case 'BAD_INPUT':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    case 'NOT_CONNECTED':
      return 409;
    case 'RATE_LIMITED':
      return 429;
    case 'PLAN_LIMIT':
      return 402;
    case 'TELEGRAM_ERROR':
      return 502;
    case 'INTERNAL':
      return 500;
  }
}

export function badInput(message: string, hint?: string): RelayError {
  return new RelayError('BAD_INPUT', message, hint);
}

export function unauthorized(
  message = 'Missing or invalid credentials',
  hint?: string,
): RelayError {
  return new RelayError('UNAUTHORIZED', message, hint);
}

export function notFound(what: string, hint?: string): RelayError {
  return new RelayError('NOT_FOUND', `${what} not found`, hint);
}

export function conflict(message: string, hint?: string): RelayError {
  return new RelayError('CONFLICT', message, hint);
}

export function notConnected(
  message = 'This tenant has not connected a Telegram bot yet',
  hint?: string,
): RelayError {
  return new RelayError('NOT_CONNECTED', message, hint);
}

export function planLimit(message: string, hint?: string): RelayError {
  return new RelayError('PLAN_LIMIT', message, hint);
}

export function telegramError(message: string, hint?: string): RelayError {
  return new RelayError('TELEGRAM_ERROR', message, hint);
}

export function internal(message: string, hint?: string): RelayError {
  return new RelayError('INTERNAL', message, hint);
}
