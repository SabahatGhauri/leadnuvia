import { lazyClient } from '@/lib/lazy-client';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = lazyClient(() => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
));

export async function POST(req: Request) {
  try {
    const { orgId } = await req.json();

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // 1. Fetch organization's Stripe Customer ID from Supabase
    const { data: org, error } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', orgId)
      .single();

    if (error || !org?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No active billing account found for this organization.' },
        { status: 404 }
      );
    }

    // 2. Create Stripe Billing Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
    });

    // 3. Return portal redirect URL
    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('Stripe Customer Portal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
