import type { PlanName } from '../config.js';

export interface PlanLimits {
  maxTenants: number | null;
  maxMessagesPerMonth: number | null;
  maxWebhooks: number | null;
}

export interface Plan {
  name: PlanName;
  label: string;
  priceUsd: number | null;
  blurb: string;
  limits: PlanLimits;
  features: string[];
}

/**
 * Both plans are free right now.
 *
 * The whole platform runs on one $5-a-month server, and while there are no
 * users to serve there is nothing to charge for. The hosted plan still has
 * ceilings: they exist to stop one tenant from eating the whole of a $5
 * server, not to pay for it.
 *
 * When there are enough users to want a real tier, the price becomes a
 * decision, and `priceUsd` is where it goes. There is no billing integration
 * yet — the plan limits are enforced in code, the money is not collected.
 */
export const PLANS: Record<PlanName, Plan> = {
  selfhost: {
    name: 'selfhost',
    label: 'Self-host',
    priceUsd: 0,
    blurb: 'Run it yourself, forever free. AGPL-3.0, your infrastructure, your rules.',
    limits: { maxTenants: null, maxMessagesPerMonth: null, maxWebhooks: null },
    features: [
      'Unlimited tenants',
      'Unlimited messages',
      'Unlimited webhooks',
      'Your own database, your own keys',
      'Full source, AGPL-3.0',
    ],
  },
  hosted: {
    name: 'hosted',
    label: 'Hosted',
    priceUsd: 0,
    blurb:
      'We run it, you use it. Free while we are finding our feet — the whole platform costs us $5 a month.',
    limits: { maxTenants: 3, maxMessagesPerMonth: 2_000, maxWebhooks: 5 },
    features: [
      '3 tenants',
      '2,000 messages per month',
      '5 event webhooks',
      'We keep it running',
      'Same source, we host it',
    ],
  },
};

export function getPlan(name: PlanName): Plan {
  return PLANS[name] ?? PLANS.selfhost;
}

/**
 * What it costs us to run the platform, for a small deployment. This is the
 * operator's cost, not a price charged to anyone.
 */
export const RUNNING_COST = {
  telegram: 0,
  server: 5,
  domain: 1 / 12,
  note: 'One $5 VPS, a domain, and Telegram, which charges nothing for normal sending.',
};

/** The billing period key, e.g. `2026-10`. */
export function currentPeriod(at: Date = new Date()): string {
  return `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, '0')}`;
}
