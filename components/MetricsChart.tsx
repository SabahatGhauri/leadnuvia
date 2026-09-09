'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, Users, Target, Calendar } from 'lucide-react';

export interface DailyMetric {
  id: string;
  metric_date: string;
  total_leads: number;
  qualified_leads: number;
  conversion_rate: number;
}

interface MetricsChartProps {
  data: DailyMetric[];
}

export default function MetricsChart({ data }: MetricsChartProps) {
  const [activeTab, setActiveTab] = useState<'volume' | 'conversion'>('volume');

  // Compute aggregate totals for top-level KPI cards
  const totalLeads = data.reduce((acc, curr) => acc + curr.total_leads, 0);
  const totalQualified = data.reduce((acc, curr) => acc + curr.qualified_leads, 0);
  const avgConversion = data.length
    ? (data.reduce((acc, curr) => acc + Number(curr.conversion_rate), 0) / data.length).toFixed(1)
    : '0';

  // Format dates for chart labels (e.g., "2026-09-08" -> "Sep 8")
  const formattedData = data.map((item) => ({
    ...item,
    formattedDate: new Date(item.metric_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto">
      {/* 1. Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-sm font-medium">Total Captured Leads</span>
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-white">{totalLeads.toLocaleString()}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-sm font-medium">Qualified Leads</span>
            <Target className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-white">{totalQualified.toLocaleString()}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-sm font-medium">Avg. Conversion Rate</span>
            <TrendingUp className="w-5 h-5 text-sky-400" />
          </div>
          <p className="text-3xl font-bold text-white">{avgConversion}%</p>
        </div>
      </div>

      {/* 2. Main Analytics Chart Card */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Daily Performance Metrics</h3>
            <p className="text-xs text-slate-400">Track lead generation and qualification over time</p>
          </div>

          {/* Tab Controls */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('volume')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'volume'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lead Volume
            </button>
            <button
              onClick={() => setActiveTab('conversion')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'conversion'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Conversion %
            </button>
          </div>
        </div>

        {/* 3. Recharts Container */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === 'volume' ? (
              <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="formattedDate" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: '600' }}
                />
                <Bar dataKey="total_leads" name="Total Leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="qualified_leads" name="Qualified Leads" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="conversionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="formattedDate" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  formatter={(value: any) => [`${value}%`, 'Conversion Rate']}
                />
                <Area
                  type="monotone"
                  dataKey="conversion_rate"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#conversionGrad)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
