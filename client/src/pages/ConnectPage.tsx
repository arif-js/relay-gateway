import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, Button, Input } from 'raditail';
import { Bot, CheckCircle2, ArrowRight, ShieldCheck, ExternalLink, AlertCircle } from 'lucide-react';

export function ConnectPage({ token }: { token: string }) {
  const [tenantName, setTenantName] = useState('Your Business');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'pending' | 'awaiting' | 'completed'>('pending');
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clean username preview
  const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

  // Ask the server for the real state: on load, and every 3s while waiting on Telegram.
  useEffect(() => {
    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch(`/v1/connect/${token}/status`);
        const json = await res.json();
        if (stopped || !json.ok) return;
        if (json.data.tenant_name) setTenantName(json.data.tenant_name);
        if (json.data.status === 'completed') {
          setBotUsername(json.data.bot_username);
          setStatus('completed');
        }
      } catch {
        // transient network error: try again on the next tick
      }
    };
    check();
    if (status !== 'awaiting') return () => { stopped = true; };
    const timer = setInterval(check, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [token, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !sanitizedUsername) return;

    if (!sanitizedUsername.endsWith('bot')) {
      setError('Bot username must end in "bot" (e.g. my_shop_bot)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/v1/connect/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          username: sanitizedUsername,
        }),
      });

      const json = await res.json();
      if (json.ok && json.data) {
        setBotUsername(json.data.bot_username || sanitizedUsername);
        if (json.data.status === 'completed') {
          setStatus('completed');
        } else if (json.data.next_url) {
          // Live mode: Telegram has to create the bot. Send them there and wait.
          setTelegramUrl(json.data.next_url);
          setStatus('awaiting');
          window.location.assign(json.data.next_url);
        } else {
          setError('Telegram did not return a link to create the bot. Please try again.');
        }
      } else {
        setError(json.error?.message || 'Failed to initialize Telegram bot connection');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f6] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-[500px]">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <img src="/assets/logo.png" alt="Relay Gateway" className="h-6 w-auto" />
            <span className="font-serif font-bold text-lg text-[#1a1714]">Relay Gateway</span>
          </div>
          <h1 className="font-serif text-3xl text-[#1a1714] font-normal tracking-tight">
            Connect your Telegram Bot
          </h1>
          <p className="text-sm text-[#6e6459] mt-2">
            Configure your official Telegram sender in seconds.
          </p>
        </div>

        {status === 'completed' ? (
          <Card className="bg-white border-[#e2dbd1] shadow-md p-6 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <CardTitle className="font-serif text-2xl text-[#1a1714] mb-2">You're Connected!</CardTitle>
            <p className="text-sm text-[#4a443d] leading-relaxed mb-6">
              Your Telegram bot <span className="font-mono font-semibold text-[#b4532a]">@{botUsername}</span> is now active.
              Messages requested by your service will be delivered directly from this bot.
            </p>

            {botUsername ? (
              <Button
                onClick={() => window.open(`https://t.me/${botUsername}`, '_blank')}
                className="w-full bg-[#b4532a] hover:bg-[#9c421e] text-white font-medium mb-4"
              >
                Open in Telegram <ExternalLink className="w-4 h-4 ml-1.5" />
              </Button>
            ) : null}

            <div className="p-3 bg-[#fbf9f6] border border-[#e2dbd1] rounded-lg text-xs text-[#6e6459] text-left space-y-1">
              <div className="font-semibold text-[#1a1714] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3f6b4a]" />
                You retain complete ownership
              </div>
              <div>The bot belongs to your Telegram account. You can revoke access at any time directly inside Telegram.</div>
            </div>
          </Card>
        ) : status === 'awaiting' ? (
          <Card className="bg-white border-[#e2dbd1] shadow-md p-6 text-center">
            <div className="w-12 h-12 bg-[#f3e3d9] text-[#b4532a] rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-6 h-6" />
            </div>
            <CardTitle className="font-serif text-2xl text-[#1a1714] mb-2">Finish in Telegram</CardTitle>
            <p className="text-sm text-[#4a443d] leading-relaxed mb-6">
              Confirm the creation of{' '}
              <span className="font-mono font-semibold text-[#b4532a]">@{botUsername}</span> in Telegram.
              This page updates by itself once it's done.
            </p>
            {telegramUrl ? (
              <Button
                onClick={() => window.location.assign(telegramUrl)}
                className="w-full bg-[#b4532a] hover:bg-[#9c421e] text-white font-medium mb-3"
              >
                Open Telegram <ExternalLink className="w-4 h-4 ml-1.5" />
              </Button>
            ) : null}
            <p className="text-xs text-[#837a70]">Waiting for Telegram…</p>
          </Card>
        ) : (
          <Card className="bg-white border-[#e2dbd1] shadow-md">
            <form onSubmit={handleSubmit}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-serif text-[#1a1714]">Set up your sender</CardTitle>
                <CardDescription className="text-xs text-[#6e6459]">
                  Pick a name and handle for your Telegram bot. Telegram will register it instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-[#1a1714]">Bot Display Name</label>
                  <Input
                    type="text"
                    placeholder="e.g. Sara's Phone Shop"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 border-[#cfc6b9]"
                    required
                    maxLength={64}
                    autoFocus
                  />
                  <span className="text-[11px] text-[#837a70] mt-0.5 block">
                    What your customers see in their Telegram chat header.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#1a1714]">Bot Username</label>
                  <Input
                    type="text"
                    placeholder="e.g. sara_phone_shop_bot"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 font-mono text-xs border-[#cfc6b9]"
                    required
                    maxLength={32}
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#837a70] mt-1">
                    <span>Must end in "bot" (5-32 letters, digits, _)</span>
                    {sanitizedUsername && (
                      <span className="font-mono text-[#b4532a]">@{sanitizedUsername}</span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-[#fbf9f6] border border-[#e2dbd1] rounded-lg text-xs text-[#6e6459] space-y-1">
                  <div className="font-semibold text-[#1a1714] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#3f6b4a]" />
                    No tokens or passwords required
                  </div>
                  <div>Telegram will open to verify bot creation. You never have to copy or paste credentials.</div>
                </div>
              </CardContent>
              <CardFooter className="pt-2 border-t border-[#f4f0ea]">
                <Button
                  type="submit"
                  disabled={loading || !displayName.trim() || !sanitizedUsername}
                  className="w-full bg-[#b4532a] hover:bg-[#9c421e] text-white font-medium text-sm flex items-center justify-center gap-2"
                >
                  {loading ? 'Creating bot...' : 'Create & Connect Bot'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}

