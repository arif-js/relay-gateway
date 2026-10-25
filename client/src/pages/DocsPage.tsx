import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Button,
} from 'raditail';
import { Copy, Check, Zap, ArrowRight, Terminal } from 'lucide-react';

export function DocsPage({ navigate }: { navigate?: (path: string) => void }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copySnippet = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const endpoints = [
    { method: 'POST', path: '/v1/messages', auth: 'rg_live_…', desc: 'Send a message through this tenant’s connected Telegram bot' },
    { method: 'GET', path: '/v1/messages', auth: 'rg_live_…', desc: 'Read inbound and outbound message history for this tenant' },
    { method: 'POST', path: '/v1/webhooks', auth: 'rg_live_…', desc: 'Register an HTTPS event webhook with HMAC-SHA256 signing' },
    { method: 'GET', path: '/v1/webhooks', auth: 'rg_live_…', desc: 'List registered webhooks for this tenant' },
    { method: 'DELETE', path: '/v1/webhooks/:id', auth: 'rg_live_…', desc: 'Delete an event webhook' },
    { method: 'GET', path: '/v1/tenants/:id', auth: 'rg_live_…', desc: 'Retrieve this tenant’s status and connected @bot_username' },
    { method: 'POST', path: '/v1/tenants/:id/connect-links', auth: 'rg_live_…', desc: 'Mint a fresh 7-day /connect/:token onboarding link for this tenant' },
    { method: 'GET', path: '/v1/usage', auth: 'rg_live_…', desc: 'Check messages sent in the current monthly billing period' },
    { method: 'GET', path: '/v1/merchant/tenant', auth: 'clerk session', desc: 'Retrieve the signed-in vendor’s tenants (up to 3) & connection info' },
    { method: 'POST', path: '/v1/merchant/tenant', auth: 'clerk session', desc: 'Create a new tenant (up to 3 free) under the signed-in vendor account' },
  ];

  const webhookPayloadExample = `{
  "type": "message.received",
  "created_at": "2026-10-24T21:57:27.543Z",
  "data": {
    "message_id": "msg_d45b43a6e74e4e7f8a06",
    "chat_id": "15551234567",
    "text": "Hi, where is my order?",
    "from_username": "alex_customer",
    "from_first_name": "Alex"
  }
}`;

  const webhookVerifyNode = `import crypto from 'node:crypto';

// In your webhook receiver endpoint:
export function handleRelayWebhook(req, res) {
  const signature = req.headers['x-relay-signature']; // 'sha256=...'
  const rawBody = req.body; // Raw JSON payload string
  const secret = process.env.RELAY_WEBHOOK_SECRET;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    // Verified authentic from Relay Gateway!
    const event = JSON.parse(rawBody);
    console.log('Event received:', event.type, event.data);
    res.status(200).send({ ok: true });
  } else {
    res.status(401).send({ error: 'Invalid HMAC signature' });
  }
}`;

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-12">
        <Badge
          variant="outline"
          className="mb-3 text-xs font-mono uppercase tracking-widest text-[#b4532a] border-[#b4532a]/30 bg-[#f3e3d9]/40 px-3 py-1"
        >
          API Reference
        </Badge>
        <h1 className="font-serif text-4xl sm:text-5xl text-[#18181b] font-normal tracking-tight mb-3">
          Tenant API &amp; Webhooks
        </h1>
        <p className="text-base text-[#52525b] max-w-[70ch] leading-relaxed">
          Base path <code className="bg-[#f4efeb] border border-[#e2dbd1] px-1.5 py-0.5 rounded text-xs font-mono">/v1</code>.
          Each of your up to 3 tenants gets its own isolated <code className="bg-[#f4efeb] border border-[#e2dbd1] px-1.5 py-0.5 rounded text-xs font-mono">rg_live_…</code> key.
          Every endpoint returns a consistent <code className="bg-[#f4efeb] border border-[#e2dbd1] px-1.5 py-0.5 rounded text-xs font-mono">{'{'} ok, data {'}'}</code> JSON envelope.
        </p>
      </div>

      <div className="space-y-16">
        {/* Authentication */}
        <section>
          <h2 className="font-serif text-2xl text-[#18181b] font-normal mb-3">Tenant Authentication</h2>
          <p className="text-sm text-[#52525b] mb-4">
            Pass your tenant’s scoped <code className="bg-[#f4efeb] px-1.5 py-0.5 rounded text-xs font-mono">rg_live_…</code> key in the standard <code className="bg-[#f4efeb] px-1.5 py-0.5 rounded text-xs font-mono">Authorization</code> header:
          </p>
          <div className="bg-[#18181b] text-[#f4f0ea] p-4 rounded-lg font-mono text-xs mb-5 flex items-center justify-between">
            <span>Authorization: Bearer rg_live_xxxxxxxx</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copySnippet('Authorization: Bearer rg_live_xxxxxxxx', 0)}
              className="text-[11px] h-7 border-[#52525b] text-[#cfc6b9] hover:bg-[#3f3e3a] hover:text-white"
            >
              {copiedIndex === 0 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>

          <Card className="bg-white border-[#e2dbd1] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-mono text-sm text-[#3f6b4a] flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> rg_live_… (Strict Per-Tenant Isolation)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-[#52525b] leading-relaxed">
              Every tenant you create (for your own B2C bot or for partner organizations A &amp; B) receives a separate{' '}
              <code className="bg-[#f4efeb] px-1 rounded">rg_live_…</code> key. It can only send messages, register webhooks,
              mint connect links, or read message logs for its assigned tenant and can never access another tenant’s data.
            </CardContent>
          </Card>
        </section>

        {/* REST Endpoints Table */}
        <section>
          <h2 className="font-serif text-2xl text-[#18181b] font-normal mb-4">REST API Endpoints</h2>
          <Card className="bg-white border-[#e2dbd1] overflow-x-auto shadow-sm">
            <Table>
              <TableHeader className="bg-[#f4efeb]">
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase text-[#71717a] py-3.5">Method</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#71717a] py-3.5">Path</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#71717a] py-3.5">Auth Scope</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#71717a] py-3.5">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {endpoints.map((ep) => (
                  <TableRow key={ep.path + ep.method} className="border-b border-[#e2dbd1] hover:bg-[#faf8f5]">
                    <TableCell className="font-mono text-xs font-semibold py-3">
                      <span
                        className={
                          ep.method === 'POST'
                            ? 'text-[#b4532a]'
                            : ep.method === 'DELETE'
                              ? 'text-red-600'
                              : 'text-blue-600'
                        }
                      >
                        {ep.method}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#18181b] font-medium py-3">{ep.path}</TableCell>
                    <TableCell className="text-xs font-mono text-[#71717a] py-3">{ep.auth}</TableCell>
                    <TableCell className="text-xs text-[#52525b] py-3">{ep.desc}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>

        {/* Incoming Webhook Event Payload */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-serif text-2xl text-[#18181b] font-normal">Incoming Webhook Payload</h2>
              <p className="text-xs sm:text-sm text-[#52525b] mt-1">
                When an end user writes to a tenant’s bot, Relay Gateway delivers a <code className="bg-[#f4efeb] px-1 py-0.5 rounded font-mono text-xs">message.received</code> event.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copySnippet(webhookPayloadExample, 3)}
              className="text-xs border-[#cfc6b9] text-[#18181b] hover:bg-[#f4efeb]"
            >
              {copiedIndex === 3 ? <Check className="w-3.5 h-3.5 mr-1 text-[#3f6b4a]" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              Copy JSON
            </Button>
          </div>

          <div className="bg-[#18181b] text-[#f4f0ea] p-5 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto shadow-sm">
            <pre>
              <code>{webhookPayloadExample}</code>
            </pre>
          </div>
        </section>

        {/* Webhook HMAC Verification Guide */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-serif text-2xl text-[#18181b] font-normal">Signed Webhooks (HMAC-SHA256)</h2>
              <p className="text-xs sm:text-sm text-[#52525b] mt-1">
                Every webhook push includes the header <code className="bg-[#f4efeb] px-1 py-0.5 rounded font-mono text-xs">x-relay-signature: sha256=...</code>.
                Verify it using your webhook signing secret.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copySnippet(webhookVerifyNode, 1)}
              className="text-xs border-[#cfc6b9] text-[#18181b] hover:bg-[#f4efeb]"
            >
              {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 mr-1 text-[#3f6b4a]" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              Copy Recipe
            </Button>
          </div>

          <div className="bg-[#18181b] text-[#f4f0ea] p-5 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto shadow-sm">
            <pre>
              <code>{webhookVerifyNode}</code>
            </pre>
          </div>
        </section>

        {/* Self-Host / Open-Source Callout */}
        <section className="bg-[#f4efeb] border border-[#e2dbd1] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#b4532a] mb-1">
              <Terminal className="w-4 h-4" />
              <span>Self-Hosting &amp; Platform Engineering</span>
            </div>
            <h3 className="font-serif text-xl text-[#18181b] font-medium">
              Looking for <code className="font-mono text-base">rg_admin_…</code>, Docker setup, or the local MCP Server?
            </h3>
            <p className="text-xs sm:text-sm text-[#52525b] mt-1">
              Read our dedicated Open-Source Guide to deploy Relay Gateway in your own infrastructure with unlimited tenants.
            </p>
          </div>
          {navigate && (
            <Button
              variant="outline"
              onClick={() => navigate('/open-source')}
              className="bg-white hover:bg-[#f3e3d9]/50 border-[#cfc6b9] text-[#18181b] text-xs font-medium shrink-0 flex items-center gap-1.5"
            >
              <span>Open-Source Guide</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </section>
      </div>
    </div>
  );
}
export default DocsPage;
