import React, { useState } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent } from 'raditail';
import {
  ArrowRight,
  Terminal,
  Copy,
  Check,
  KeyRound,
  ShieldCheck,
  Bot,
  Zap,
  Cpu,
  Lock,
  LayoutDashboard,
  CheckCircle2,
  Info,
  Clock,
  Users,
  Webhook,
} from 'lucide-react';

export function LandingPage({ navigate }: { navigate: (path: string) => void }) {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'webhook'>('dispatch');
  const [copied, setCopied] = useState(false);

  const curlSnippet = `# 1. Send an outbound message as your tenant's connected Telegram bot
curl -X POST https://relay.arifcodes.com/v1/messages \\
  -H "Authorization: Bearer $TENANT_LIVE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"chat_id":15551234567,"text":"Your order #412 ships tomorrow!"}'

# 2. Register a signed webhook to receive customer replies in real time
curl -X POST https://relay.arifcodes.com/v1/webhooks \\
  -H "Authorization: Bearer $TENANT_LIVE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://yourapp.com/webhooks/telegram","events":["message.received","message.sent"]}'`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(curlSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const features = [
    {
      title: 'Up to 3 tenants free (1 bot each)',
      desc: 'Create up to 3 isolated tenant workspaces under one account. Use them for your own direct B2C bot, or assign separate custom bots for partner organizations A & B.',
      policy: '3 TENANTS FREE',
      policyLabel: 'FAIR USE QUOTA',
      icon: Users,
      highlight: true,
    },
    {
      title: 'Zero-paste bot onboarding',
      desc: 'Open the connect link yourself or send it to a partner organization. They pick a bot name in Telegram via t.me/newbot; we capture and seal the token automatically.',
      policy: 'ZERO-PASTE FLOW',
      policyLabel: 'HANDSHAKE',
      icon: ShieldCheck,
      highlight: true,
    },
    {
      title: 'Isolated rg_live_… key per tenant',
      desc: 'Every tenant gets its own strictly scoped API key. Org A’s key can only send and read messages for Org A’s bot and can never touch Org B’s data.',
      policy: 'TENANT_SCOPED_STRICT',
      policyLabel: 'ISOLATION POLICY',
      icon: KeyRound,
    },
    {
      title: 'Each tenant owns their bot identity',
      desc: 'End users only ever see the tenant’s official Telegram bot (@AcmeStoreBot or @OrgABot) — never Relay Gateway. Bot owners can revoke access in Telegram anytime.',
      policy: 'CUSTOM BRANDING',
      policyLabel: 'SENDER IDENTITY',
      icon: Bot,
    },
    {
      title: 'Bidirectional HMAC-SHA256 webhooks',
      desc: 'When a customer writes to a tenant’s bot, we push a signed message.received event to your backend URL so you can reply through that same bot in milliseconds.',
      policy: 'HMAC-SHA256',
      policyLabel: 'WEBHOOK SIGNATURE',
      icon: Webhook,
      highlight: true,
    },
    {
      title: 'Telegram rate limits handled',
      desc: 'Telegram throttles at ~30 messages/sec globally, 1/sec per chat, and issues 429 retry_after penalties. Our shared governor paces delivery so your bots stay healthy.',
      policy: 'ADAPTIVE GOVERNOR (30/s)',
      policyLabel: 'RATE LIMITER',
      icon: Cpu,
    },
    {
      title: 'AES-256-GCM encrypted token vault',
      desc: 'Bot tokens are encrypted at rest with AES-256-GCM, write-only, and never returned by any API endpoint or log. Tenant API keys are stored as SHA-256 hashes.',
      policy: 'AES-256-GCM AT REST',
      policyLabel: 'ENCRYPTION',
      icon: Lock,
    },
    {
      title: 'Multi-tenant vendor console',
      desc: 'Switch between your 3 tenants in one click, copy shareable 7-day connect links, test outbound messages, register webhooks, and inspect real-time message logs.',
      policy: 'VENDOR CONSOLE',
      policyLabel: 'BUILT-IN UI',
      icon: LayoutDashboard,
    },
    {
      title: 'Instant delivery & audit logs',
      desc: 'Every inbound customer message and outbound reply is logged per tenant with delivery status, timestamps, and error diagnostics.',
      policy: 'REAL-TIME LOGS',
      policyLabel: 'OBSERVABILITY',
      icon: Zap,
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Sign in and create up to 3 tenants free',
      desc: 'Sign in with Google or Email and create up to 3 isolated tenants — for your own B2C store, or for partner organizations A and B.',
      badge: 'Up to 3 Tenants · Free',
      badgeColor: 'bg-[#f3e3d9] text-[#b4532a] font-medium',
    },
    {
      num: '02',
      title: 'Connect a bot (or share the link with Org A / Org B)',
      desc: 'Each tenant gets a 7-day connect link (/connect/:token). Open it yourself or send it to a partner org — they pick their @bot_username in Telegram with zero token pasting.',
      badge: 'https://t.me/newbot/…',
      badgeColor: 'bg-[#f4efeb] text-[#52525b]',
    },
    {
      num: '03',
      title: 'Relay seals the bot token & issues your rg_live_… key',
      desc: 'Telegram notifies Relay Gateway via managed_bot update. We encrypt the bot token with AES-256-GCM and give you a scoped rg_live_… key for that tenant.',
      badge: 'rg_live_… (Tenant Scoped)',
      badgeColor: 'bg-[#f4efeb] text-[#52525b]',
      hasDot: true,
    },
    {
      num: '04',
      title: 'Send & receive messages through each tenant’s bot',
      desc: 'Your backend receives customer inquiries via signed HMAC webhooks (message.received) and replies as that tenant’s bot with one POST /v1/messages call.',
      badge: 'POST /v1/messages',
      badgeColor: 'bg-[#b4532a] text-white font-medium',
    },
  ];

  const caveats = [
    {
      tag: 'Telegram Rule',
      title: 'A bot can only message people who wrote to it first',
      desc: 'That is Telegram’s platform rule. A tenant’s bot can reply to any customer who started a chat with it (/start), and cannot cold-spam random phone numbers.',
    },
    {
      tag: 'Throughput Pacing',
      title: 'Rate limits are strictly enforced',
      desc: 'Telegram allows ~30 messages/sec globally and 1 message/sec per chat. We enforce these limits automatically so your bots never get muted.',
    },
    {
      tag: 'Sender Identity',
      title: 'The sender is an official Telegram bot',
      desc: 'Each tenant’s sender is a dedicated Telegram bot (@YourBrandBot or @OrgABot) owned inside Telegram by whoever completed the connect link.',
    },
    {
      tag: 'Need More Than 3 Tenants?',
      title: 'Self-host our open-source engine for unlimited tenants',
      desc: 'Relay Cloud gives every vendor up to 3 tenants free. If you need unlimited tenants or programmatic tenant creation via rg_admin_…, read our Open-Source Guide.',
    },
  ];

  return (
    <div className="w-full">
      {/* ── HERO SECTION ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-8 pb-20 md:pt-14 md:pb-28">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-[#f3e3d9]/60 via-[#f4efeb]/20 to-transparent pointer-events-none -z-10 rounded-full blur-3xl" />

        <div className="max-w-[1120px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Headline & Pitch */}
            <div className="lg:col-span-7 flex flex-col justify-start min-w-0">
              <div className="inline-flex items-center gap-2 self-start px-3 py-1 bg-[#f4efeb] border border-[#e2dbd1] rounded-lg max-w-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#b4532a] animate-pulse shrink-0" />
                <span className="font-mono text-[11px] sm:text-xs tracking-wider uppercase text-[#52525b] truncate">
                  Relay Cloud · Up to 3 Tenants &amp; 3 Bots Free
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl md:text-[54px] text-[#18181b] mt-5 tracking-tight font-normal leading-[1.12]">
                Dedicated Telegram bots for your business &amp; partners.<br />
                <span className="italic text-[#b4532a]">Ready in 60 seconds.</span>
              </h1>

              <p className="text-base sm:text-lg text-[#52525b] mt-5 max-w-xl leading-relaxed">
                Create up to <strong>3 isolated tenants free</strong> — each with its own custom Telegram bot,
                zero-paste onboarding link, scoped <code className="bg-[#f4efeb] px-1.5 py-0.5 rounded font-mono text-sm text-[#18181b]">rg_live_…</code> API key,
                and signed webhooks. Serve your direct B2C customers and partner organizations from one unified API.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3.5 mt-8">
                <Button
                  size="lg"
                  className="bg-[#b4532a] hover:bg-[#9c421e] text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 group shadow-sm"
                  onClick={() => navigate('/signup')}
                >
                  <span>Start Free (Up to 3 Tenants)</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-white hover:bg-[#f4efeb] border-[#cfc6b9] text-[#18181b] px-6 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-sm"
                  onClick={() => navigate('/docs')}
                >
                  <Terminal className="w-4 h-4 text-[#52525b]" />
                  <span>Read API Reference</span>
                </Button>
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-10 sm:mt-12 p-4 bg-[#f4efeb]/60 border border-[#e2dbd1] rounded-xl">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-wider text-[#71717a]">Free Quota</div>
                  <div className="font-serif text-xl sm:text-2xl text-[#18181b] mt-0.5 font-normal">3 Tenants</div>
                  <div className="text-xs text-[#52525b] mt-0.5">1 dedicated bot each</div>
                </div>
                <div className="border-t sm:border-t-0 border-[#e2dbd1] pt-2.5 sm:pt-0">
                  <div className="font-mono text-[11px] uppercase tracking-wider text-[#71717a]">Bot Setup</div>
                  <div className="font-serif text-xl sm:text-2xl text-[#b4532a] mt-0.5 font-normal">0 Tokens</div>
                  <div className="text-xs text-[#52525b] mt-0.5">Zero-paste connect link</div>
                </div>
                <div className="border-t sm:border-t-0 border-[#e2dbd1] pt-2.5 sm:pt-0">
                  <div className="font-mono text-[11px] uppercase tracking-wider text-[#71717a]">Included Volume</div>
                  <div className="font-serif text-xl sm:text-2xl text-[#18181b] mt-0.5 font-normal">2,000 / mo</div>
                  <div className="text-xs text-[#52525b] mt-0.5">Messages / tenant + webhooks</div>
                </div>
              </div>
            </div>

            {/* Right Column: Live API & Webhook Preview Terminal */}
            <div className="lg:col-span-5 w-full mt-6 lg:mt-0 min-w-0">
              <div className="bg-[#f4efeb] border border-[#e2dbd1] rounded-xl shadow-sm overflow-hidden">
                {/* Terminal Header Bar */}
                <div className="px-3 sm:px-4 py-2.5 bg-[#f4efeb] border-b border-[#e2dbd1] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#dcd5c9] inline-block shrink-0" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#dcd5c9] inline-block shrink-0" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#dcd5c9] inline-block shrink-0" />
                    <span className="font-mono text-[11px] text-[#52525b] ml-1.5 truncate">tenant-api-v1</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#b4532a] font-mono text-[10px] sm:text-[11px] bg-[#f3e3d9] px-2 py-0.5 rounded font-medium shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b4532a]" />
                    SCOPED TENANT KEY
                  </div>
                </div>

                {/* Terminal Tab Selector */}
                <div className="flex border-b border-[#e2dbd1] bg-white overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('dispatch')}
                    className={`px-3 sm:px-4 py-2 font-mono text-xs font-medium transition-colors whitespace-nowrap ${
                      activeTab === 'dispatch'
                        ? 'text-[#b4532a] bg-[#f4efeb] border-b-2 border-[#b4532a]'
                        : 'text-[#71717a] hover:text-[#18181b] bg-white'
                    }`}
                  >
                    send_message.sh
                  </button>
                  <button
                    onClick={() => setActiveTab('webhook')}
                    className={`px-3 sm:px-4 py-2 font-mono text-xs font-medium transition-colors whitespace-nowrap ${
                      activeTab === 'webhook'
                        ? 'text-[#b4532a] bg-[#f4efeb] border-b-2 border-[#b4532a]'
                        : 'text-[#71717a] hover:text-[#18181b] bg-white'
                    }`}
                  >
                    webhook_event.json
                  </button>
                </div>

                {/* Code Content Panels */}
                <div className="p-3 sm:p-4 font-mono text-xs bg-white min-h-[300px] flex flex-col justify-between overflow-x-auto">
                  {activeTab === 'dispatch' && (
                    <div className="space-y-1.5 text-[#18181b] break-words">
                      <div className="text-[#71717a]"># Send via Tenant 2's bot (@OrgABot)</div>
                      <div className="text-[#52525b] break-all sm:break-normal">
                        <span className="text-[#b4532a] font-semibold">curl</span> -X POST https://relay.arifcodes.com/v1/messages \
                      </div>
                      <div className="pl-4 text-[#52525b]">
                        -H <span className="text-[#97422b]">"Authorization: Bearer rg_live_89f0..."</span> \
                      </div>
                      <div className="pl-4 text-[#52525b]">
                        -H <span className="text-[#97422b]">"Content-Type: application/json"</span> \
                      </div>
                      <div className="pl-4 text-[#52525b]">-d '{'{'}</div>
                      <div className="pl-6 sm:pl-8 text-[#18181b]">
                        "chat_id": <span className="text-[#cd4715]">15551234567</span>,
                      </div>
                      <div className="pl-6 sm:pl-8 text-[#18181b]">
                        "text": <span className="text-[#97422b]">"Your order #412 ships tomorrow via DHL."</span>
                      </div>
                      <div className="pl-4 text-[#52525b]">{'}'}'</div>

                      <div className="mt-4 pt-3 bg-[#f4efeb] -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 text-[11px] text-[#52525b] border-t border-[#e2dbd1]">
                        <div className="flex items-center justify-between text-[#71717a] mb-1 font-mono gap-2">
                          <span>GATEWAY ENVELOPE</span>
                          <span className="text-[#3f6b4a] font-medium">HTTP/1.1 201 Created</span>
                        </div>
                        <div className="text-[#18181b] font-mono leading-relaxed break-words">
                          {'{'} <span className="text-[#3f6b4a]">"ok"</span>: <span className="text-[#cd4715]">true</span>, <span className="text-[#3f6b4a]">"data"</span>: {'{'} <span className="text-[#71717a]">"id"</span>: <span className="text-[#97422b]">"msg_7c82..."</span>, <span className="text-[#71717a]">"status"</span>: <span className="text-[#97422b]">"sent"</span>, <span className="text-[#71717a]">"chat_id"</span>: <span className="text-[#cd4715]">15551234567</span> {'}'} {'}'}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'webhook' && (
                    <div className="space-y-1.5 text-[#18181b] break-words">
                      <div className="text-[#71717a]"># Customer writes to @OrgABot → pushed to your server</div>
                      <div className="text-[#52525b] font-mono text-[11px]">
                        <span className="text-[#b4532a] font-semibold">POST</span> /webhooks/telegram HTTP/1.1
                      </div>
                      <div className="text-[#71717a] text-[11px]">
                        X-Relay-Event: <span className="text-[#18181b]">message.received</span>
                      </div>
                      <div className="text-[#71717a] text-[11px] break-all">
                        X-Relay-Signature: <span className="text-[#97422b]">sha256=9b82cfa23e1e...</span>
                      </div>
                      <div className="mt-2 text-[#cd4715]">{'{'}</div>
                      <div className="pl-4 text-[#52525b]">
                        "type": <span className="text-[#97422b]">"message.received"</span>,
                      </div>
                      <div className="pl-4 text-[#52525b]">
                        "data": {'{'}
                      </div>
                      <div className="pl-6 sm:pl-8 text-[#52525b]">
                        "message_id": <span className="text-[#97422b]">"msg_d45b43a6"</span>,
                      </div>
                      <div className="pl-6 sm:pl-8 text-[#52525b]">
                        "chat_id": <span className="text-[#cd4715]">15551234567</span>,
                      </div>
                      <div className="pl-6 sm:pl-8 text-[#52525b]">
                        "text": <span className="text-[#97422b]">"Hi, where is my order?"</span>
                      </div>
                      <div className="pl-4 text-[#52525b]">{'}'}</div>
                      <div className="text-[#cd4715]">{'}'}</div>
                    </div>
                  )}

                  {/* Terminal Action Strip */}
                  <div className="pt-3 border-t border-[#f4efeb] flex flex-wrap items-center justify-between gap-2 text-xs text-[#71717a] mt-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#3f6b4a]" />
                      <span className="font-mono text-[11px]">REST API + HMAC Webhooks</span>
                    </div>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="px-2.5 py-1 text-[#b4532a] hover:bg-[#f3e3d9] rounded font-medium text-xs flex items-center gap-1 transition-colors"
                    >
                      <span>Open Console</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bottom Micro-Caption */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#f4efeb] border-t border-[#e2dbd1] text-[#71717a] text-[10px] sm:text-[11px] font-mono">
                  <span>AES-256-GCM Encrypted Tokens</span>
                  <span>Strict Tenant Isolation</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 1: HOW B2C & B2B PARTNER TENANTS WORK ─────────────────────── */}
      <section className="w-full bg-[#fbf9f6] py-20 border-t border-[#e2dbd1]">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <span className="font-mono text-xs uppercase tracking-widest text-[#b4532a] font-medium">
              Flexible Multi-Tenant Model
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#18181b] font-normal mt-2">
              Use your 3 free tenants for your own brand, or for partner organizations.
            </h2>
            <p className="text-base text-[#52525b] mt-3 leading-relaxed">
              Each tenant slot includes one dedicated Telegram bot, one shareable connect link, and one isolated{' '}
              <code className="bg-[#f4efeb] px-1.5 py-0.5 rounded font-mono text-xs text-[#18181b]">rg_live_…</code> key.
              Mix and match direct B2C and partner B2B2C bots under a single account.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-[#f3e3d9]/50 p-6 rounded-xl border border-[#b4532a]/25 flex flex-col justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase text-[#b4532a] tracking-wider mb-2 font-semibold">
                  Tenant Slot 1 · Direct B2C
                </div>
                <h3 className="font-serif text-xl text-[#18181b] font-medium mb-2">Your Own Brand Bot</h3>
                <p className="text-sm text-[#52525b] leading-relaxed">
                  Open the connect link yourself to launch <code className="bg-white/80 px-1 rounded text-xs">@YourBrandBot</code>.
                  Your direct customers chat with your bot, and your backend dispatches order updates and support replies.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-[#b4532a]/15 font-mono text-[11px] text-[#b4532a]">
                Sender seen by users: @YourBrandBot
              </div>
            </div>

            <div className="bg-[#f4efeb] p-6 rounded-xl border border-[#e2dbd1] flex flex-col justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase text-[#71717a] tracking-wider mb-2">
                  Tenant Slot 2 · Partner Org A
                </div>
                <h3 className="font-serif text-xl text-[#18181b] font-medium mb-2">Organization A’s Custom Bot</h3>
                <p className="text-sm text-[#52525b] leading-relaxed">
                  Create a tenant for Partner Organization A and send them the <code className="bg-white px-1 rounded text-xs">/connect/:token</code> link.
                  Org A creates <code className="bg-white px-1 rounded text-xs">@OrgABot</code> in their own Telegram, and your app sends &amp; receives messages on their behalf.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-[#e2dbd1] font-mono text-[11px] text-[#52525b]">
                Sender seen by Org A users: @OrgABot
              </div>
            </div>

            <div className="bg-[#f4efeb] p-6 rounded-xl border border-[#e2dbd1] flex flex-col justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase text-[#71717a] tracking-wider mb-2">
                  Tenant Slot 3 · Partner Org B
                </div>
                <h3 className="font-serif text-xl text-[#18181b] font-medium mb-2">Organization B’s Custom Bot</h3>
                <p className="text-sm text-[#52525b] leading-relaxed">
                  Send Tenant 3’s connect link to Partner Organization B. They launch <code className="bg-white px-1 rounded text-xs">@OrgBBot</code> in 30 seconds,
                  and your backend uses Tenant 3’s isolated <code className="bg-white px-1 rounded text-xs">rg_live_…</code> key to message Org B’s customers.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-[#e2dbd1] font-mono text-[11px] text-[#52525b]">
                Sender seen by Org B users: @OrgBBot
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: WHAT YOU GET / 9-FEATURE BENTO GRID ─────────────────────── */}
      <section className="w-full bg-[#f4efeb]/40 py-20 border-t border-[#e2dbd1]">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <span className="font-mono text-xs uppercase tracking-widest text-[#b4532a] font-medium">What you get</span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#18181b] font-normal mt-2">
              Everything required to run multi-tenant Telegram bots.
            </h2>
            <p className="text-base text-[#52525b] mt-3 leading-relaxed">
              We handle the managed-bot handshake, AES-256-GCM token encryption, per-tenant isolation, webhook signing, and rate limiting out of the box.
            </p>
          </div>

          {/* 3x3 Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <Card
                  key={feat.title}
                  className="bg-white border-[#e2dbd1] shadow-sm hover:shadow transition-shadow flex flex-col justify-between group"
                >
                  <CardHeader className="pb-2">
                    <div className="w-9 h-9 rounded bg-[#f3e3d9] text-[#b4532a] flex items-center justify-center mb-3 group-hover:bg-[#b4532a] group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-base font-semibold text-[#18181b] tracking-tight">
                      {feat.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs sm:text-sm text-[#52525b] leading-relaxed">
                      {feat.desc}
                    </p>
                    <div className="pt-2 border-t border-[#f4efeb] flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#71717a]">{feat.policyLabel}</span>
                      <span className={feat.highlight ? 'text-[#b4532a] font-semibold' : 'text-[#18181b] font-medium'}>
                        {feat.policy}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: THE FLOW / FOUR STEPS ───────────────────────────────────── */}
      <section className="w-full bg-[#fbf9f6] py-20 border-t border-[#e2dbd1]">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <span className="font-mono text-xs uppercase tracking-widest text-[#b4532a] font-medium">How it works</span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#18181b] font-normal mt-2">
              Four steps from sign-up to live Telegram messages.
            </h2>
          </div>

          <div className="space-y-4">
            {steps.map((step) => (
              <div
                key={step.num}
                className="bg-white p-5 sm:p-6 rounded-xl border border-[#e2dbd1] shadow-sm hover:shadow transition-shadow flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="flex items-start gap-4 max-w-xl">
                  <div className="font-mono text-lg font-bold text-[#b4532a] bg-[#f3e3d9] px-3 py-1 rounded">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-medium text-[#18181b]">{step.title}</h3>
                    <p className="text-xs sm:text-sm text-[#52525b] mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
                <div
                  className={`px-3 py-1.5 rounded font-mono text-xs self-start whitespace-nowrap flex items-center gap-1.5 ${step.badgeColor}`}
                >
                  {step.hasDot && <span className="w-2 h-2 rounded-full bg-[#b4532a]" />}
                  {step.badge}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: TRY IT / TENANT API SNIPPET ─────────────────────────────── */}
      <section className="w-full bg-[#f4efeb]/40 py-20 border-t border-[#e2dbd1]">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-[#b4532a] font-medium">Simple Integration</span>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#18181b] font-normal mt-2">
                Use your <code className="font-mono text-2xl sm:text-3xl text-[#b4532a]">rg_live_…</code> key to send &amp; listen.
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="bg-white hover:bg-[#f4efeb] border-[#cfc6b9] text-[#18181b] font-medium text-xs self-start"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-[#3f6b4a]" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy snippet
                </>
              )}
            </Button>
          </div>

          <div className="bg-[#f4efeb] rounded-xl overflow-hidden border border-[#e2dbd1] shadow-sm">
            <div className="px-4 py-2 bg-[#f4efeb] border-b border-[#e2dbd1] flex items-center justify-between text-[#71717a] font-mono text-xs">
              <span>TENANT API / cURL SPECIFICATION</span>
              <span>HTTP/1.1 · TLS 1.3</span>
            </div>
            <pre className="p-5 overflow-x-auto font-mono text-xs sm:text-[13px] leading-relaxed bg-[#18181b] text-[#f4f0ea]">
              <code>{curlSnippet}</code>
            </pre>
          </div>

          <p className="text-sm text-[#52525b] mt-4">
            See the complete endpoint list and webhook verification guide on the{' '}
            <a
              href="/docs"
              onClick={(e) => {
                e.preventDefault();
                navigate('/docs');
              }}
              className="text-[#b4532a] underline font-medium hover:text-[#9c421e]"
            >
              API Reference page
            </a>
            , or explore our{' '}
            <a
              href="/open-source"
              onClick={(e) => {
                e.preventDefault();
                navigate('/open-source');
              }}
              className="text-[#b4532a] underline font-medium hover:text-[#9c421e]"
            >
              Open-Source Self-Host Guide
            </a>
            {' '}if you want to deploy Relay Gateway inside your own infrastructure.
          </p>
        </div>
      </section>

      {/* ── SECTION 5: CAPABILITIES & ROADMAP ─────────────────────────────────── */}
      <section className="w-full bg-[#fbf9f6] py-20 border-t border-[#e2dbd1]">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <span className="font-mono text-xs uppercase tracking-widest text-[#b4532a] font-medium">
              Capabilities &amp; Roadmap
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#18181b] font-normal mt-2">
              What works today, and what is coming soon.
            </h2>
            <p className="text-base text-[#52525b] mt-3 leading-relaxed">
              Every feature on the left is live in production today. Everything on the right is actively on our roadmap.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Column 1: Live Today */}
            <div className="bg-white p-5 sm:p-7 rounded-xl border border-[#e2dbd1] shadow-sm min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#e2dbd1] mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-[#3f6b4a] shrink-0" />
                  <h3 className="font-serif text-xl sm:text-2xl text-[#18181b] font-medium">Live &amp; Working Today</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#e2ede4] text-[#3f6b4a] border border-[#3f6b4a]/20 shrink-0">
                  AVAILABLE NOW
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#3f6b4a] mt-1 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#18181b]">Up to 3 Isolated Tenants Free (1 Bot Each)</div>
                    <div className="text-xs text-[#52525b] mt-0.5 leading-relaxed">
                      Sign in with Clerk and create up to 3 tenants for your own B2C store or partner organizations, each with its own <code className="bg-[#f4efeb] px-1 rounded text-[#18181b]">rg_live_…</code> API key.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#3f6b4a] mt-1 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#18181b]">Zero-Paste Managed Bot Flow (Mode A)</div>
                    <div className="text-xs text-[#52525b] mt-0.5 leading-relaxed">
                      Shareable <code className="bg-[#f4efeb] px-1 rounded text-[#18181b]">/connect/:token</code> links let you or a partner organization create a bot via <code className="bg-[#f4efeb] px-1 rounded text-[#18181b]">t.me/newbot</code> while Relay encrypts the token with AES-256-GCM.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#3f6b4a] mt-1 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#18181b]">Outbound Text Messaging API (<code className="text-xs font-mono">POST /v1/messages</code>)</div>
                    <div className="text-xs text-[#52525b] mt-0.5 leading-relaxed">
                      Send text messages with optional <code className="bg-[#f4efeb] px-1 rounded text-[#18181b]">HTML</code>, <code className="bg-[#f4efeb] px-1 rounded text-[#18181b]">Markdown</code>, or <code className="bg-[#f4efeb] px-1 rounded text-[#18181b]">MarkdownV2</code> formatting through your tenant’s bot.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#3f6b4a] mt-1 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#18181b]">Inbound &amp; Outbound Signed Webhooks (<code className="text-xs font-mono">HMAC-SHA256</code>)</div>
                    <div className="text-xs text-[#52525b] mt-0.5 leading-relaxed">
                      Receive real-time <code className="bg-[#f4efeb] px-1 rounded text-[#18181b]">message.received</code>, <code className="bg-[#f4efeb] px-1 rounded text-[#18181b]">message.sent</code>, <code className="bg-[#f4efeb] px-1 rounded text-[#18181b]">message.failed</code>, and <code className="bg-[#f4efeb] px-1 rounded text-[#18181b]">tenant.connected</code> events.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#3f6b4a] mt-1 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#18181b]">Shared Token-Bucket Rate Governor</div>
                    <div className="text-xs text-[#52525b] mt-0.5 leading-relaxed">
                      Enforces 30 msg/sec global ceiling, 1 msg/sec per chat, and strict Telegram HTTP 429 <code className="bg-[#f4efeb] px-1 rounded text-[#18181b]">retry_after</code> sleep compliance.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#3f6b4a] mt-1 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#18181b]">Multi-Tenant Console &amp; Live Message Logs</div>
                    <div className="text-xs text-[#52525b] mt-0.5 leading-relaxed">
                      Switch between your 3 tenants, send live test messages, manage webhooks, and inspect inbound/outbound message history.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Coming Soon */}
            <div className="bg-[#f4efeb] p-5 sm:p-7 rounded-xl border border-[#e2dbd1] shadow-sm min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#e2dbd1] mb-6">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#b4532a] shrink-0" />
                  <h3 className="font-serif text-xl sm:text-2xl text-[#18181b] font-medium">Coming Soon (Roadmap)</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#f3e3d9] text-[#b4532a] border border-[#b4532a]/30 shrink-0">
                  COMING SOON
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#b4532a] mt-2 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#18181b]">Managed AI Sales &amp; Support Auto-Reply</div>
                    <div className="text-xs text-[#52525b] mt-0.5 leading-relaxed">
                      Connect your product catalog or knowledge base so an AI agent can answer customer inquiries automatically when a webhook arrives.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#b4532a] mt-2 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#18181b]">Pro Cloud Tier (10+ Tenants &amp; Higher Quotas)</div>
                    <div className="text-xs text-[#52525b] mt-0.5 leading-relaxed">
                      Upgrade beyond the 3 free tenants and 2,000 monthly messages without needing to self-host.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#b4532a] mt-2 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#18181b]">Telegram Business Account Integration (Mode B)</div>
                    <div className="text-xs text-[#52525b] mt-0.5 leading-relaxed">
                      Link a Telegram Business account to reply in direct customer DMs within Telegram’s 24-hour conversation window.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#b4532a] mt-2 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#18181b]">Rich Media, Photos &amp; PDF Document Dispatch</div>
                    <div className="text-xs text-[#52525b] mt-0.5 leading-relaxed">
                      Send product photos, PDF invoices, receipts, and voice notes through your tenant bots.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#b4532a] mt-2 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#18181b]">Interactive Inline Keyboards &amp; Callback Buttons</div>
                    <div className="text-xs text-[#52525b] mt-0.5 leading-relaxed">
                      Attach interactive buttons and payment links to outbound messages and receive button clicks over webhooks.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#b4532a] mt-2 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#18181b]">Webhook Exponential Backoff &amp; Dead Letter Queue</div>
                    <div className="text-xs text-[#52525b] mt-0.5 leading-relaxed">
                      Automatic webhook retry schedules and failed-event replay from the tenant console.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: GOOD TO KNOW / CAVEAT CARDS ─────────────────────────────── */}
      <section className="w-full bg-[#f4efeb]/40 py-20 border-t border-[#e2dbd1]">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <span className="font-mono text-xs uppercase tracking-widest text-[#b4532a] font-medium">
              Good to know
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#18181b] font-normal mt-2">
              Read this before you build on it.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {caveats.map((c) => (
              <div
                key={c.title}
                className="bg-[#f4efeb] p-6 rounded-xl border border-[#e2dbd1] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-[#b4532a] mb-2 font-mono text-[11px] uppercase tracking-wider font-semibold">
                    <Info className="w-4 h-4" />
                    <span>{c.tag}</span>
                  </div>
                  <h3 className="font-serif text-lg font-medium text-[#18181b] mb-2">{c.title}</h3>
                  <p className="text-xs sm:text-sm text-[#52525b] leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
export default LandingPage;
