import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { Relay } from '../core/relay.js';
import type { Store } from '../core/store.js';
import { RelayError } from '../errors.js';

function envelope<T>(data: T, warnings: string[] = []): { ok: true; data: T; warnings: string[] } {
  return { ok: true, data, warnings };
}

function failure(cause: unknown): {
  ok: false;
  error: { code: string; message: string; hint?: string };
} {
  if (cause instanceof RelayError) {
    return { ok: false, error: cause.toJSON() };
  }
  return {
    ok: false,
    error: { code: 'INTERNAL', message: cause instanceof Error ? cause.message : String(cause) },
  };
}

export interface McpDeps {
  relay: Relay;
  store: Store;
  adminKey: string;
}

/**
 * The MCP surface. It is a thin skin over the same `Relay` service the HTTP API
 * uses, so behaviour cannot drift between the two.
 */
export function createMcpServer(deps: McpDeps): McpServer {
  const { relay, store, adminKey } = deps;
  const server = new McpServer({
    name: 'relay-gateway',
    version: '0.1.0',
  });

  const admin = () => relay.authenticate(adminKey);

  server.registerTool(
    'relay_list_tenants',
    {
      title: 'List tenants',
      description:
        'List every tenant on this platform with its connection state and bot username. Tenants are the platform customers who connect their own Telegram bot.',
      inputSchema: {},
    },
    async () => {
      try {
        const tenants = relay.listTenants(admin());
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                envelope(
                  tenants.map((t) => ({
                    id: t.id,
                    name: t.name,
                    status: t.status,
                    mode: t.mode,
                    bot_username: t.bot_username,
                    created_at: new Date(t.created_at).toISOString(),
                  })),
                ),
                null,
                2,
              ),
            },
          ],
        };
      } catch (cause) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(failure(cause), null, 2) }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'relay_create_tenant',
    {
      title: 'Create a tenant',
      description:
        'Create a tenant (one of the platform customers) and return its tenant-scoped API key. The key is shown once.',
      inputSchema: { name: z.string().min(1).max(120).describe('Display name of the tenant') },
    },
    async ({ name }) => {
      try {
        const result = relay.createTenant(admin(), name);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                envelope({
                  id: result.tenant.id,
                  name: result.tenant.name,
                  status: result.tenant.status,
                  api_key: result.apiKey,
                }),
                null,
                2,
              ),
            },
          ],
        };
      } catch (cause) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(failure(cause), null, 2) }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'relay_create_connect_link',
    {
      title: 'Create a connect link',
      description:
        'Mint a connect link for a tenant. Send the URL to the tenant; they pick a bot name on it and Telegram creates the bot.',
      inputSchema: { tenant_id: z.string().describe('The tenant id') },
    },
    async ({ tenant_id }) => {
      try {
        const link = relay.createConnectLink(admin(), tenant_id);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(envelope(link), null, 2) }],
        };
      } catch (cause) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(failure(cause), null, 2) }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'relay_send_message',
    {
      title: 'Send a message',
      description:
        "Send a message as a tenant's own Telegram bot. The tenant must be connected. This is the outbound operation; it cannot send to someone who never started a chat with the bot.",
      inputSchema: {
        tenant_id: z.string().describe('The tenant whose bot sends the message'),
        chat_id: z
          .union([z.string(), z.number()])
          .describe('Numeric Telegram user id or @username'),
        text: z.string().min(1).max(4096).describe('The message body'),
        parse_mode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).optional(),
        disable_notification: z.boolean().optional(),
      },
    },
    async ({ tenant_id, chat_id, text, parse_mode, disable_notification }) => {
      try {
        const auth = relay.authenticate(adminKey);
        const record = await relay.sendMessage(
          { kind: 'tenant', tenantId: tenant_id, keyId: null },
          {
            tenantId: tenant_id,
            chatId: chat_id,
            text,
            parseMode: parse_mode,
            disableNotification: disable_notification,
          },
        );
        void auth;
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                envelope({
                  id: record.id,
                  chat_id: record.chat_id,
                  status: record.status,
                  telegram_message_id: record.telegram_message_id,
                }),
                null,
                2,
              ),
            },
          ],
        };
      } catch (cause) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(failure(cause), null, 2) }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'relay_list_messages',
    {
      title: 'Read the message log',
      description:
        "Read a tenant's message log, newest first, for both sent and received messages.",
      inputSchema: {
        tenant_id: z.string().describe('The tenant whose log to read'),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ tenant_id, limit }) => {
      try {
        const messages = relay.listMessages(admin(), tenant_id, limit ?? 50);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                envelope(
                  messages.map((m) => ({
                    id: m.id,
                    direction: m.direction,
                    chat_id: m.chat_id,
                    text: m.text,
                    status: m.status,
                    error: m.error,
                    created_at: new Date(m.created_at).toISOString(),
                  })),
                ),
                null,
                2,
              ),
            },
          ],
        };
      } catch (cause) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(failure(cause), null, 2) }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'relay_register_webhook',
    {
      title: 'Register a webhook',
      description:
        'Register an HTTPS endpoint to receive message.sent, message.received, message.failed and tenant.connected events. Deliveries are HMAC-signed.',
      inputSchema: {
        tenant_id: z.string().describe('The tenant the events belong to'),
        url: z.string().url().describe('Where to POST the events'),
        events: z.array(z.string()).optional().describe('Event names to subscribe to'),
      },
    },
    async ({ tenant_id, url, events }) => {
      try {
        const record = relay.registerWebhook(admin(), {
          tenantId: tenant_id,
          url,
          events: events ?? [],
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(envelope(record), null, 2) }],
        };
      } catch (cause) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(failure(cause), null, 2) }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'relay_get_usage',
    {
      title: 'Get usage',
      description: 'Messages sent by a tenant in the current billing period, and the plan limit.',
      inputSchema: { tenant_id: z.string().describe('The tenant to check') },
    },
    async ({ tenant_id }) => {
      try {
        const usage = relay.usage(admin(), tenant_id);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(envelope(usage), null, 2) }],
        };
      } catch (cause) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(failure(cause), null, 2) }],
          isError: true,
        };
      }
    },
  );

  server.registerResource(
    'tenants',
    'relay://tenants',
    { title: 'Tenants', description: 'Every tenant on the platform, with connection state.' },
    async () => ({
      contents: [
        {
          uri: 'relay://tenants',
          mimeType: 'application/json',
          text: JSON.stringify(
            store.listTenants().map((t) => ({
              id: t.id,
              name: t.name,
              status: t.status,
              bot_username: t.bot_username,
            })),
            null,
            2,
          ),
        },
      ],
    }),
  );

  return server;
}

export async function startMcpServer(deps: McpDeps): Promise<void> {
  const server = createMcpServer(deps);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
