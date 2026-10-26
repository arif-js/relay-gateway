import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { verifyToken } from '@clerk/backend';
import type { Config } from '../config.js';
import { safeEqual } from '../core/crypto.js';
import { getPlan } from '../core/plans.js';
import type { AuthContext } from '../core/store.js';
import { badInput, RelayError } from '../errors.js';
import { type Logger, redact } from '../logger.js';
// The stylesheet, the client script and the logo are inlined at build time,
// so the same bundle works on a normal host and on a serverless one, where a
// file read with a dynamic path would not be included.
import {
  apple_touch_icon as appleTouchIconBase64,
  app_js as clientScript,
  favicon_16_png as favicon16PngBase64,
  favicon_32_png as favicon32PngBase64,
  favicon_ico as faviconIcoBase64,
  favicon_png as faviconPngBase64,
  favicon_svg as faviconSvg,
  logo_png as logoBase64,
  main_css as reactMainCss,
  main_js as reactMainJs,
  styles_css as styles,
} from '../ui/assets.generated.js';
import { connectPage, dashboardPage, docsPage } from '../ui/dashboard.js';
import { landingPage, pricingPage } from '../ui/pages.js';
import { loginPage, tenantPage } from '../ui/tenant.js';
import { type RequestContext, Router, readJsonBody, sendHtml, sendJson } from './router.js';
import { type Session, SessionStore } from './session.js';

function bearer(req: RequestContext['req']): string | undefined {
  const header = req.headers.authorization;
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim();
}

export type RequestHandler = (req: IncomingMessage, res: ServerResponse) => void;

export interface ServerDeps {
  config: Config;
  relay: import('../core/relay.js').Relay;
  logger: Logger;
  store: import('../core/store.js').Store;
}

/**
 * The request handler, without the http.Server around it. A serverless host
 * (Vercel) hands us a request and a response and expects them handled; the
 * CLI wraps the same function in a real server.
 */
export function createRequestHandler(deps: ServerDeps): RequestHandler {
  return (req, res) => {
    handleRequest(deps, req, res);
  };
}

export function createHttpServer(deps: ServerDeps): Server {
  return createServer(createRequestHandler(deps));
}

