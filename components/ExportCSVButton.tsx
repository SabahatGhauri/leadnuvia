'use client';

import React, { useState } from 'react';
import { Download, Check } from 'lucide-react';
import { exportToCSV } from '@/lib/csv';

interface DailyMetric {
  id: string;
  metric_date: string;
  total_leads: number;
  qualified_leads: number;
  conversion_rate: number;
}

export default function ExportCSVButton({ data }: { data: DailyMetric[] }) {
  const [downloaded, setDownloaded] = useState(false);

  const handleExport = () => {
    // Define explicit column headers for clean formatting in Excel/Sheets
    const headers: { key: keyof DailyMetric; label: string }[] = [
      { key: 'metric_date', label: 'Date' },
      { key: 'total_leads', label: 'Total Leads Captured' },
      { key: 'qualified_leads', label: 'Qualified Leads' },
      { key: 'conversion_rate', label: 'Conversion Rate (%)' },
    ];

    const todayStr = new Date().toISOString().split('T')[0];
    exportToCSV(data, `analytics_metrics_${todayStr}`, headers);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <button
      onClick={handleExport}
      disabled={!data || data.length === 0}
      className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-sm disabled:opacity-50"
    >
      {downloaded ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Exported!</span>
        </>
      ) : (
        <>
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          <span>Export CSV</span>
        </>
      )}
    </button>
  );
}
