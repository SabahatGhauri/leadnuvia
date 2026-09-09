import { lazyClient } from '@/lib/lazy-client';
import Stripe from 'stripe';

export const stripe = lazyClient(() => new Stripe(process.env.STRIPE_SECRET_KEY!, {
  appInfo: {
    name: 'LeadNuvia',
    version: '1.0.0',
  },
}));

// Map internal plan IDs to Stripe Price IDs
export const PLANS = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
  },
};
