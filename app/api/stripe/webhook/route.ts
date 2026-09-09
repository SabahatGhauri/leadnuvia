import { lazyClient } from '@/lib/lazy-client';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = lazyClient(() => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
));

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      // 1. Initial Checkout Completed
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organizationId;
        const subscriptionId = session.subscription as string;

        if (orgId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          await supabase
            .from('organizations')
            .update({
              subscription_id: subscription.id,
              subscription_status: subscription.status,
              plan_type: session.metadata?.planId || 'pro',
              current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
            })
            .eq('id', orgId);
        }
        break;
      }

      // 2. Subscription Renewed or Updated
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.organizationId;

        if (orgId) {
          await supabase
            .from('organizations')
            .update({
              subscription_status: subscription.status,
              current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
            })
            .eq('id', orgId);
        }
        break;
      }

      // 3. Subscription Cancelled or Payment Failed
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.organizationId;

        if (orgId) {
          await supabase
            .from('organizations')
            .update({
              subscription_status: 'canceled',
              plan_type: 'free',
            })
            .eq('id', orgId);
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
