import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export interface Session {
  subject: string;
  expiresAt: number;
}

const COOKIE_NAME = 'relay_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Cookie-based sessions for the dashboard. The cookie is an HMAC-signed
 * payload, so no session store is needed and a restart does not log anyone out.
 */
export class SessionStore {
  private readonly secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('base64url');
  }

  issue(subject: string, now = Date.now()): { cookie: string; session: Session } {
    const session: Session = { subject, expiresAt: now + SESSION_TTL_MS };
    const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
    return { cookie: `${payload}.${this.sign(payload)}`, session };
  }

  verify(cookie: string | undefined, now = Date.now()): Session | null {
    if (!cookie) return null;
    const [payload, signature] = cookie.split('.');
    if (!payload || !signature) return null;

    const expected = this.sign(payload);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    try {
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Session;
      if (typeof parsed.expiresAt !== 'number' || parsed.expiresAt < now) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  static cookieHeader(name: string, value: string, maxAgeSeconds: number): string {
    return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
  }

  static clearHeader(name: string): string {
    return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  }

  static get cookieName(): string {
    return COOKIE_NAME;
  }

  /** A fresh random value to use as the session secret when none is configured. */
  static randomSecret(): string {
    return randomBytes(32).toString('base64url');
  }
}
