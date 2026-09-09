'use client';

import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';

export default function ManageBillingButton({ orgId }: { orgId: string }) {
  const [loading, setLoading] = useState(false);

  const handleOpenPortal = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe Customer Portal
      } else {
        alert(data.error || 'Failed to open billing portal.');
      }
    } catch (err) {
      console.error('Error launching portal:', err);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleOpenPortal}
      disabled={loading}
      className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
      {loading ? 'Opening Portal...' : 'Manage Subscription & Invoices'}
    </button>
  );
}
