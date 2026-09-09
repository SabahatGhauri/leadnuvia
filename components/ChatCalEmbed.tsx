'use client';

import React, { useEffect } from 'react';
import Cal, { getCalApi } from '@calcom/embed-react';
import { Calendar, CheckCircle2 } from 'lucide-react';

interface ChatCalEmbedProps {
  calLink: string; // e.g., "acme-corp/demo" or "john/15min"
  visitorEmail?: string;
  visitorName?: string;
  onBookingSuccess?: () => void;
}

export default function ChatCalEmbed({
  calLink,
  visitorEmail,
  visitorName,
  onBookingSuccess,
}: ChatCalEmbedProps) {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi();

      // Customize Cal theme to match widget branding
      cal('ui', {
        theme: 'light',
        styles: {
          branding: {
            brandColor: '#4F46E5',
          },
        },
        hideEventTypeDetails: false,
        layout: 'month_view',
      });

      // Listen for successful booking event
      cal('on', {
        action: 'bookingSuccessful',
        callback: () => {
          if (onBookingSuccess) onBookingSuccess();
        },
      });
    })();
  }, [onBookingSuccess]);

  return (
    <div className="my-3 p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-3">
      {/* Header CTA */}
      <div className="flex items-center gap-2 text-indigo-900 font-semibold text-xs">
        <Calendar className="w-4 h-4 text-indigo-600" />
        <span>Pick a convenient time for a 1-on-1 demo:</span>
      </div>

      {/* Embedded Calendar Container */}
      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white h-[380px] shadow-sm">
        <Cal
          calLink={calLink}
          style={{ width: '100%', height: '100%', overflow: 'scroll' }}
          config={{
            name: visitorName || '',
            email: visitorEmail || '',
            layout: 'month_view',
          }}
        />
      </div>
    </div>
  );
}
