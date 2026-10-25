import type { IncomingMessage, ServerResponse } from 'node:http';

export interface RequestContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  params: Record<string, string>;
  body: unknown;
}

export type Handler = (ctx: RequestContext) => Promise<void> | void;

interface Route {
  method: string;
  segments: string[];
  handler: Handler;
}

const MAX_BODY_BYTES = 1_000_000;

export class Router {
  private readonly routes: Route[] = [];

  add(method: string, pattern: string, handler: Handler): this {
    this.routes.push({
      method: method.toUpperCase(),
      segments: pattern.split('/').filter((s) => s.length > 0),
      handler,
    });
    return this;
  }

  get(pattern: string, handler: Handler): this {
    return this.add('GET', pattern, handler);
  }

  post(pattern: string, handler: Handler): this {
    return this.add('POST', pattern, handler);
  }

  delete(pattern: string, handler: Handler): this {
    return this.add('DELETE', pattern, handler);
  }

  match(
    method: string,
    pathname: string,
  ): { handler: Handler; params: Record<string, string> } | null {
    const parts = pathname.split('/').filter((s) => s.length > 0);
    let pathMatched = false;

    for (const route of this.routes) {
      if (route.segments.length !== parts.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < route.segments.length; i++) {
        const seg = route.segments[i] as string;
        const part = parts[i] as string;
        if (seg.startsWith(':')) {
          params[seg.slice(1)] = decodeURIComponent(part);
        } else if (seg !== part) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      pathMatched = true;
      if (route.method === method.toUpperCase()) {
        return { handler: route.handler, params };
      }
    }
    return pathMatched ? null : null;
  }
}

/**
 * Reads the request body. JSON and form-urlencoded are both accepted, because
 * the dashboard's forms post urlencoded while the API posts JSON.
 */
export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error('Request body too large');
    }
    chunks.push(buf);
  }
  if (size === 0) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8');

  const contentType = req.headers['content-type'] ?? '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  if (contentType.includes('multipart/form-data')) {
    throw new Error('Multipart bodies are not supported');
  }

  try {
    return JSON.parse(raw);
  } catch {
    // A form post with no content type still arrives as urlencoded.
    if (raw.includes('=') && !raw.trimStart().startsWith('{')) {
      return Object.fromEntries(new URLSearchParams(raw));
    }
    throw new Error('Request body is not valid JSON');
  }
}

export function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

export function sendHtml(res: ServerResponse, status: number, html: string): void {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'content-length': Buffer.byteLength(html),
  });
  res.end(html);
}

export function sendText(res: ServerResponse, status: number, text: string): void {
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'content-length': Buffer.byteLength(text),
  });
  res.end(text);
}
