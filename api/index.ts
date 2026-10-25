import { createApp } from '../src/app.js';
import { createRequestHandler } from '../src/http/server.js';

/**
 * The Vercel entry point.
 *
 * Vercel runs this as a serverless function: a request comes in, a response
 * goes out, and the process may be frozen or replaced between requests. That
 * is why the database must be remote — set `RELAY_DATABASE_URL` to a Turso
 * (libSQL) URL — and why the UI assets are inlined at build time.
 *
 * The handler is the same one the CLI wraps in an http.Server, so there is one
 * implementation of the product, not two.
 */
const app = createApp();

const handler = createRequestHandler({
  config: app.config,
  relay: app.relay,
  logger: app.logger,
  store: app.store,
});

export default function relay(request: unknown, response: unknown): void {
  handler(request as never, response as never);
}