function handleRequest(deps: ServerDeps, req: IncomingMessage, res: ServerResponse): void {
  const { config, relay, logger, store } = deps;
  const router = new Router();

  const sessions = new SessionStore(config.encryptionKey);

  // ── assets ─────────────────────────────────────────────────────────────

  router.get('/assets/styles.css', ({ res }) => {
    res.writeHead(200, {
      'content-type': 'text/css; charset=utf-8',
      'cache-control': 'public, max-age=300',
    });
    res.end(styles);
  });

  router.get('/assets/app.js', ({ res }) => {
    res.writeHead(200, {
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'public, max-age=300',
    });
    res.end(clientScript);
  });

  const logoBuffer = Buffer.from(logoBase64, 'base64');
  router.get('/assets/logo.png', ({ res }) => {
    res.writeHead(200, {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400',
    });
    res.end(logoBuffer);
  });

  const faviconBuffer = Buffer.from(faviconPngBase64, 'base64');
  const favicon16Buffer = Buffer.from(favicon16PngBase64, 'base64');
  const favicon32Buffer = Buffer.from(favicon32PngBase64, 'base64');
  const faviconIcoBuffer = Buffer.from(faviconIcoBase64, 'base64');
  const appleTouchIconBuffer = Buffer.from(appleTouchIconBase64, 'base64');

  for (const [path, contentType, buffer] of [
    ['/favicon-16x16.png', 'image/png', favicon16Buffer],
    ['/favicon-32x32.png', 'image/png', favicon32Buffer],
    ['/favicon.ico', 'image/x-icon', faviconIcoBuffer],
    ['/apple-touch-icon.png', 'image/png', appleTouchIconBuffer],
  ] as const) {
    router.get(path, ({ res }) => {
      res.writeHead(200, {
        'content-type': contentType,
        'cache-control': 'public, max-age=300',
      });
      res.end(buffer);
    });
  }

  router.get('/assets/favicon.png', ({ res }) => {
    res.writeHead(200, {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400',
    });
    res.end(faviconBuffer);
  });

  router.get('/assets/favicon.svg', ({ res }) => {
    res.writeHead(200, {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    });
    res.end(faviconSvg);
  });

  router.get('/favicon.png', ({ res }) => {
    res.writeHead(200, {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400',
    });
    res.end(faviconBuffer);
  });

  router.get('/favicon.svg', ({ res }) => {
    res.writeHead(200, {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    });
    res.end(faviconSvg);
  });

  router.get('/assets/main.css', ({ res }) => {
    res.writeHead(200, {
      'content-type': 'text/css; charset=utf-8',
      'cache-control': 'public, max-age=300',
    });
    res.end(reactMainCss);
  });

  router.get('/assets/main.js', ({ res }) => {
    res.writeHead(200, {
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'public, max-age=300',
    });
    res.end(reactMainJs);
  });

  // ── web pages ──────────────────────────────────────────────────────────

  router.get('/', ({ res }) => {
    sendHtml(res, 200, landingPage());
  });

  router.get('/pricing', ({ res }) => {
    sendHtml(res, 200, pricingPage(getPlan(config.plan)));
  });

  router.get('/docs', ({ res }) => {
    sendHtml(res, 200, docsPage());
  });

  router.get('/open-source', ({ res }) => {
    sendHtml(res, 200, docsPage());
  });

  router.get('/healthz', ({ res }) => {
    sendJson(res, 200, {
      ok: true,
      data: {
        status: 'alive',
        demo: config.demo,
        plan: config.plan,
        clerk_publishable_key:
          process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
          process.env.VITE_CLERK_PUBLISHABLE_KEY ||
          '',
      },
    });
  });

  // ── dashboard (session authenticated) ──────────────────────────────────

  const sessionFor = (ctx: RequestContext): Session | null => {
    const cookies = ctx.req.headers.cookie ?? '';
    const match = cookies
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SessionStore.cookieName}=`));
    const value = match?.slice(SessionStore.cookieName.length + 1);
    return sessions.verify(value);
  };

  router.get('/login', ({ res, url }) => {
    const error = url.searchParams.get('error');
    sendHtml(res, 200, loginPage({ error: error ?? undefined }));
  });

  router.get('/signup', ({ res, url }) => {
    const error = url.searchParams.get('error');
    sendHtml(res, 200, loginPage({ error: error ?? undefined }));
  });

  router.get('/dashboard/login', ({ res, url }) => {
    const error = url.searchParams.get('error');
    sendHtml(res, 200, loginPage({ error: error ?? undefined }));
  });

  router.post('/login', (ctx) => {
    const body = (ctx.body ?? {}) as { key?: string };
    const key = body.key ?? '';
    if (key.length > 0 && key === config.adminKey) {
      const { cookie } = sessions.issue('admin');
      ctx.res.setHeader(
        'set-cookie',
        SessionStore.cookieHeader(SessionStore.cookieName, cookie, 12 * 60 * 60),
      );
      ctx.res.writeHead(302, { location: '/dashboard' });
      ctx.res.end();
      return;
    }
    sendHtml(ctx.res, 401, loginPage({ error: 'That key is not correct.' }));
  });

  router.post('/dashboard/login', (ctx) => {
    const body = (ctx.body ?? {}) as { key?: string };
    const key = body.key ?? '';
    if (key.length > 0 && key === config.adminKey) {
      const { cookie } = sessions.issue('admin');
      ctx.res.setHeader(
        'set-cookie',
        SessionStore.cookieHeader(SessionStore.cookieName, cookie, 12 * 60 * 60),
      );
      ctx.res.writeHead(302, { location: '/dashboard' });
      ctx.res.end();
      return;
    }
    sendHtml(ctx.res, 401, loginPage({ error: 'That key is not correct.' }));
  });

  router.post('/dashboard/logout', ({ res }) => {
    res.setHeader('set-cookie', SessionStore.clearHeader(SessionStore.cookieName));
    res.writeHead(302, { location: '/' });
    res.end();
  });

  const hasClerkConfig = () =>
    Boolean(
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY,
    );

  router.get('/dashboard', (ctx) => {
    if (!sessionFor(ctx)) {
      if (hasClerkConfig()) {
        sendHtml(ctx.res, 200, loginPage({}));
        return;
      }
      ctx.res.writeHead(302, { location: '/dashboard/login' });
      ctx.res.end();
      return;
    }
    const tenants = store.listTenants();
    const messages = tenants
      .flatMap((tenant) => store.listMessages(tenant.id, 20))
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 40);
    const usage = tenants.reduce(
      (sum, tenant) => sum + store.getUsage(tenant.id, currentPeriodKey()),
      0,
    );
    sendHtml(
      ctx.res,
      200,
      dashboardPage({
        plan: getPlan(config.plan),
        tenants,
        messages,
        usageThisPeriod: usage,
        flash: ctx.url.searchParams.get('ok')
          ? { kind: 'ok' as const, text: ctx.url.searchParams.get('ok') as string }
          : ctx.url.searchParams.get('error')
            ? { kind: 'error' as const, text: ctx.url.searchParams.get('error') as string }
            : undefined,
      }),
    );
  });

  router.get('/dashboard/tenants/:id', (ctx) => {
    if (!sessionFor(ctx)) {
      if (hasClerkConfig()) {
        sendHtml(ctx.res, 200, loginPage({}));
        return;
      }
      ctx.res.writeHead(302, { location: '/dashboard/login' });
      ctx.res.end();
      return;
    }
    const tenant = store.getTenant(ctx.params.id ?? '');
    if (!tenant) {
      ctx.res.writeHead(302, { location: '/dashboard' });
      ctx.res.end();
      return;
    }
    const connections = store.listConnections(tenant.id);
    const latest = connections.find((c) => c.status === 'pending') ?? connections[0] ?? null;
    sendHtml(
      ctx.res,
      200,
      tenantPage({
        plan: getPlan(config.plan),
        tenant,
        messages: store.listMessages(tenant.id, 50),
        connection: latest,
        connectLink: relay.connectLinkFor(tenant.id),
        usage: relay.usage({ kind: 'admin', tenantId: null, keyId: null }, tenant.id),
        apiKeys: store.listApiKeys(tenant.id),
        flash: ctx.url.searchParams.get('ok')
          ? { kind: 'ok' as const, text: ctx.url.searchParams.get('ok') as string }
          : ctx.url.searchParams.get('error')
            ? { kind: 'error' as const, text: ctx.url.searchParams.get('error') as string }
            : undefined,
      }),
    );
  });

  router.post('/dashboard/tenants/:id/connect', async (ctx) => {
    if (!sessionFor(ctx)) {
      ctx.res.writeHead(302, { location: '/dashboard/login' });
      ctx.res.end();
      return;
    }
    const tenantId = ctx.params.id ?? '';
    try {
      const link = relay.createConnectLink(
        { kind: 'admin', tenantId: null, keyId: null },
        tenantId,
      );
      ctx.res.writeHead(302, {
        location: `/dashboard/tenants/${tenantId}?ok=${encodeURIComponent(link.url)}`,
      });
      ctx.res.end();
    } catch (cause) {
      const message = cause instanceof RelayError ? cause.message : 'Could not mint a link';
      ctx.res.writeHead(302, {
        location: `/dashboard/tenants/${tenantId}?error=${encodeURIComponent(message)}`,
      });
      ctx.res.end();
    }
  });

  router.post('/dashboard/tenants/:id/send', async (ctx) => {
    if (!sessionFor(ctx)) {
      ctx.res.writeHead(302, { location: '/dashboard/login' });
      ctx.res.end();
      return;
    }
    const tenantId = ctx.params.id ?? '';
    const body = (ctx.body ?? {}) as { chat_id?: string; text?: string };
    // The page's script posts JSON and expects JSON; a plain form post gets a
    // redirect back to the page with a message.
    const wantsJson = (ctx.req.headers.accept ?? '').includes('application/json');
    try {
      const record = await relay.sendMessage(
        { kind: 'tenant', tenantId, keyId: null },
        { tenantId, chatId: body.chat_id ?? '', text: body.text ?? '' },
      );
      if (wantsJson) {
        sendJson(ctx.res, 201, {
          ok: true,
          data: { id: record.id, chat_id: record.chat_id, status: record.status },
        });
        return;
      }
      ctx.res.writeHead(302, {
        location: `/dashboard/tenants/${tenantId}?ok=${encodeURIComponent('Message sent.')}`,
      });
      ctx.res.end();
    } catch (cause) {
      const message = cause instanceof RelayError ? cause.message : 'Could not send the message';
      if (wantsJson) {
        sendJson(ctx.res, cause instanceof RelayError ? cause.status : 500, {
          ok: false,
          error: { code: cause instanceof RelayError ? cause.code : 'INTERNAL', message },
        });
        return;
      }
      ctx.res.writeHead(302, {
        location: `/dashboard/tenants/${tenantId}?error=${encodeURIComponent(message)}`,
      });
      ctx.res.end();
    }
  });

  router.get('/connect/:token', ({ res, params }) => {
    const token = params.token ?? '';
    const connection = store.getConnectionByToken(token);
    if (!connection) {
      sendHtml(
        res,
        404,
        connectPage({
          token,
          tenantName: '',
          status: 'pending',
          error: 'This connect link is not valid. Ask the operator for a new one.',
        }),
      );
      return;
    }
    const tenant = store.getTenant(connection.tenant_id);
    sendHtml(
      res,
      200,
      connectPage({
        token,
        tenantName: tenant?.name ?? 'A business',
        status: connection.status === 'completed' ? 'completed' : 'pending',
        botUsername: tenant?.bot_username ?? undefined,
      }),
    );
  });

  // ── API ────────────────────────────────────────────────────────────────

  const requireAuth = (ctx: RequestContext): AuthContext => relay.authenticate(bearer(ctx.req));

  const clerkUserIdFromReq = async (req: IncomingMessage): Promise<string | null> => {
    if (config.demo) {
      const headerId = req.headers['x-clerk-user-id'];
      if (typeof headerId === 'string' && headerId.length > 0) return headerId;
    }
    const token = bearer(req);
    if (!token) return null;
    const secret = process.env.CLERK_SECRET_KEY;
    if (!secret) return null;
    try {
      const verified = await verifyToken(token, { secretKey: secret });
      return (verified.sub as string) || null;
    } catch {
      return null;
    }
  };

  const MAX_MERCHANT_TENANTS = 3;

  router.get('/v1/merchant/tenant', async (ctx) => {
    const userId = await clerkUserIdFromReq(ctx.req);
    if (!userId) {
      sendJson(ctx.res, 401, {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }
    const tenants = store.listTenantsByClerkUserId(userId);
    const tenantSummaries = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      bot_username: t.bot_username,
      created_at: t.created_at,
    }));

    if (tenants.length === 0) {
      sendJson(ctx.res, 200, {
        ok: true,
        data: { tenant: null, tenants: [], max_tenants: MAX_MERCHANT_TENANTS },
      });
      return;
    }

    const requestedId = ctx.url.searchParams.get('tenant_id');
    if (requestedId && !tenants.some((t) => t.id === requestedId)) {
      sendJson(ctx.res, 404, {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' },
      });
      return;
    }

    const tenant =
      (requestedId ? tenants.find((t) => t.id === requestedId) : tenants[0]) ?? tenants[0];
    if (!tenant) {
      return;
    }
    const connections = store.listConnections(tenant.id);
    const connection = connections.find((c) => c.status === 'pending') ?? connections[0] ?? null;

    const shouldMintKey =
      ctx.url.searchParams.get('mint_key') === '1' ||
      store.listApiKeys(tenant.id).filter((k) => !k.revoked_at).length === 0;
    const liveKey = shouldMintKey
      ? store.createApiKey(tenant.id, 'clerk-session', 'live').secret
      : undefined;

    sendJson(ctx.res, 200, {
      ok: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          status: tenant.status,
          bot_username: tenant.bot_username,
          created_at: tenant.created_at,
        },
        tenants: tenantSummaries,
        max_tenants: MAX_MERCHANT_TENANTS,
        connection: connection ? { id: connection.id, status: connection.status } : null,
        connect_link: relay.connectLinkFor(tenant.id),
        api_key: liveKey,
      },
    });
  });

  router.post('/v1/merchant/tenant', async (ctx) => {
    const userId = await clerkUserIdFromReq(ctx.req);
    if (!userId) {
      sendJson(ctx.res, 401, {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }
    const existing = store.listTenantsByClerkUserId(userId);
    if (existing.length >= MAX_MERCHANT_TENANTS) {
      sendJson(ctx.res, 403, {
        ok: false,
        error: {
          code: 'PLAN_LIMIT',
          message: `You can create up to ${MAX_MERCHANT_TENANTS} tenants on the free preview plan.`,
          hint: 'Each tenant includes 1 dedicated Telegram bot and isolated API key.',
        },
      });
      return;
    }

    const body = (ctx.body ?? {}) as { name?: string };
    const name = (body.name ?? '').trim() || `Tenant ${existing.length + 1}`;

    const result = relay.createTenant({ kind: 'admin', tenantId: null, keyId: null }, name, userId);
    const tenant = result.tenant;
    const apiKeySecret = result.apiKey;

    const connectLink = relay.createConnectLink(
      { kind: 'admin', tenantId: null, keyId: null },
      tenant.id,
    );
    const updatedTenants = store.listTenantsByClerkUserId(userId).map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      bot_username: t.bot_username,
      created_at: t.created_at,
    }));

    sendJson(ctx.res, 201, {
      ok: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          status: tenant.status,
          bot_username: tenant.bot_username,
          created_at: tenant.created_at,
        },
        tenants: updatedTenants,
        max_tenants: MAX_MERCHANT_TENANTS,
        connect_link: connectLink,
        api_key: apiKeySecret,
      },
    });
  });

  router.post('/v1/tenants', async (ctx) => {
    const auth = requireAuth(ctx);
    const body = (ctx.body ?? {}) as { name?: string };
    const result = relay.createTenant(auth, body.name ?? '');
    sendJson(ctx.res, 201, {
      ok: true,
      data: {
        id: result.tenant.id,
        name: result.tenant.name,
        status: result.tenant.status,
        api_key: result.apiKey,
        created_at: new Date(result.tenant.created_at).toISOString(),
      },
    });
  });

  router.get('/v1/tenants', (ctx) => {
    const auth = requireAuth(ctx);
    const tenants = relay.listTenants(auth);
    sendJson(ctx.res, 200, {
      ok: true,
      data: tenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        mode: tenant.mode,
        bot_username: tenant.bot_username,
        created_at: new Date(tenant.created_at).toISOString(),
      })),
    });
  });

  router.get('/v1/tenants/:id', (ctx) => {
    const auth = requireAuth(ctx);
    const tenant = relay.getTenant(auth, ctx.params.id ?? '');
    sendJson(ctx.res, 200, {
      ok: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        mode: tenant.mode,
        bot_username: tenant.bot_username,
        created_at: new Date(tenant.created_at).toISOString(),
        connected_at: tenant.updated_at ? new Date(tenant.updated_at).toISOString() : null,
      },
    });
  });

  router.post('/v1/tenants/:id/connect-links', (ctx) => {
    const auth = requireAuth(ctx);
    const link = relay.createConnectLink(auth, ctx.params.id ?? '');
    sendJson(ctx.res, 201, { ok: true, data: link });
  });

  router.get('/v1/connect/:token/status', (ctx) => {
    const connection = store.getConnectionByToken(ctx.params.token ?? '');
    if (!connection) {
      sendJson(ctx.res, 404, {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Connect link not found' },
      });
      return;
    }
    const tenant = store.getTenant(connection.tenant_id);
    sendJson(ctx.res, 200, {
      ok: true,
      data: {
        status: connection.status,
        bot_username: tenant?.bot_username ?? null,
        tenant_name: tenant?.name ?? null,
      },
    });
  });

  router.post('/v1/connect/:token/complete', async (ctx) => {
    const body = (ctx.body ?? {}) as { username?: string; display_name?: string };
    const result = await relay.chooseBotName(ctx.params.token ?? '', {
      username: body.username ?? '',
      displayName: body.display_name ?? '',
    });
    const connection = store.getConnection(result.connection_id);
    const tenant = connection ? store.getTenant(connection.tenant_id) : null;
    sendJson(ctx.res, 200, {
      ok: true,
      data: {
        connection_id: result.connection_id,
        status: result.status,
        next_url: result.next_url,
        bot_username: tenant?.bot_username ?? null,
      },
    });
  });

  router.post('/v1/messages', async (ctx) => {
    const auth = requireAuth(ctx);
    const body = (ctx.body ?? {}) as {
      tenant_id?: string;
      chat_id?: string | number;
      text?: string;
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disable_notification?: boolean;
      protect_content?: boolean;
    };
    if (body.chat_id === undefined) throw badInput('`chat_id` is required');
    if (!body.text) throw badInput('`text` is required');
    const tenantId = auth.tenantId ?? body.tenant_id ?? '';
    if (!tenantId) throw badInput('`tenant_id` is required when using a platform key');

    const record = await relay.sendMessage(auth, {
      tenantId,
      chatId: body.chat_id,
      text: body.text,
      parseMode: body.parse_mode,
      disableNotification: body.disable_notification,
      protectContent: body.protect_content,
    });
    sendJson(ctx.res, 201, {
      ok: true,
      data: {
        id: record.id,
        chat_id: record.chat_id,
        status: record.status,
        telegram_message_id: record.telegram_message_id,
        created_at: new Date(record.created_at).toISOString(),
      },
    });
  });

  router.get('/v1/messages', (ctx) => {
    const auth = requireAuth(ctx);
    const tenantId = auth.tenantId;
    if (!tenantId) throw badInput('This key is not tenant-scoped');
    const limit = Number(ctx.url.searchParams.get('limit') ?? '50');
    const messages = relay.listMessages(auth, tenantId, Math.min(Math.max(limit, 1), 200));
    sendJson(ctx.res, 200, {
      ok: true,
      data: messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        chat_id: m.chat_id,
        text: m.text,
        status: m.status,
        error: m.error,
        created_at: new Date(m.created_at).toISOString(),
      })),
    });
  });

  router.get('/v1/tenants/:id/messages', (ctx) => {
    const auth = requireAuth(ctx);
    const limit = Number(ctx.url.searchParams.get('limit') ?? '50');
    const messages = relay.listMessages(
      auth,
      ctx.params.id ?? '',
      Math.min(Math.max(limit, 1), 200),
    );
    sendJson(ctx.res, 200, {
      ok: true,
      data: messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        chat_id: m.chat_id,
        text: m.text,
        status: m.status,
        created_at: new Date(m.created_at).toISOString(),
      })),
    });
  });

  router.post('/v1/webhooks', (ctx) => {
    const auth = requireAuth(ctx);
    const body = (ctx.body ?? {}) as { url?: string; events?: string[]; tenant_id?: string };
    const tenantId = auth.tenantId ?? body.tenant_id ?? '';
    if (!tenantId) throw badInput('`tenant_id` is required for a platform key');
    if (!body.url) throw badInput('`url` is required');
    const record = relay.registerWebhook(auth, {
      tenantId,
      url: body.url,
      events: body.events ?? [],
    });
    sendJson(ctx.res, 201, { ok: true, data: record });
  });

  router.get('/v1/webhooks', (ctx) => {
    const auth = requireAuth(ctx);
    const tenantId = auth.tenantId ?? ctx.url.searchParams.get('tenant_id') ?? '';
    if (!tenantId) throw badInput('`tenant_id` is required for a platform key');
    sendJson(ctx.res, 200, { ok: true, data: relay.listWebhooks(auth, tenantId) });
  });

  router.delete('/v1/webhooks/:id', (ctx) => {
    const auth = requireAuth(ctx);
    const tenantId = auth.tenantId ?? ctx.url.searchParams.get('tenant_id') ?? '';
    if (!tenantId) throw badInput('`tenant_id` is required for a platform key');
    relay.deleteWebhook(auth, tenantId, ctx.params.id ?? '');
    sendJson(ctx.res, 200, { ok: true, data: { deleted: true } });
  });

  router.get('/v1/usage', (ctx) => {
    const auth = requireAuth(ctx);
    const tenantId = auth.tenantId ?? ctx.url.searchParams.get('tenant_id') ?? '';
    if (!tenantId) throw badInput('`tenant_id` is required for a platform key');
    sendJson(ctx.res, 200, { ok: true, data: relay.usage(auth, tenantId) });
  });

  // ── Telegram → us ──────────────────────────────────────────────────────

  router.post('/v1/telegram/webhook', async (ctx) => {
    const secret = ctx.req.headers['x-telegram-bot-api-secret-token'];
    if (secret !== config.telegramWebhookSecret) {
      sendJson(ctx.res, 401, { ok: false, error: { code: 'UNAUTHORIZED', message: 'Bad secret' } });
      return;
    }
    const update = (ctx.body ?? {}) as import('../telegram/types.js').TelegramUpdate;
    if (update.managed_bot) {
      await relay.handleManagedBotUpdate(update.managed_bot);
    }
    sendJson(ctx.res, 200, { ok: true, data: { received: true } });
  });

  // Updates for a tenant's own bot (end users writing to it).
  router.post('/v1/telegram/bots/:tenantId', async (ctx) => {
    const tenantId = ctx.params.tenantId ?? '';
    const secret = ctx.req.headers['x-telegram-bot-api-secret-token'];
    if (typeof secret !== 'string' || !safeEqual(secret, relay.tenantBotSecret(tenantId))) {
      logger.warn('Tenant bot update unauthorized', {
        tenantId,
        received: typeof secret === 'string' ? redact(secret) : 'not-a-string',
        expected: redact(relay.tenantBotSecret(tenantId)),
      });
      sendJson(ctx.res, 401, { ok: false, error: { code: 'UNAUTHORIZED', message: 'Bad secret' } });
      return;
    }
    const update = (ctx.body ?? {}) as import('../telegram/types.js').TelegramUpdate;
    await relay.handleTenantBotUpdate(tenantId, update);
    sendJson(ctx.res, 200, { ok: true, data: { received: true } });
  });

  // ── dispatch ───────────────────────────────────────────────────────────

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  const finish = (): void => {
    if (!res.writableEnded) {
      sendJson(res, 404, {
        ok: false,
        error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${url.pathname}` },
      });
    }
  };

  const matched = router.match(req.method ?? 'GET', url.pathname);

  if (!matched) {
    // Unknown path: let the HTML pages answer, otherwise a JSON 404.
    if (req.method === 'GET' && !url.pathname.startsWith('/v1')) {
      sendHtml(
        res,
        404,
        `<!doctype html><html><head><title>Not found</title><link rel="stylesheet" href="/assets/styles.css"></head><body><div class="connect-shell"><div class="connect-card"><h1>Not found</h1><p>There is nothing at <code>${url.pathname}</code>.</p><a class="btn" href="/">Go home</a></div></div></body></html>`,
      );
      return;
    }
    finish();
    return;
  }

  const ctx: RequestContext = { req, res, url, params: matched.params, body: undefined };

  const run = async (): Promise<void> => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      try {
        ctx.body = await readJsonBody(req);
      } catch (cause) {
        sendJson(res, 400, {
          ok: false,
          error: {
            code: 'BAD_INPUT',
            message: cause instanceof Error ? cause.message : 'Bad request',
          },
        });
        return;
      }
    }
    await matched.handler(ctx);
  };

  run().catch((cause) => {
    if (cause instanceof RelayError) {
      sendJson(res, cause.status, { ok: false, error: cause.toJSON() });
      return;
    }
    logger.error('Unhandled error', { path: url.pathname, error: String(cause) });
    sendJson(res, 500, {
      ok: false,
      error: { code: 'INTERNAL', message: 'Something went wrong on our side' },
    });
  });
}

function currentPeriodKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}
