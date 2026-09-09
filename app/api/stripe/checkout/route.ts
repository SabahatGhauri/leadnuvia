import { lazyClient } from '@/lib/lazy-client';
import { NextResponse } from 'next/server';
import { stripe, PLANS } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = lazyClient(() => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
));

export async function POST(req: Request) {
  try {
    const { planId, orgId, userEmail } = await req.json();

    const selectedPlan = PLANS[planId as keyof typeof PLANS];
    if (!selectedPlan) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    // Check if organization already has a Stripe customer ID
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', orgId)
      .single();

    let customerId = org?.stripe_customer_id;

    // Create a new Stripe Customer if none exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { organizationId: orgId },
      });
      customerId = customer.id;

      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', orgId);
    }

    // Create the Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      billing_address_collection: 'auto',
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?status=cancelled`,
      metadata: {
        organizationId: orgId,
        planId,
      },
      subscription_data: {
        metadata: {
          organizationId: orgId,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout session error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
