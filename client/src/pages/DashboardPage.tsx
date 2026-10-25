import React, { useState, useEffect } from 'react';
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
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from 'raditail';
import { Users, Send, Bot, Plus, Link2, Check, RefreshCw, ArrowUpRight, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { CURRENT_CLOUD_PLAN } from './PricingPage';

export interface TenantItem {
  id: string;
  name: string;
  status: 'pending' | 'connected' | 'revoked';
  bot_username?: string | null;
  created_at: number;
}

export function DashboardPage({
  navigate,
  hasClerk = false,
}: {
  navigate: (path: string) => void;
  hasClerk?: boolean;
}) {
  const hasAdminKey = typeof window !== 'undefined' ? Boolean(localStorage.getItem('relay_admin_key')) : false;

  if (hasClerk && !hasAdminKey) {
    return <ClerkVendorDashboard navigate={navigate} />;
  }

  return <MasterAdminDashboard navigate={navigate} />;
}

function ClerkVendorDashboard({ navigate }: { navigate: (path: string) => void }) {
  const { isSignedIn, user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [maxTenants, setMaxTenants] = useState<number>(3);
  const [loading, setLoading] = useState(true);
  const [newTenantName, setNewTenantName] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const fetchVendorTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch('/v1/merchant/tenant', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        navigate('/login');
        return;
      }
      if (res.ok) {
        const json = await res.json();
        const list: TenantItem[] = Array.isArray(json.data?.tenants)
          ? json.data.tenants
          : json.data?.tenant
            ? [json.data.tenant]
            : [];
        setTenants(list);
        if (typeof json.data?.max_tenants === 'number') {
          setMaxTenants(json.data.max_tenants);
        }
        if (json.data?.api_key && json.data?.tenant?.id) {
          localStorage.setItem(`relay_tenant_key_${json.data.tenant.id}`, json.data.api_key);
          localStorage.setItem('relay_tenant_key', json.data.api_key);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      navigate('/login');
      return;
    }
    fetchVendorTenants();
  }, [isLoaded, isSignedIn]);

  const handleOpenTenant = async (tenantId: string) => {
    setOpeningId(tenantId);
    try {
      const existingKey = localStorage.getItem(`relay_tenant_key_${tenantId}`);
      const token = await getToken();
      const res = await fetch(
        `/v1/merchant/tenant?tenant_id=${encodeURIComponent(tenantId)}&mint_key=${existingKey ? '0' : '1'}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const json = await res.json();
        const keyToUse = json.data?.api_key || existingKey;
        if (keyToUse) {
          localStorage.setItem(`relay_tenant_key_${tenantId}`, keyToUse);
          localStorage.setItem('relay_tenant_key', keyToUse);
        }
      }
      navigate(`/dashboard/tenants/${tenantId}`);
    } catch {
      navigate(`/dashboard/tenants/${tenantId}`);
    } finally {
      setOpeningId(null);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch('/v1/merchant/tenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newTenantName.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error?.message || 'Could not create tenant.');
        return;
      }

      if (json.data?.api_key && json.data?.tenant?.id) {
        localStorage.setItem(`relay_tenant_key_${json.data.tenant.id}`, json.data.api_key);
        localStorage.setItem('relay_tenant_key', json.data.api_key);
      }

      setNewTenantName('');
      setCreateDialogOpen(false);
      await fetchVendorTenants();

      if (json.data?.tenant?.id) {
        navigate(`/dashboard/tenants/${json.data.tenant.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setCreating(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="max-w-[1080px] mx-auto px-6 py-24 text-center">
        <div className="inline-block animate-spin w-8 h-8 border-2 border-[#b4532a] border-t-transparent rounded-full mb-4" />
        <p className="text-sm text-[#71717a]">Loading your tenants…</p>
      </div>
    );
  }

  const connectedCount = tenants.filter((t) => t.status === 'connected').length;
  const canCreateMore = tenants.length < maxTenants;

  return (
    <div className="max-w-[1080px] mx-auto px-6 py-10">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Badge variant="outline" className="mb-2 text-xs font-mono uppercase text-[#b4532a] border-[#b4532a]/30">
            Vendor Console · {tenants.length} / {maxTenants} Free Tenants
          </Badge>
          <h1 className="font-serif text-3xl text-[#1a1714] font-normal">
            {user?.firstName ? `${user.firstName}’s Tenants` : 'My Tenants'}
          </h1>
          <p className="text-sm text-[#6e6459] mt-1">
            Create up to {maxTenants} isolated tenants free. Each tenant gets 1 dedicated Telegram bot and its own{' '}
            <code className="bg-[#f4efeb] px-1 rounded font-mono text-xs text-[#18181b]">rg_live_…</code> API key.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchVendorTenants}
            className="border-[#cfc6b9] text-[#1a1714] hover:bg-[#f4f0ea]"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {canCreateMore && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-[#b4532a] hover:bg-[#9c421e] text-white">
                  <Plus className="w-4 h-4 mr-1.5" />
                  New Tenant ({tenants.length}/{maxTenants})
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px] bg-white border-[#e2dbd1]">
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl text-[#1a1714]">
                    Create Tenant ({tenants.length + 1} of {maxTenants})
                  </DialogTitle>
                  <CardDescription className="text-xs text-[#6e6459]">
                    Each tenant includes 1 dedicated Telegram bot, a 7-day connect link, and a scoped rg_live_… key.
                  </CardDescription>
                </DialogHeader>

                <form onSubmit={handleCreateTenant} className="space-y-4 py-2">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                      <span>{error}</span>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-[#1a1714]">Tenant / Organization Name</label>
                    <Input
                      placeholder="e.g. Acme Store or Organization A"
                      value={newTenantName}
                      onChange={(e) => setNewTenantName(e.target.value)}
                      className="mt-1 border-[#cfc6b9]"
                      required
                      autoFocus
                    />
                  </div>
                  <DialogFooter className="pt-2">
                    <Button
                      type="submit"
                      disabled={creating || !newTenantName.trim()}
                      className="bg-[#b4532a] hover:bg-[#9c421e] text-white w-full"
                    >
                      {creating ? 'Creating…' : 'Create Tenant'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        <Card className="bg-white border-[#e2dbd1] shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#837a70]">Tenants Used</span>
              <Users className="w-4 h-4 text-[#837a70]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif text-[#1a1714]">
              {tenants.length} <span className="text-lg text-[#837a70]">/ {maxTenants}</span>
            </div>
            <p className="text-xs text-[#837a70] mt-1">
              {canCreateMore
                ? `${maxTenants - tenants.length} free tenant slot${maxTenants - tenants.length === 1 ? '' : 's'} remaining`
                : 'All 3 free tenant slots active'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e2dbd1] shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#837a70]">Connected Bots</span>
              <Bot className="w-4 h-4 text-[#3f6b4a]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif text-[#1a1714]">{connectedCount}</div>
            <p className="text-xs text-[#837a70] mt-1">
              {connectedCount} of {tenants.length} bot{tenants.length === 1 ? '' : 's'} connected
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e2dbd1] shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#837a70]">Rate Governor</span>
              <Send className="w-4 h-4 text-[#b4532a]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif text-[#1a1714]">30/s</div>
            <p className="text-xs text-[#837a70] mt-1">2,000 messages / mo included</p>
          </CardContent>
        </Card>
      </div>

      {/* Tenants Table */}
      <Card className="bg-white border-[#e2dbd1] shadow-sm overflow-hidden mb-10">
        <CardHeader className="border-b border-[#f4f0ea] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="font-serif text-xl text-[#1a1714]">Your Tenants ({tenants.length}/{maxTenants})</CardTitle>
            <CardDescription className="text-xs text-[#6e6459] mt-0.5">
              Select a tenant to copy its connect link, view its scoped rg_live_… key, manage webhooks, or send test messages.
            </CardDescription>
          </div>
          {canCreateMore && tenants.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateDialogOpen(true)}
              className="border-[#b4532a]/40 text-[#b4532a] hover:bg-[#f3e3d9]/40 text-xs self-start"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Another Tenant ({maxTenants - tenants.length} left)
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {tenants.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Bot className="w-10 h-10 text-[#cfc6b9] mx-auto mb-3" />
              <h3 className="font-medium text-base text-[#1a1714] mb-1">No tenants created yet</h3>
              <p className="text-sm text-[#837a70] max-w-sm mx-auto mb-4">
                Create your first tenant (up to {maxTenants} free) to connect a dedicated Telegram bot.
              </p>
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                className="bg-[#b4532a] hover:bg-[#9c421e] text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create First Tenant
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#f4f0ea]">
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase text-[#837a70]">Tenant Name</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#837a70]">Status</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#837a70]">Telegram Bot</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#837a70]">Created</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#837a70] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => (
                  <TableRow key={t.id} className="border-b border-[#e2dbd1] hover:bg-[#faf8f5]">
                    <TableCell className="py-3.5">
                      <div className="font-medium text-sm text-[#1a1714]">{t.name}</div>
                      <div className="font-mono text-[11px] text-[#837a70]">{t.id}</div>
                    </TableCell>
                    <TableCell className="py-3.5">
                      {t.status === 'connected' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-mono font-normal">
                          ● connected
                        </Badge>
                      ) : t.status === 'revoked' ? (
                        <Badge className="bg-red-100 text-red-800 border-red-200 text-xs font-mono font-normal">
                          ● revoked
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-mono font-normal">
                          ● pending bot setup
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 font-mono text-xs text-[#1a1714]">
                      {t.bot_username ? (
                        <a
                          href={`https://t.me/${t.bot_username}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#b4532a] hover:underline flex items-center gap-1"
                        >
                          @{t.bot_username} <ArrowUpRight className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[#837a70]">Not connected yet</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 text-xs text-[#837a70] font-mono">
                      {t.created_at ? new Date(t.created_at).toISOString().slice(0, 10) : '—'}
                    </TableCell>
                    <TableCell className="py-3.5 text-right">
                      <Button
                        size="sm"
                        disabled={openingId === t.id}
                        onClick={() => handleOpenTenant(t.id)}
                        className="bg-[#18181b] hover:bg-[#3f3e3a] text-white text-xs inline-flex items-center gap-1.5"
                      >
                        <span>{openingId === t.id ? 'Opening…' : 'Manage Tenant'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
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

function MasterAdminDashboard({ navigate }: { navigate: (path: string) => void }) {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTenantName, setNewTenantName] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [platformPlan, setPlatformPlan] = useState<'selfhost' | 'hosted'>('selfhost');

  const fetchData = async () => {
    setLoading(true);
    try {
      try {
        const healthRes = await fetch('/healthz');
        if (healthRes.ok) {
          const healthJson = await healthRes.json();
          if (healthJson.data?.plan) {
            setPlatformPlan(healthJson.data.plan);
          }
        }
      } catch {
        // ignore
      }

      const adminKey = typeof window !== 'undefined' ? localStorage.getItem('relay_admin_key') : null;
      if (!adminKey) {
        navigate('/login');
        return;
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminKey}`,
      };

      const res = await fetch('/v1/tenants', { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setTenants(json.data);
        }
      } else if (res.status === 401) {
        localStorage.removeItem('relay_admin_key');
        navigate('/login');
        return;
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) return;
    setCreating(true);

    try {
      const adminKey = localStorage.getItem('relay_admin_key');
      const res = await fetch('/v1/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminKey ? { Authorization: `Bearer ${adminKey}` } : {}),
        },
        body: JSON.stringify({ name: newTenantName.trim() }),
      });

      const json = await res.json();
      if (json.ok && json.data) {
        setCreatedKey(json.data.api_key);
        setNewTenantName('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleMintLink = async (tenantId: string) => {
    try {
      const adminKey = localStorage.getItem('relay_admin_key');
      const res = await fetch(`/v1/tenants/${tenantId}/connect-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminKey ? { Authorization: `Bearer ${adminKey}` } : {}),
        },
      });

      const json = await res.json();
      if (json.ok && json.data) {
        const link = `${window.location.origin}/connect/${json.data.token}`;
        navigator.clipboard.writeText(link);
        setCopiedLink(tenantId);
        setTimeout(() => setCopiedLink(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const connectedCount = tenants.filter((t) => t.status === 'connected').length;

  return (
    <div className="max-w-[1080px] mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Badge variant="outline" className="mb-2 text-xs font-mono uppercase text-[#b4532a] border-[#b4532a]/30">
            Master Console
          </Badge>
          <h1 className="font-serif text-3xl text-[#1a1714] font-normal">Platform Overview</h1>
          <p className="text-sm text-[#6e6459] mt-1">
            Manage all tenant accounts, bot connections, and message dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="border-[#cfc6b9] text-[#1a1714] hover:bg-[#f4f0ea]"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#b4532a] hover:bg-[#9c421e] text-white">
                <Plus className="w-4 h-4 mr-1.5" />
                New Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px] bg-white border-[#e2dbd1]">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl text-[#1a1714]">Create Tenant</DialogTitle>
                <CardDescription className="text-xs text-[#6e6459]">
                  A tenant represents one business or organization with its own Telegram bot.
                </CardDescription>
              </DialogHeader>

              {createdKey ? (
                <div className="space-y-4 py-2">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
                    Tenant created successfully! Save this scoped live key — it is shown once.
                  </div>
                  <div>
                    <label className="text-xs font-mono text-[#837a70] uppercase">Tenant API Key</label>
                    <div className="mt-1 flex items-center gap-2 bg-[#f4f0ea] border border-[#e2dbd1] p-2.5 rounded font-mono text-xs text-[#1a1714] select-all break-all">
                      {createdKey}
                    </div>
                  </div>
                  <DialogFooter className="pt-2">
                    <Button
                      onClick={() => {
                        setCreatedKey(null);
                        setCreateDialogOpen(false);
                      }}
                      className="bg-[#b4532a] text-white w-full"
                    >
                      Done
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <form onSubmit={handleCreateTenant} className="space-y-4 py-2">
                  <div>
                    <label className="text-xs font-medium text-[#1a1714]">Tenant / Organization Name</label>
                    <Input
                      placeholder="e.g. Acme Store or Organization A"
                      value={newTenantName}
                      onChange={(e) => setNewTenantName(e.target.value)}
                      className="mt-1 border-[#cfc6b9]"
                      required
                      autoFocus
                    />
                  </div>
                  <DialogFooter className="pt-2">
                    <Button
                      type="submit"
                      disabled={creating || !newTenantName.trim()}
                      className="bg-[#b4532a] hover:bg-[#9c421e] text-white w-full"
                    >
                      {creating ? 'Creating...' : 'Create Tenant'}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        <Card className="bg-white border-[#e2dbd1] shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#837a70]">Tenants</span>
              <Users className="w-4 h-4 text-[#837a70]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif text-[#1a1714]">{tenants.length}</div>
            <p className="text-xs text-[#837a70] mt-1">
              {platformPlan === 'selfhost' || CURRENT_CLOUD_PLAN.isPaid ? 'Unlimited allowed' : CURRENT_CLOUD_PLAN.tenantsAllowed}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e2dbd1] shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#837a70]">Active Bots</span>
              <Bot className="w-4 h-4 text-[#3f6b4a]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif text-[#1a1714]">{connectedCount}</div>
            <p className="text-xs text-[#837a70] mt-1">
              {connectedCount} of {tenants.length} connected
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e2dbd1] shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#837a70]">Rate Limiter</span>
              <Send className="w-4 h-4 text-[#b4532a]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif text-[#1a1714]">30/s</div>
            <p className="text-xs text-[#837a70] mt-1">Global token bucket active</p>
          </CardContent>
        </Card>
      </div>

      {/* Tenants Table */}
      <Card className="bg-white border-[#e2dbd1] shadow-sm overflow-hidden mb-10">
        <CardHeader className="border-b border-[#f4f0ea] pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-serif text-xl text-[#1a1714]">Tenants</CardTitle>
              <CardDescription className="text-xs text-[#6e6459] mt-0.5">
                Each tenant owns their Telegram bot and can revoke it at any time.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {tenants.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Bot className="w-10 h-10 text-[#cfc6b9] mx-auto mb-3" />
              <h3 className="font-medium text-base text-[#1a1714] mb-1">No tenants yet</h3>
              <p className="text-sm text-[#837a70] max-w-sm mx-auto mb-4">
                Create your first tenant to start onboarding bots to Telegram.
              </p>
              <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="bg-[#b4532a] text-white">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Tenant
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#f4f0ea]">
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase text-[#837a70]">Tenant Name</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#837a70]">Status</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#837a70]">Telegram Bot</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#837a70]">Created</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#837a70] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => (
                  <TableRow key={t.id} className="border-b border-[#e2dbd1] hover:bg-[#faf8f5]">
                    <TableCell className="py-3.5">
                      <div className="font-medium text-sm text-[#1a1714]">{t.name}</div>
                      <div className="font-mono text-[11px] text-[#837a70]">{t.id}</div>
                    </TableCell>
                    <TableCell className="py-3.5">
                      {t.status === 'connected' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-mono font-normal">
                          ● connected
                        </Badge>
                      ) : t.status === 'revoked' ? (
                        <Badge className="bg-red-100 text-red-800 border-red-200 text-xs font-mono font-normal">
                          ● revoked
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-mono font-normal">
                          ● pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 font-mono text-xs text-[#1a1714]">
                      {t.bot_username ? (
                        <a
                          href={`https://t.me/${t.bot_username}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#b4532a] hover:underline flex items-center gap-1"
                        >
                          @{t.bot_username} <ArrowUpRight className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[#837a70]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 text-xs text-[#837a70] font-mono">
                      {new Date(t.created_at).toISOString().slice(0, 10)}
                    </TableCell>
                    <TableCell className="py-3.5 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMintLink(t.id)}
                        className="text-xs border-[#cfc6b9] text-[#1a1714] hover:bg-[#f4f0ea]"
                        title="Copy Onboarding Connect Link"
                      >
                        {copiedLink === t.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1 text-[#3f6b4a]" /> Copied!
                          </>
                        ) : (
                          <>
                            <Link2 className="w-3.5 h-3.5 mr-1 text-[#837a70]" /> Connect Link
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/dashboard/tenants/${t.id}`)}
                        className="text-xs border-[#cfc6b9] text-[#1a1714] hover:bg-[#f4f0ea]"
                      >
                        Details
                      </Button>
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

export default DashboardPage;
