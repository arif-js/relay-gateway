import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from 'raditail';
import { Check, ArrowRight, Sparkles, HelpCircle, Clock } from 'lucide-react';

export interface CloudPlanConfig {
  isPaid: boolean;
  price: number;
  billingPeriod: string;
  badgeText: string;
  description: string;
  tenantsAllowed: string;
  messagesPerMonth: string;
  webhooksAllowed: string;
  ctaText: string;
  paymentUrl?: string;
}

export const CURRENT_CLOUD_PLAN: CloudPlanConfig = {
  isPaid: false,
  price: 0,
  billingPeriod: '/month',
  badgeText: 'Public Beta · Free',
  description: 'Multi-tenant Telegram bot infrastructure for your business and partner organizations.',
  tenantsAllowed: 'Up to 3 tenants (1 bot each)',
  messagesPerMonth: '2,000 messages / tenant / mo',
  webhooksAllowed: 'Up to 5 webhook URLs / tenant',
  ctaText: 'Start Free (Up to 3 Tenants)',
  paymentUrl: undefined,
};

export function PricingPage({ navigate }: { navigate: (path: string) => void }) {
  const comparisonRows = [
    { feature: 'Tenants included', starter: 'Up to 3 tenants', scale: 'Up to 25 tenants (Custom available)' },
    { feature: 'Dedicated Telegram bots', starter: '1 bot per tenant (3 total)', scale: '1 bot per tenant (25+ total)' },
    { feature: 'Monthly message volume', starter: '2,000 messages / tenant / mo', scale: '50,000+ messages / mo' },
    { feature: 'Zero-paste connect links (/connect/:token)', starter: 'Included (7-day links)', scale: 'Included + custom branding' },
    { feature: 'Scoped rg_live_… API key per tenant', starter: 'Included', scale: 'Included' },
    { feature: 'Signed HMAC-SHA256 webhooks', starter: 'Up to 5 endpoint URLs / tenant', scale: 'Unlimited endpoints + Retry DLQ' },
    { feature: 'Adaptive rate governor (30/s)', starter: 'Included', scale: 'Included' },
    { feature: 'Rich media & inline keyboards', starter: 'Text / Markdown / HTML', scale: 'Photos, PDFs & Inline Buttons' },
  ];

  const faqs = [
    {
      q: 'What counts as a tenant?',
      a: 'Each tenant is an isolated workspace with 1 dedicated Telegram bot (@bot_username), 1 shareable zero-paste connect link, and 1 scoped rg_live_… API key. With 3 free tenants, you can run 1 bot for your own B2C customers and 2 custom bots for partner organizations.',
    },
    {
      q: 'Why is the Starter plan free during Public Beta?',
      a: "Telegram's Bot API is free for normal messaging traffic, and our serverless infrastructure is lightweight. We want businesses and SaaS vendors building with up to 3 tenants and giving feedback before we launch our paid Scale tier.",
    },
    {
      q: 'Do my partner organizations need a Relay Gateway account to connect their bot?',
      a: 'No. You create the tenant in your Console and send the /connect/:token link to your partner organization. They open the link, pick their bot name in Telegram, and their bot is immediately connected to your tenant.',
    },
    {
      q: 'What if I want to self-host Relay Gateway on my own servers?',
      a: 'For organizations that want to run the open-source engine in their own cloud or on-premise infrastructure, see our separate Open-Source Guide.',
    },
  ];

  const handleCloudAction = () => {
    if (CURRENT_CLOUD_PLAN.isPaid && CURRENT_CLOUD_PLAN.paymentUrl) {
      window.open(CURRENT_CLOUD_PLAN.paymentUrl, '_blank');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="max-w-[1080px] mx-auto px-6 py-12">
      {/* Header */}
      <div className="text-center max-w-[680px] mx-auto mb-14">
        <Badge
          variant="outline"
          className="mb-3 text-xs font-mono uppercase tracking-widest text-[#b4532a] border-[#b4532a]/30 bg-[#f3e3d9]/40 px-3 py-1"
        >
          Relay Cloud Pricing
        </Badge>
        <h1 className="font-serif text-4xl sm:text-5xl text-[#18181b] font-normal tracking-tight mb-4">
          Start with up to 3 tenants free.<br />Scale as your network grows.
        </h1>
        <p className="text-base sm:text-lg text-[#52525b] leading-relaxed">
          Every account includes up to 3 isolated tenants and 3 dedicated Telegram bots for free — no credit card required.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-[900px] mx-auto mb-20">
        {/* Starter / Free Preview Card */}
        <Card className="bg-white border-[#b4532a]/40 shadow-md relative flex flex-col">
          <div className="absolute -top-3 right-6">
            <Badge className="bg-[#b4532a] text-white text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5">
              Available Now
            </Badge>
          </div>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between mb-2">
              <Badge
                variant="outline"
                className="text-xs font-mono border-[#b4532a]/30 text-[#b4532a] bg-[#f3e3d9]/30"
              >
                Starter · Free Preview
              </Badge>
              <Sparkles className="w-5 h-5 text-[#b4532a]" />
            </div>
            <CardTitle className="font-serif text-2xl text-[#18181b]">Relay Cloud Starter</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-[#52525b]">
              {CURRENT_CLOUD_PLAN.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-serif text-[#18181b]">$0</span>
              <span className="text-xs sm:text-sm font-medium text-[#b4532a] bg-[#f3e3d9]/40 px-2 py-0.5 rounded">
                Free during Public Beta · No card required
              </span>
            </div>
            <div className="border-t border-[#f4efeb] pt-4 space-y-3">
              {[
                'Up to 3 isolated tenants free',
                '1 dedicated Telegram bot per tenant (3 bots total)',
                'Shareable zero-paste connect links (/connect/:token)',
                'Scoped rg_live_… API key per tenant',
                '2,000 messages / tenant / month included',
                'Up to 5 signed HMAC-SHA256 webhook URLs per tenant',
                'Shared rate governor (30 msg/s global, 1 msg/s per chat)',
                'Multi-tenant Console & real-time message logs',
              ].map((feat) => (
                <div key={feat} className="flex items-start gap-2 text-xs sm:text-sm text-[#52525b]">
                  <Check className="w-4 h-4 text-[#b4532a] mt-0.5 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="pt-4 border-t border-[#f4efeb]">
            <Button
              className="w-full bg-[#b4532a] hover:bg-[#9c421e] text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5"
              onClick={handleCloudAction}
            >
              {CURRENT_CLOUD_PLAN.ctaText} <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>

        {/* Scale / Pro Tier (Coming Soon) */}
        <Card className="bg-[#f4efeb]/70 border-[#e2dbd1] shadow-sm flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-xs font-mono border-[#cfc6b9] text-[#52525b] bg-white">
                Coming Soon
              </Badge>
              <Clock className="w-5 h-5 text-[#837a70]" />
            </div>
            <CardTitle className="font-serif text-2xl text-[#18181b]">Relay Cloud Scale</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-[#52525b]">
              For multi-organization platforms needing 10+ tenant bots and high-volume delivery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-serif text-[#18181b]">$29</span>
              <span className="text-sm text-[#71717a]">/ month · Planned</span>
            </div>
            <div className="border-t border-[#e2dbd1] pt-4 space-y-3">
              {[
                'Up to 25 active tenants (1 dedicated bot each)',
                '50,000 messages / month included',
                'Unlimited signed HMAC event webhooks',
                'Automated webhook retries & Dead Letter Queue (DLQ)',
                'Rich media dispatch (Photos, PDFs, Documents)',
                'Interactive inline keyboards & callback buttons',
                'Managed AI auto-reply & inventory lookup',
                'Priority engineering support',
              ].map((feat) => (
                <div key={feat} className="flex items-start gap-2 text-xs sm:text-sm text-[#52525b]">
                  <Check className="w-4 h-4 text-[#3f6b4a] mt-0.5 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="pt-4 border-t border-[#e2dbd1]">
            <Button
              variant="outline"
              disabled
              className="w-full border-[#cfc6b9] text-[#71717a] bg-white/60 font-medium text-xs sm:text-sm"
            >
              Coming Soon — Start Free on Starter Plan
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Feature comparison table */}
      <section className="mt-16 max-w-[900px] mx-auto mb-20">
        <h2 className="font-serif text-2xl text-[#18181b] font-normal mb-6 text-center">Plan Comparison</h2>
        <Card className="bg-white border-[#e2dbd1] overflow-x-auto shadow-sm">
          <Table>
            <TableHeader className="bg-[#f4efeb]">
              <TableRow>
                <TableHead className="font-mono text-xs uppercase text-[#71717a] py-3.5">Capability</TableHead>
                <TableHead className="font-mono text-xs uppercase text-[#b4532a] py-3.5 font-bold">
                  Starter (Free Today)
                </TableHead>
                <TableHead className="font-mono text-xs uppercase text-[#71717a] py-3.5">
                  Scale (Coming Soon)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonRows.map((row) => (
                <TableRow key={row.feature} className="border-b border-[#e2dbd1] hover:bg-[#faf8f5]">
                  <TableCell className="font-medium text-xs sm:text-sm text-[#18181b] py-3">{row.feature}</TableCell>
                  <TableCell className="text-xs sm:text-sm text-[#18181b] font-medium py-3">{row.starter}</TableCell>
                  <TableCell className="text-xs sm:text-sm text-[#52525b] py-3">{row.scale}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>

      {/* FAQ Section */}
      <section className="max-w-[780px] mx-auto mb-10">
        <div className="text-center mb-10">
          <h2 className="font-serif text-3xl text-[#18181b] font-normal">Frequently Asked Questions</h2>
        </div>
        <div className="grid gap-5">
          {faqs.map((faq) => (
            <Card key={faq.q} className="bg-[#f4efeb]/60 border-[#e2dbd1] shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-[#18181b] flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#b4532a] shrink-0" />
                  {faq.q}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm text-[#52525b] leading-relaxed pl-12">
                {faq.a}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export default PricingPage;
