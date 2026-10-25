import type { Config } from './config.js';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

/**
 * Logs to stderr only. stdout belongs to the CLI / MCP transport.
 */
export function createLogger(level: Config['logLevel'] = 'info'): Logger {
  const threshold = LEVELS[level] ?? LEVELS.info;

  const emit = (
    name: keyof typeof LEVELS,
    message: string,
    fields?: Record<string, unknown>,
  ): void => {
    if (LEVELS[name] < threshold) return;
    const payload = fields ? ` ${JSON.stringify(fields)}` : '';
    process.stderr.write(`${name} ${message}${payload}\n`);
  };

  return {
    debug: (m, f) => emit('debug', m, f),
    info: (m, f) => emit('info', m, f),
    warn: (m, f) => emit('warn', m, f),
    error: (m, f) => emit('error', m, f),
  };
}

export function redact(value: string): string {
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}…${value.slice(-2)}`;
}
