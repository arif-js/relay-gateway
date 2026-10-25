import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
  Input,
  Textarea,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  Checkbox,
} from 'raditail';
import {
  ArrowLeft,
  Bot,
  Send,
  Link2,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Webhook,
  Plus,
  Trash2,
  ShieldCheck,
  ExternalLink,
  MessageSquare,
  KeyRound,
  Code,
  ChevronDown,
  ChevronUp,
  Terminal,
} from 'lucide-react';

interface WebhookItem {
  id: string;
  url: string;
  events: string[];
  created_at?: string;
}

interface MessageLogItem {
  id: string;
  tenant_id: string;
  direction?: 'inbound' | 'outbound';
  chat_id: number | string;
  text: string;
  status: 'sent' | 'failed' | 'queued' | 'delivered';
  created_at: string | number;
}

export function TenantPage({ tenantId, navigate }: { tenantId: string; navigate: (path: string) => void }) {
  const [tenant, setTenant] = useState<any>(null);
  const [messages, setMessages] = useState<MessageLogItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [webhooksLoading, setWebhooksLoading] = useState(false);

  // Connect link & API key state
  const [connectLink, setConnectLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  // Test send form state
  const [targetChatId, setTargetChatId] = useState('');
  const [messageText, setMessageText] = useState('Hello from Relay Gateway!');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);

  // New webhook dialog state
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'message.sent',
    'message.failed',
    'message.received',
    'tenant.connected',
  ]);
  const [registeringWebhook, setRegisteringWebhook] = useState(false);
  const [webhookSecretRevealed, setWebhookSecretRevealed] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);
  const [copiedGuideCode, setCopiedGuideCode] = useState(false);
  const currentOrigin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://relay.arifcodes.com';

  const sampleWebhookCode = `import express from 'express';
import crypto from 'node:crypto';

const app = express();
// Keep raw body for HMAC signature verification
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; }
}));

const WEBHOOK_SECRET = process.env.RELAY_WEBHOOK_SECRET; // from webhook registration
const TENANT_KEY = process.env.RELAY_TENANT_KEY;         // rg_live_...

app.post('/webhook', async (req, res) => {
  const signature = req.headers['x-relay-signature'];
  const expected = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest('hex');

  if (signature !== expected) {
    return res.status(401).send('Invalid signature');
  }

  const { type, data } = req.body;
  if (type === 'message.received') {
    console.log(\`[Inbound from \${data.chat_id}]: \${data.text}\`);

    // Reply back through this tenant's bot:
    await fetch('${currentOrigin}/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${TENANT_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: data.chat_id,
        text: \`Thanks! We received: "\${data.text}"\`
      })
    });
  }

  res.status(200).json({ ok: true });
});

app.listen(3000, () => console.log('Webhook server running on port 3000'));`;

  const getAuthKey = () => {
    if (typeof window === 'undefined') return null;
    return (
      localStorage.getItem('relay_admin_key') ||
      localStorage.getItem(`relay_tenant_key_${tenantId}`) ||
      localStorage.getItem('relay_tenant_key')
    );
  };

  const getAuthHeaders = (): Record<string, string> => {
    const key = getAuthKey();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
    }
    return headers;
  };

  const fetchTenant = async () => {
    const key = getAuthKey();
    if (!key) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/v1/tenants/${tenantId}`, { headers: getAuthHeaders() });
      if (res.status === 401) {
        localStorage.removeItem('relay_admin_key');
        localStorage.removeItem('relay_tenant_key');
        navigate('/login');
        return;
      }
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          setTenant(json.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/v1/tenants/${tenantId}/messages?limit=50`, { headers: getAuthHeaders() });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setMessages(json.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchWebhooks = async () => {
    setWebhooksLoading(true);
    try {
      const res = await fetch(`/v1/webhooks?tenant_id=${tenantId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setWebhooks(json.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWebhooksLoading(false);
    }
  };

  const handleMintLink = async () => {
    try {
      const res = await fetch(`/v1/tenants/${tenantId}/connect-links`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const json = await res.json();
      if (json.ok && json.data) {
        const link = `${window.location.origin}/connect/${json.data.token}`;
        setConnectLink(link);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyLink = () => {
    if (!connectLink) return;
    navigator.clipboard.writeText(connectLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetChatId.trim() || !messageText.trim()) return;

    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch('/v1/messages', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tenant_id: tenantId,
          chat_id: targetChatId.trim(),
          text: messageText.trim(),
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setSendResult({ ok: true, message: `Message dispatched successfully (ID: ${json.data?.id})` });
        fetchMessages();
        fetchTenant();
      } else {
        setSendResult({ ok: false, message: json.error?.message || 'Failed to send message' });
      }
    } catch (err: any) {
      setSendResult({ ok: false, message: err.message || 'Network error' });
    } finally {
      setSending(false);
    }
  };

  const handleRegisterWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl.trim()) return;

    setRegisteringWebhook(true);
    setWebhookError(null);

    try {
      const res = await fetch('/v1/webhooks', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tenant_id: tenantId,
          url: newWebhookUrl.trim(),
          events: selectedEvents,
        }),
      });

      const json = await res.json();
      if (json.ok && json.data) {
        setWebhookSecretRevealed(json.data.secret);
        fetchWebhooks();
      } else {
        setWebhookError(json.error?.message || 'Failed to register webhook');
      }
    } catch (err: any) {
      setWebhookError(err.message || 'Network error');
    } finally {
      setRegisteringWebhook(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook endpoint?')) return;
    try {
      const res = await fetch(`/v1/webhooks/${webhookId}?tenant_id=${tenantId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        fetchWebhooks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleEvent = (event: string) => {
    if (selectedEvents.includes(event)) {
      setSelectedEvents(selectedEvents.filter((e) => e !== event));
    } else {
      setSelectedEvents([...selectedEvents, event]);
    }
  };

  useEffect(() => {
    fetchTenant();
    handleMintLink();
    fetchMessages();
    fetchWebhooks();
  }, [tenantId]);

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-10">
      {/* Navigation & Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="text-xs border-[#cfc6b9] text-[#52525b] hover:bg-[#f4efeb]"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            {typeof window !== 'undefined' && localStorage.getItem('relay_admin_key')
              ? 'Back to Master Console'
              : 'All My Tenants (Switch / Add up to 3)'}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-3xl text-[#18181b] font-normal">
                {tenant?.name || 'Loading tenant...'}
              </h1>
              {tenant && (
                <Badge
                  className={
                    tenant.status === 'connected'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-mono font-normal'
                      : tenant.status === 'revoked'
                        ? 'bg-red-100 text-red-800 border-red-200 text-xs font-mono font-normal'
                        : 'bg-amber-100 text-amber-800 border-amber-200 text-xs font-mono font-normal'
                  }
                >
                  ● {tenant.status}
                </Badge>
              )}
            </div>
            <p className="font-mono text-xs text-[#71717a] mt-1">Tenant ID: {tenantId}</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchTenant();
              fetchMessages();
              fetchWebhooks();
            }}
            className="border-[#cfc6b9] text-[#18181b] hover:bg-[#f4efeb] self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Main Grid: Bot Connection + Test Message Dispatch */}
      <div className="grid md:grid-cols-2 gap-8 mb-10">
        {/* Onboarding & Connection Details */}
        <div className="space-y-6">
          <Card className="bg-white border-[#e2dbd1] shadow-sm">
            <CardHeader className="pb-3 border-b border-[#f4efeb]">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#b4532a]" />
                <CardTitle className="text-base font-semibold text-[#18181b]">Telegram Bot Connection</CardTitle>
              </div>
              <CardDescription className="text-xs text-[#52525b]">
                The bot belongs to this tenant. You message end-users from it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="p-3 bg-[#fbf9f6] border border-[#e2dbd1] rounded-lg">
                <div className="text-xs font-mono text-[#71717a] uppercase">Connected Bot Handle</div>
                <div className="text-sm font-mono font-medium text-[#18181b] mt-0.5">
                  {tenant?.bot_username ? (
                    <a
                      href={`https://t.me/${tenant.bot_username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#b4532a] hover:underline flex items-center gap-1"
                    >
                      @{tenant.bot_username} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-[#71717a] italic">Not yet connected</span>
                  )}
                </div>
              </div>

              {/* Onboarding Link */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#18181b] flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[#b4532a]" />
                    Customer Connect Link
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMintLink}
                    className="h-6 text-[11px] px-2 text-[#52525b] border-[#cfc6b9]"
                  >
                    Regenerate
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={connectLink || 'Generating link...'}
                    className="font-mono text-xs border-[#cfc6b9] bg-[#fbf9f6]"
                  />
                  <Button
                    size="sm"
                    onClick={handleCopyLink}
                    disabled={!connectLink}
                    className="bg-[#b4532a] text-white shrink-0"
                  >
                    {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[11px] text-[#71717a]">
                  Open this link yourself (for your own B2C bot) or send it to a partner organization so they can connect their custom bot.
                </p>
              </div>

              {/* Scoped Tenant API Key */}
              {typeof window !== 'undefined' &&
                (localStorage.getItem(`relay_tenant_key_${tenantId}`) ||
                  localStorage.getItem('relay_tenant_key')) && (
                  <div className="space-y-2 pt-2 border-t border-[#f4efeb]">
                    <label className="text-xs font-medium text-[#18181b] flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[#3f6b4a]" />
                      Tenant Scoped API Key (<code className="font-mono text-[11px]">rg_live_…</code>)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={
                          localStorage.getItem(`relay_tenant_key_${tenantId}`) ||
                          localStorage.getItem('relay_tenant_key') ||
                          ''
                        }
                        className="font-mono text-xs border-[#cfc6b9] bg-[#fbf9f6]"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const k =
                            localStorage.getItem(`relay_tenant_key_${tenantId}`) ||
                            localStorage.getItem('relay_tenant_key') ||
                            '';
                          if (!k) return;
                          navigator.clipboard.writeText(k);
                          setKeyCopied(true);
                          setTimeout(() => setKeyCopied(false), 2000);
                        }}
                        className="border-[#cfc6b9] text-[#18181b] shrink-0"
                      >
                        {keyCopied ? (
                          <Check className="w-4 h-4 text-[#3f6b4a]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-[#71717a]">
                      Strictly isolated to this tenant. Use in <code className="font-mono">Authorization: Bearer rg_live_…</code>.
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Live Test Message Sender */}
        <Card className="bg-white border-[#e2dbd1] shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-[#f4efeb]">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-[#b4532a]" />
              <CardTitle className="text-base font-semibold text-[#18181b]">Send Test Message</CardTitle>
            </div>
            <CardDescription className="text-xs text-[#52525b]">
              Dispatch a test message through this tenant's Telegram bot directly from the console.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSendTestMessage} className="flex flex-col flex-1">
            <CardContent className="space-y-4 pt-4 flex-1">
              {sendResult && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                    sendResult.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {sendResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{sendResult.message}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-[#18181b]">Recipient Chat ID / User ID</label>
                <Input
                  type="text"
                  placeholder="e.g. 15551234567"
                  value={targetChatId}
                  onChange={(e) => setTargetChatId(e.target.value)}
                  className="font-mono text-xs border-[#cfc6b9] mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#18181b]">Message Body</label>
                <Textarea
                  rows={3}
                  placeholder="Your order #104 has shipped!"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="font-mono text-xs border-[#cfc6b9] mt-1"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="pt-3 border-t border-[#f4f0ea]">
              <Button
                type="submit"
                disabled={sending || !targetChatId.trim() || !messageText.trim()}
                className="w-full bg-[#b4532a] hover:bg-[#9c421e] text-white text-xs font-medium"
              >
                {sending ? 'Sending...' : 'Send Message Now'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* ── WEBHOOKS MANAGEMENT SECTION ────────────────────────────────────────── */}
      <Card className="bg-white border-[#e2dbd1] shadow-sm mb-10 overflow-hidden">
        <CardHeader className="border-b border-[#f4efeb] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-[#b4532a]" />
              <CardTitle className="text-lg font-serif text-[#18181b]">Event Webhooks</CardTitle>
              <Badge variant="outline" className="font-mono text-[10px] border-[#cfc6b9] text-[#52525b]">
                {webhooks.length} / 5 URLs
              </Badge>
            </div>
            <CardDescription className="text-xs text-[#52525b] mt-0.5">
              Receive real-time push events signed with HMAC-SHA256 whenever messages are sent, received, or failed (up to 5 destination URLs per tenant).
            </CardDescription>
          </div>

          <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#b4532a] hover:bg-[#9c421e] text-white text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-white border-[#e2dbd1]">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl text-[#18181b]">Register Event Webhook</DialogTitle>
                <CardDescription className="text-xs text-[#52525b]">
                  We will deliver HTTP POST payloads to your URL signed with an HMAC secret.
                </CardDescription>
              </DialogHeader>

              {webhookSecretRevealed ? (
                <div className="space-y-4 py-2">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
                    Webhook registered successfully! Copy your HMAC signing secret below — it will not be displayed again.
                  </div>
                  <div>
                    <label className="text-xs font-mono text-[#71717a] uppercase">HMAC Signing Secret</label>
                    <div className="mt-1 flex items-center gap-2 bg-[#f4efeb] border border-[#e2dbd1] p-2.5 rounded font-mono text-xs text-[#18181b]">
                      <span className="flex-1 select-all break-all">{webhookSecretRevealed}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(webhookSecretRevealed);
                          setSecretCopied(true);
                          setTimeout(() => setSecretCopied(false), 2000);
                        }}
                        className="border-[#cfc6b9] text-xs h-7"
                      >
                        {secretCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                  <DialogFooter className="pt-2">
                    <Button
                      onClick={() => {
                        setWebhookSecretRevealed(null);
                        setNewWebhookUrl('');
                        setWebhookDialogOpen(false);
                      }}
                      className="bg-[#b4532a] text-white w-full"
                    >
                      Done
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <form onSubmit={handleRegisterWebhook} className="space-y-4 py-2">
                  {webhookError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                      {webhookError}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-[#18181b]">Webhook Receiver URL</label>
                    <Input
                      type="url"
                      placeholder="https://api.yourdomain.com/webhooks/relay"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                      className="mt-1 font-mono text-xs border-[#cfc6b9]"
                      required
                      autoFocus
                    />
                    <span className="text-[11px] text-[#71717a] mt-0.5 block">
                      Must be a publicly accessible HTTPS endpoint.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#18181b] block mb-2">Subscribed Events</label>
                    <div className="space-y-2 border border-[#e2dbd1] p-3 rounded-lg bg-[#fbf9f6]">
                      {[
                        { id: 'message.sent', label: 'message.sent — successfully dispatched' },
                        { id: 'message.failed', label: 'message.failed — delivery failed or rejected' },
                        { id: 'message.received', label: 'message.received — incoming message from customer' },
                        { id: 'tenant.connected', label: 'tenant.connected — bot connected successfully' },
                        { id: 'tenant.revoked', label: 'tenant.revoked — bot access revoked' },
                      ].map((item) => (
                        <label key={item.id} className="flex items-center gap-2.5 text-xs text-[#52525b] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedEvents.includes(item.id)}
                            onChange={() => toggleEvent(item.id)}
                            className="rounded border-[#cfc6b9] text-[#b4532a] focus:ring-[#b4532a]"
                          />
                          <span className="font-mono text-xs">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="submit"
                      disabled={registeringWebhook || !newWebhookUrl.trim()}
                      className="bg-[#b4532a] hover:bg-[#9c421e] text-white w-full"
                    >
                      {registeringWebhook ? 'Registering...' : 'Register Webhook'}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {webhooks.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Webhook className="w-8 h-8 text-[#cfc6b9] mx-auto mb-2" />
              <p className="text-xs text-[#71717a]">No active webhooks configured for this tenant.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#f4efeb]">
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase text-[#71717a]">Endpoint URL</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#71717a]">Subscribed Events</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#71717a] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((w) => (
                  <TableRow key={w.id} className="border-b border-[#e2dbd1] hover:bg-[#faf8f5]">
                    <TableCell className="font-mono text-xs text-[#18181b] py-3">
                      <div className="font-medium">{w.url}</div>
                      <div className="text-[11px] text-[#71717a] font-normal">{w.id}</div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {w.events.map((ev) => (
                          <Badge key={ev} variant="outline" className="font-mono text-[10px] text-[#52525b] border-[#cfc6b9]">
                            {ev}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteWebhook(w.id)}
                        className="text-xs border-red-200 text-red-600 hover:bg-red-50 h-7 px-2"
                        title="Delete Webhook"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="bg-[#fbf9f6] border-t border-[#e2dbd1] p-4 flex flex-col items-start gap-3">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-[#b4532a]" />
              <span className="text-xs font-medium text-[#18181b]">
                Need help receiving webhooks?
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWebhookGuide(!showWebhookGuide)}
              className="text-xs border-[#cfc6b9] text-[#52525b] hover:bg-[#f4efeb] h-7 px-2.5"
            >
              {showWebhookGuide ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 mr-1" /> Hide Starter Code
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 mr-1" /> View Starter Code (Node.js)
                </>
              )}
            </Button>
          </div>

          {showWebhookGuide && (
            <div className="w-full space-y-3 pt-2">
              <p className="text-xs text-[#52525b] leading-relaxed">
                When a customer writes to <span className="font-mono text-[#b4532a]">@{tenant?.bot_username || 'your_bot'}</span>,
                Relay Gateway posts a signed JSON payload with header <code className="bg-[#f4efeb] border border-[#e2dbd1] px-1 py-0.5 rounded text-[11px] font-mono">x-relay-signature: sha256=...</code>.
                Here is a complete Express.js starter server to verify the signature and respond:
              </p>

              <div className="relative bg-[#18181b] text-[#f4f0ea] p-4 rounded-lg font-mono text-xs leading-relaxed overflow-x-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(sampleWebhookCode);
                    setCopiedGuideCode(true);
                    setTimeout(() => setCopiedGuideCode(false), 2000);
                  }}
                  className="absolute top-3 right-3 text-[11px] h-7 border-[#52525b] text-[#cfc6b9] hover:bg-[#3f3e3a] hover:text-white"
                >
                  {copiedGuideCode ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400 mr-1" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" /> Copy Code
                    </>
                  )}
                </Button>
                <pre>
                  <code>{sampleWebhookCode}</code>
                </pre>
              </div>

              <div className="p-3 bg-[#f4efeb] border border-[#e2dbd1] rounded-lg text-xs text-[#52525b] space-y-1">
                <div className="font-semibold text-[#18181b] flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#3f6b4a]" />
                  Testing Locally
                </div>
                <div>
                  To test locally with <code className="font-mono text-[#18181b]">http://localhost:3000/webhook</code>, use a tunnel like <code className="font-mono text-[#18181b]">ngrok http 3000</code> or <code className="font-mono text-[#18181b]">cloudflared tunnel</code> to get a public HTTPS URL.
                </div>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* ── RECENT MESSAGE LOG SECTION ─────────────────────────────────────────── */}
      <Card className="bg-white border-[#e2dbd1] shadow-sm overflow-hidden mb-10">
        <CardHeader className="border-b border-[#f4efeb] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#b4532a]" />
              <CardTitle className="text-lg font-serif text-[#18181b]">Message Log</CardTitle>
            </div>
            <CardDescription className="text-xs text-[#52525b] mt-0.5">
              Live audit trail of dispatched and received Telegram messages for this tenant.
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchMessages}
            className="text-xs border-[#cfc6b9] text-[#18181b] hover:bg-[#f4efeb] self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${messagesLoading ? 'animate-spin' : ''}`} />
            Refresh Log
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {messages.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Send className="w-8 h-8 text-[#cfc6b9] mx-auto mb-2" />
              <p className="text-xs text-[#71717a]">No messages recorded yet for this tenant.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#f4efeb]">
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase text-[#71717a]">Direction</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#71717a]">Chat ID</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#71717a]">Message Preview</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#71717a]">Status</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#71717a] text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((m) => (
                  <TableRow key={m.id} className="border-b border-[#e2dbd1] hover:bg-[#faf8f5]">
                    <TableCell className="py-3">
                      {m.direction === 'inbound' ? (
                        <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-xs font-mono font-normal">
                          ↓ inbound
                        </Badge>
                      ) : (
                        <Badge className="bg-[#f4efeb] text-[#52525b] border-[#e2dbd1] text-xs font-mono font-normal">
                          ↑ outbound
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium text-[#18181b] py-3">
                      {m.chat_id}
                    </TableCell>
                    <TableCell className="text-xs text-[#52525b] py-3 max-w-md truncate">
                      {m.text}
                    </TableCell>
                    <TableCell className="py-3">
                      {m.status === 'sent' || m.status === 'delivered' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-mono font-normal">
                          ● {m.status}
                        </Badge>
                      ) : m.status === 'failed' ? (
                        <Badge className="bg-red-100 text-red-800 border-red-200 text-xs font-mono font-normal">
                          ● failed
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-mono font-normal">
                          ● queued
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-[#71717a] py-3 text-right">
                      {new Date(m.created_at).toISOString().replace('T', ' ').slice(0, 19)}Z
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
export default TenantPage;
