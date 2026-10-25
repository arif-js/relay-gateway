import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';
import { createMcpServer } from '../../src/mcp/server.js';
import { cleanupHarness, createHarness } from '../harness.js';

async function connect() {
  const harness = createHarness();
  const server = createMcpServer({
    relay: harness.app.relay,
    store: harness.app.store,
    adminKey: harness.app.config.adminKey,
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0.0.0' });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return { harness, client, server };
}

describe('the MCP server', () => {
  it('lists every tool and resource', async () => {
    const { harness, client, server } = await connect();
    try {
      const tools = await client.listTools();
      const names = tools.tools.map((t) => t.name);
      expect(names).toContain('relay_list_tenants');
      expect(names).toContain('relay_create_tenant');
      expect(names).toContain('relay_create_connect_link');
      expect(names).toContain('relay_send_message');
      expect(names).toContain('relay_list_messages');
      expect(names).toContain('relay_register_webhook');
      expect(names).toContain('relay_get_usage');

      const resources = await client.listResources();
      expect(resources.resources.map((r) => r.uri)).toContain('relay://tenants');
    } finally {
      await client.close();
      await server.close();
      cleanupHarness(harness);
    }
  });

  it('creates a tenant and returns its key', async () => {
    const { harness, client, server } = await connect();
    try {
      const result = await client.callTool({
        name: 'relay_create_tenant',
        arguments: { name: "Sara's Phone Shop" },
      });
      const text = (result.content as { text: string }[])[0]?.text ?? '';
      const payload = JSON.parse(text);
      expect(payload.ok).toBe(true);
      expect(payload.data.name).toBe("Sara's Phone Shop");
      expect(payload.data.api_key.startsWith('rg_live_')).toBe(true);
    } finally {
      await client.close();
      await server.close();
      cleanupHarness(harness);
    }
  });

  it('runs the whole connect flow through tools alone', async () => {
    const { harness, client, server } = await connect();
    try {
      const call = async (name: string, args: Record<string, unknown>) => {
        const result = await client.callTool({ name, arguments: args });
        const text = (result.content as { text: string }[])[0]?.text ?? '';
        return JSON.parse(text);
      };

      const created = await call('relay_create_tenant', { name: 'Acme' });
      expect(created.ok).toBe(true);
      const tenantId = created.data.id as string;

      const link = await call('relay_create_connect_link', { tenant_id: tenantId });
      expect(link.ok).toBe(true);
      expect(link.data.url).toContain('/connect/');

      const listed = await call('relay_list_tenants', {});
      expect(listed.data).toHaveLength(1);
      expect(listed.data[0].id).toBe(tenantId);

      const usage = await call('relay_get_usage', { tenant_id: tenantId });
      expect(usage.ok).toBe(true);
      expect(usage.data.messages_sent).toBe(0);
    } finally {
      await client.close();
      await server.close();
      cleanupHarness(harness);
    }
  });

  it('returns the error envelope for a bad tenant', async () => {
    const { harness, client, server } = await connect();
    try {
      const result = await client.callTool({
        name: 'relay_send_message',
        arguments: { tenant_id: 'tn_nope', chat_id: 1, text: 'hi' },
      });
      expect(result.isError).toBe(true);
      const text = (result.content as { text: string }[])[0]?.text ?? '';
      const payload = JSON.parse(text);
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe('NOT_FOUND');
    } finally {
      await client.close();
      await server.close();
      cleanupHarness(harness);
    }
  });
});
