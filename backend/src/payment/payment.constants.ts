export interface PlanPricing {
  amount: number;
  currency: string;
  description: string;
  name: string;
}

export const PLAN_PRICING_MAP: Record<string, PlanPricing> = {
  FREE: {
    name: 'FREE',
    amount: 0,
    currency: 'INR',
    description: 'CampaignAI Free Starter Plan',
  },
  DEMO_TEST: {
    name: 'DEMO_TEST',
    amount: 1.00,
    currency: 'INR',
    description: 'CampaignAI Demo Test Plan - ₹1 Instant Mojo Checkout',
  },
  DEMO_1INR: {
    name: 'DEMO_1INR',
    amount: 1.00,
    currency: 'INR',
    description: 'CampaignAI Demo Test Plan - ₹1 Instant Mojo Checkout',
  },
  STARTER: {
    name: 'STARTER',
    amount: 1499.00,
    currency: 'INR',
    description: 'CampaignAI Starter Plan - 1 Month',
  },
  PRO: {
    name: 'PRO',
    amount: 5900.00,
    currency: 'INR',
    description: 'CampaignAI Pro Plan - 1 Month',
  },
  ENTERPRISE: {
    name: 'ENTERPRISE',
    amount: 11800.00,
    currency: 'INR',
    description: 'CampaignAI Enterprise Plan - 1 Month',
  },
};

export function getPlanPricing(planName: string): PlanPricing {
  const normalized = (planName || '').trim().toUpperCase();
  const pricing = PLAN_PRICING_MAP[normalized];
  if (!pricing) {
    throw new Error(`Invalid subscription plan: '${planName}'. Allowed plans: DEMO_TEST, DEMO_1INR, STARTER, PRO, ENTERPRISE, FREE`);
  }
  return pricing;
}
