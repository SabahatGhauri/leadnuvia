'use client';

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Palette,
  Calendar,
  ShieldCheck,
  Save,
  Loader2,
  CheckCircle2,
  Sparkles,
  Globe,
  HelpCircle,
  Plus,
  Trash2
} from 'lucide-react';

interface AgentSettings {
  agentName: string;
  systemPrompt: string;
  primaryColor: string;
  welcomeMessage: string;
  calEmbedUrl: string;
  allowedDomains: string[];
  minIntentScoreForCal: number;
}

export default function AgentSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [newDomain, setNewDomain] = useState('');

  // Agent State
  const [settings, setSettings] = useState<AgentSettings>({
    agentName: 'Acme Sales AI',
    systemPrompt: `You are an expert sales assistant for Acme Corp. Your primary goal is to answer visitor questions about enterprise pricing, custom API integrations, and product features. If the visitor demonstrates clear intent to purchase or requests a demo, direct them to book a meeting using the embedded calendar.`,
    primaryColor: '#4F46E5',
    welcomeMessage: 'Hi there! 👋 How can I help you explore Acme Corp today?',
    calEmbedUrl: 'acme-corp/demo',
    allowedDomains: ['acme.com', 'app.acme.com', 'localhost:3000'],
    minIntentScoreForCal: 75,
  });

  // Simulated Save Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      // Replace with your API route / Server Action
      // await fetch('/api/agent/settings', { method: 'POST', body: JSON.stringify(settings) });
      await new Promise((res) => setTimeout(res, 800)); // Simulated network latency

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update agent settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const addDomain = () => {
    if (!newDomain) return;
    const cleanDomain = newDomain.replace(/^https?:\/\//, '').trim();
    if (cleanDomain && !settings.allowedDomains.includes(cleanDomain)) {
      setSettings((prev) => ({
        ...prev,
        allowedDomains: [...prev.allowedDomains, cleanDomain],
      }));
      setNewDomain('');
    }
  };

  const removeDomain = (domainToRemove: string) => {
    setSettings((prev) => ({
      ...prev,
      allowedDomains: prev.allowedDomains.filter((d) => d !== domainToRemove),
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Agent Settings</h1>
            <p className="text-sm text-slate-500 mt-1">
              Customize how your AI chat widget looks, behaves, and interacts with visitors.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-sm transition disabled:opacity-50 text-sm"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : savedSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : savedSuccess ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        {/* Form Sections */}
        <form onSubmit={handleSave} className="space-y-8">

          {/* 1. AGENT IDENTITY & BRANDING */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
              <Palette className="w-5 h-5 text-indigo-600" />
              <span>Branding & Appearance</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Agent Name */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Agent Display Name
                </label>
                <input
                  type="text"
                  value={settings.agentName}
                  onChange={(e) => setSettings({ ...settings, agentName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  placeholder="e.g. Sales Concierge"
                  required
                />
              </div>

              {/* Primary Color Picker */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Widget Brand Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="h-10 w-14 p-1 rounded-xl border border-slate-200 cursor-pointer bg-slate-50"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm uppercase font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  />
                </div>
              </div>

              {/* Welcome Greeting */}
              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Initial Greeting Message
                </label>
                <input
                  type="text"
                  value={settings.welcomeMessage}
                  onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  placeholder="Welcome message displayed on chat open..."
                  required
                />
              </div>
            </div>
          </section>

          {/* 2. SYSTEM INSTRUCTIONS / PROMPT */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>AI System Prompt & Instructions</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  System Instructions
                </label>
                <span className="text-xs text-slate-400">Guides the persona and rules of the assistant</span>
              </div>
              <textarea
                rows={6}
                value={settings.systemPrompt}
                onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                placeholder="Define how the AI should introduce product tiers, handle objections, or qualify prospects..."
              />
            </div>
          </section>

          {/* 3. CAL.COM SCHEDULING INTEGRATION */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <span>Cal.com Scheduling Integration</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cal Link */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Cal.com Event Link
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 bg-slate-100 border border-r-0 border-slate-200 text-slate-500 rounded-l-xl text-xs font-mono">
                    cal.com/
                  </span>
                  <input
                    type="text"
                    value={settings.calEmbedUrl}
                    onChange={(e) => setSettings({ ...settings, calEmbedUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-r-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                    placeholder="org-slug/15min"
                  />
                </div>
              </div>

              {/* Intent Score Trigger */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Min Intent Score Trigger
                  </label>
                  <span className="text-xs font-bold text-indigo-600">{settings.minIntentScoreForCal}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={settings.minIntentScoreForCal}
                  onChange={(e) => setSettings({ ...settings, minIntentScoreForCal: Number(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  Automated calendar embed will render inside the chat when visitor intent score reaches or exceeds this value.
                </p>
              </div>
            </div>
          </section>

          {/* 4. SECURITY & DOMAIN RULES */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>Allowed Security Domains (CORS)</span>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Specify the exact web domains where your AI chat widget embed script is allowed to run.
              </p>

              {/* Domain Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="e.g. app.yourdomain.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={addDomain}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Domain
                </button>
              </div>

              {/* Domain Chips List */}
              <div className="flex flex-wrap gap-2 pt-2">
                {settings.allowedDomains.map((domain) => (
                  <div
                    key={domain}
                    className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                  >
                    <span>{domain}</span>
                    <button
                      type="button"
                      onClick={() => removeDomain(domain)}
                      className="text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </form>
      </div>
    </div>
  );
}
