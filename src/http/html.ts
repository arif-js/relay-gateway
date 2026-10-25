import { createHmac, timingSafeEqual } from 'node:crypto';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * A string that is already safe HTML. The `html` tag inserts these without
 * escaping, so templates can be nested without double-escaping the markup.
 */
export class SafeHtml {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

export function isRaw(value: unknown): value is SafeHtml {
  return value instanceof SafeHtml;
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (isRaw(value)) return value.value;
  if (Array.isArray(value)) return value.map((item) => renderValue(item)).join('');
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return escapeHtml(String(value));
}

/**
 * An HTML template tag. Interpolated values are escaped; the literal parts are
 * markup. Values produced by this tag are marked raw, so nesting works.
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let out = strings[0] ?? '';
  for (let i = 0; i < values.length; i++) {
    out += renderValue(values[i]) + (strings[i + 1] ?? '');
  }
  return new SafeHtml(out);
}

/** The signature header the platform sends on outbound webhooks. */
export function signWebhook(secret: string, body: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

export function verifyWebhook(secret: string, body: string, signature: string): boolean {
  const expected = signWebhook(secret, body);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
