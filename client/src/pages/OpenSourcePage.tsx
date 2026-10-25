import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from 'raditail';
import {
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  Layers,
  CornerDownRight,
  ExternalLink,
  Cpu,
  KeyRound,
  Sparkles,
  Server,
  Database,
  ArrowRight,
} from 'lucide-react';

export function OpenSourcePage({ navigate }: { navigate: (path: string) => void }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const dockerSnippet = `# 1. Clone the open-source repository (AGPL-3.0)
git clone https://github.com/arif-js/relay-gateway.git
cd relay-gateway

# 2. Configure your environment variables
cp .env.example .env
# Edit .env with RELAY_ADMIN_KEY, RELAY_MASTER_KEY, and RELAY_MANAGER_BOT_TOKEN

# 3. Start with Docker Compose (or npm start on Node >= 22.16)
docker compose up -d --build`;

  const adminCurlSnippet = `# 1. Create an isolated tenant via your Platform Master Key (rg_admin_...)
curl -X POST https://relay.yourdomain.com/v1/tenants \\
  -H "Authorization: Bearer $RELAY_ADMIN_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Organization A"}'

# 2. Mint a 7-day zero-paste connect link for Organization A
curl -X POST https://relay.yourdomain.com/v1/tenants/$TENANT_ID/connect-links \\
  -H "Authorization: Bearer $RELAY_ADMIN_KEY"

# 3. Send a message on Organization A's behalf
curl -X POST https://relay.yourdomain.com/v1/messages \\
  -H "Authorization: Bearer $TENANT_LIVE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"chat_id":15551234567,"text":"Your order #412 ships tomorrow."}'`;

  const mcpSnippet = `{
  "mcpServers": {
    "relay-gateway": {
      "command": "node",
      "args": ["/absolute/path/to/relay-gateway/dist/mcp.js"],
      "env": {
        "RELAY_DATA_DIR": "/absolute/path/to/relay-gateway/data",
        "RELAY_MASTER_KEY": "your-32-byte-base64-or-hex-key",
        "RELAY_MANAGER_BOT_TOKEN": "123456:ABC-DEF...",
        "RELAY_MANAGER_BOT_USERNAME": "your_manager_bot"
      }
    }
  }
}`;

  const envVars = [
    {
      name: 'RELAY_ADMIN_KEY',
      req: 'Required',
      desc: 'Master platform key (must start with rg_admin_) for creating unlimited tenants and signing into /dashboard/login.',
    },
    {
      name: 'RELAY_MASTER_KEY',
      req: 'Required',
      desc: '32-byte key (hex or base64) used to encrypt tenant bot tokens at rest with AES-256-GCM.',
    },
    {
      name: 'RELAY_MANAGER_BOT_TOKEN',
      req: 'Required',
      desc: 'Bot token of your Telegram Manager Bot that receives managed_bot creation updates.',
    },
    {
      name: 'RELAY_MANAGER_BOT_USERNAME',
      req: 'Required',
      desc: 'Username of your Telegram Manager Bot (used in t.me/newbot/<manager>/<bot> deep links).',
    },
    {
      name: 'RELAY_WEBHOOK_SECRET',
      req: 'Required',
      desc: 'Secret passed in X-Telegram-Bot-Api-Secret-Token to verify incoming Telegram webhook updates.',
    },
    {
      name: 'RELAY_PUBLIC_URL',
      req: 'Required',
      desc: 'Public HTTPS origin of your self-hosted instance (e.g. https://relay.yourdomain.com).',
    },
    {
      name: 'RELAY_DATABASE_URL',
      req: 'Optional',
      desc: 'Remote libsql:// (Turso) URL for serverless deployments. Omit to use local embedded node:sqlite.',
    },
  ];

  const mcpTools = [
    { name: 'relay_create_tenant', desc: 'Create a new tenant and receive its scoped rg_live_... API key.' },
    { name: 'relay_list_tenants', desc: 'List all tenants and their current bot connection status.' },
    { name: 'relay_get_tenant', desc: 'Inspect a specific tenant by ID.' },
    { name: 'relay_create_connect_link', desc: 'Mint a 7-day t.me/newbot onboarding link for a tenant.' },
    { name: 'relay_send_message', desc: 'Send a Telegram message through a tenant’s connected bot.' },
    { name: 'relay_list_messages', desc: 'Read the inbound and outbound message log for a tenant.' },
    { name: 'relay_get_usage', desc: 'Check monthly message count for a tenant.' },
  ];

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-14">
        <Badge
          variant="outline"
          className="mb-3 text-xs font-mono uppercase tracking-widest text-[#b4532a] border-[#b4532a]/30 bg-[#f3e3d9]/40 px-3 py-1"
        >
          Open-Source &amp; Self-Hosting Guide · AGPL-3.0
        </Badge>
        <h1 className="font-serif text-4xl sm:text-5xl text-[#18181b] font-normal tracking-tight mb-4">
          Run Relay Gateway in your own infrastructure.
        </h1>
        <p className="text-base sm:text-lg text-[#52525b] max-w-3xl leading-relaxed">
          Need unlimited tenants, programmatic tenant provisioning (<code className="bg-[#f4efeb] px-1.5 py-0.5 rounded font-mono text-xs">POST /v1/tenants</code>),
          local <code className="bg-[#f4efeb] px-1.5 py-0.5 rounded font-mono text-xs">stdio</code> MCP tools, or full on-premise data custody?
          Relay Gateway is 100% open source under AGPL-3.0. Deploy it on a single VPS with SQLite or on Vercel with Turso libSQL.
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-6">
          <Button
            className="bg-[#18181b] hover:bg-[#3f3e3a] text-white text-xs sm:text-sm font-medium px-5 py-2.5 flex items-center gap-2"
            onClick={() => window.open('https://github.com/arif-js/relay-gateway', '_blank')}
          >
            <span>View GitHub Repository</span>
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            className="bg-white hover:bg-[#f4efeb] border-[#cfc6b9] text-[#18181b] text-xs sm:text-sm font-medium px-5 py-2.5 flex items-center gap-2"
            onClick={() => navigate('/dashboard/login')}
          >
            <KeyRound className="w-4 h-4 text-[#b4532a]" />
            <span>Sign in with Master Key (rg_admin_...)</span>
          </Button>
        </div>
      </div>

      <div className="space-y-16">
        {/* 1. System Hierarchy & Isolation Topology (L0-L4) */}
        <section>
          <div className="max-w-2xl mb-6">
            <span className="font-mono text-xs uppercase tracking-widest text-[#b4532a] font-medium">
              Architecture
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#18181b] font-normal mt-1">
              L0–L4 Platform Topology
            </h2>
            <p className="text-sm text-[#52525b] mt-2 leading-relaxed">
              When you self-host Relay Gateway inside your organization or SaaS platform, your backend acts as L2 and provisions isolated bot tenants (L3) for every organization or merchant you serve.
            </p>
          </div>

          <div className="bg-[#f4efeb] rounded-xl p-6 border border-[#e2dbd1] shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[#e2dbd1] mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#b4532a]" />
                <span className="font-serif text-lg text-[#18181b] font-medium">
                  System Hierarchy &amp; Isolation Topology
                </span>
              </div>
              <span className="font-mono text-xs text-[#71717a] hidden sm:inline-block">
                SELF-HOSTED PLATFORM MODEL
              </span>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-[#e2dbd1] gap-2">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-[#f4efeb] text-[#71717a] font-bold text-[11px]">L0</span>
                  <span className="font-semibold text-[#18181b]">Telegram</span>
                </div>
                <div className="text-[#52525b] text-xs font-sans">
                  Creates the bot, delivers the messages, sets the rate limits.
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#f3e3d9] rounded-lg border border-[#b4532a]/30 gap-2">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-[#b4532a] text-white font-bold text-[11px]">L1</span>
                  <span className="font-semibold text-[#b4532a]">Relay Gateway (Your Self-Hosted Instance)</span>
                </div>
                <div className="text-[#18181b] text-xs font-sans font-medium">
                  Tenants, keys, connect flow, AES-256-GCM token vault, logs, signed webhooks, rate governor, MCP.
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-[#e2dbd1] gap-2">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-[#f4efeb] text-[#71717a] font-bold text-[11px]">L2</span>
                  <span className="font-semibold text-[#18181b]">Your SaaS Platform / Organization</span>
                </div>
                <div className="text-[#52525b] text-xs font-sans">
                  Holds <code className="bg-[#f4efeb] px-1 rounded">rg_admin_...</code> key, calls <code className="bg-[#f4efeb] px-1 rounded">POST /v1/tenants</code> for each customer org.
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-[#e2dbd1] gap-2 sm:ml-4">
                <div className="flex items-center gap-3">
                  <CornerDownRight className="w-3.5 h-3.5 text-[#71717a]" />
                  <span className="px-2 py-0.5 rounded bg-[#f4efeb] text-[#71717a] font-bold text-[11px]">L3</span>
                  <span className="font-semibold text-[#18181b]">The Tenant (Org A, Org B, Store...)</span>
                </div>
                <div className="text-[#52525b] text-xs font-sans">
                  Opens your <code className="bg-[#f4efeb] px-1 rounded">/connect/:token</code> link and connects their own Telegram bot.
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-[#e2dbd1] gap-2 sm:ml-8">
                <div className="flex items-center gap-3">
                  <CornerDownRight className="w-3.5 h-3.5 text-[#71717a]" />
                  <span className="px-2 py-0.5 rounded bg-[#f4efeb] text-[#71717a] font-bold text-[11px]">L4</span>
                  <span className="font-semibold text-[#18181b]">The End User</span>
                </div>
                <div className="text-[#52525b] text-xs font-sans">
                  Chats with Org A’s bot in Telegram. <span className="text-[#b4532a] font-medium">Never sees Relay Gateway.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Quickstart Deployment */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-[#b4532a] font-medium">
                Deployment
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#18181b] font-normal mt-1">
                1. Deploy with Docker or Node.js
              </h2>
              <p className="text-xs sm:text-sm text-[#52525b] mt-1">
                One process, zero external queues required. Uses embedded <code className="bg-[#f4efeb] px-1 rounded font-mono">node:sqlite</code> on a VPS or <code className="bg-[#f4efeb] px-1 rounded font-mono">@libsql/client</code> (Turso) on Vercel.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copy(dockerSnippet, 1)}
              className="text-xs border-[#cfc6b9] text-[#18181b] hover:bg-[#f4efeb]"
            >
              {copiedIdx === 1 ? <Check className="w-3.5 h-3.5 mr-1 text-[#3f6b4a]" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              Copy Commands
            </Button>
          </div>

          <div className="bg-[#18181b] text-[#f4f0ea] p-5 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto shadow-sm mb-6">
            <pre>
              <code>{dockerSnippet}</code>
            </pre>
          </div>

          <Card className="bg-white border-[#e2dbd1] overflow-x-auto shadow-sm">
            <Table>
              <TableHeader className="bg-[#f4efeb]">
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase text-[#71717a] py-3">Variable</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#71717a] py-3">Requirement</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#71717a] py-3">Purpose</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {envVars.map((v) => (
                  <TableRow key={v.name} className="border-b border-[#e2dbd1]">
                    <TableCell className="font-mono text-xs font-semibold text-[#18181b] py-3">{v.name}</TableCell>
                    <TableCell className="font-mono text-xs text-[#b4532a] py-3">{v.req}</TableCell>
                    <TableCell className="text-xs text-[#52525b] py-3">{v.desc}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>

        {/* 3. Programmatic Multi-Tenant Provisioning with rg_admin_... */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-[#b4532a] font-medium">
                Platform Admin API
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#18181b] font-normal mt-1">
                2. Provision Unlimited Tenants via <code className="text-xl font-mono">rg_admin_...</code>
              </h2>
              <p className="text-xs sm:text-sm text-[#52525b] mt-1">
                Your self-hosted platform holds the master <code className="bg-[#f4efeb] px-1 rounded font-mono">RELAY_ADMIN_KEY</code> to create tenants and mint onboarding links via API.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copy(adminCurlSnippet, 2)}
              className="text-xs border-[#cfc6b9] text-[#18181b] hover:bg-[#f4efeb]"
            >
              {copiedIdx === 2 ? <Check className="w-3.5 h-3.5 mr-1 text-[#3f6b4a]" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              Copy cURL
            </Button>
          </div>

          <div className="bg-[#18181b] text-[#f4f0ea] p-5 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto shadow-sm">
            <pre>
              <code>{adminCurlSnippet}</code>
            </pre>
          </div>
        </section>

        {/* 4. Model Context Protocol (MCP) Server */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-[#b4532a] font-medium">
                AI Agent Integration
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#18181b] font-normal mt-1">
                3. Built-in Model Context Protocol (MCP) Server
              </h2>
              <p className="text-xs sm:text-sm text-[#52525b] mt-1">
                Self-hosted instances include a native <code className="bg-[#f4efeb] px-1 rounded font-mono">stdio</code> MCP server (<code className="bg-[#f4efeb] px-1 rounded font-mono">dist/mcp.js</code>) for Claude Desktop, Claude Code, and Cursor.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copy(mcpSnippet, 3)}
              className="text-xs border-[#cfc6b9] text-[#18181b] hover:bg-[#f4efeb]"
            >
              {copiedIdx === 3 ? <Check className="w-3.5 h-3.5 mr-1 text-[#3f6b4a]" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              Copy MCP Config
            </Button>
          </div>

          <div className="bg-[#18181b] text-[#f4f0ea] p-5 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto shadow-sm mb-6">
            <pre>
              <code>{mcpSnippet}</code>
            </pre>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mcpTools.map((tool) => (
              <Card key={tool.name} className="bg-white border-[#e2dbd1] shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="font-mono text-xs text-[#b4532a]">{tool.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-[#52525b] leading-relaxed">{tool.desc}</CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default OpenSourcePage;

