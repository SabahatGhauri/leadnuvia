'use client';
import { lazyClient } from '@/lib/lazy-client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Search,
  TrendingUp,
  Mail,
  Building2,
  MessageSquare,
  Bot,
  User,
  Loader2,
  RefreshCw,
  Bell
} from 'lucide-react';
import { getDashboardLeads, LeadWithTranscript } from './actions';

// Initialize Supabase Browser Client for Realtime Listeners
const supabaseBrowser = lazyClient(() => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
));

export default function LeadsDashboard() {
  const [leads, setLeads] = useState<LeadWithTranscript[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadWithTranscript | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [newLeadNotification, setNewLeadNotification] = useState<string | null>(null);

  const DEMO_ORG_ID = 'YOUR_ORGANIZATION_UUID_HERE';

  // Load Initial Data via Server Action
  const loadData = async () => {
    setLoading(true);
    const data = await getDashboardLeads(DEMO_ORG_ID);
    setLeads(data);
    if (data.length > 0 && !selectedLead) {
      setSelectedLead(data[0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    // -------------------------------------------------------------
    // SUPABASE REALTIME SUBSCRIPTION
    // -------------------------------------------------------------
    const channel = supabaseBrowser
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'leads',
          filter: `organization_id=eq.${DEMO_ORG_ID}`,
        },
        async (payload) => {
          console.log('Realtime Postgres Event Received:', payload);

          if (payload.eventType === 'INSERT') {
            const newRecord = payload.new;

            // Format incoming raw record into dashboard data shape
            const incomingLead: LeadWithTranscript = {
              id: newRecord.id,
              email: newRecord.email,
              name: newRecord.name,
              company: newRecord.company_name,
              intentScore: newRecord.intent_score || 0,
              status: newRecord.status || 'new',
              lastActive: 'Just now',
              summary: 'New active conversation started...',
              messages: [],
            };

            // Prepend new lead to top of list & trigger toast
            setLeads((prev) => [incomingLead, ...prev]);
            setNewLeadNotification(`New lead captured: ${newRecord.email || 'Anonymous Visitor'}`);

            // Clear toast notification after 4 seconds
            setTimeout(() => setNewLeadNotification(null), 4000);

          } else if (payload.eventType === 'UPDATE') {
            const updatedRecord = payload.new;

            // Dynamically update lead details (e.g. updated intent score or email)
            setLeads((prev) =>
              prev.map((lead) => {
                if (lead.id === updatedRecord.id) {
                  const updatedLead = {
                    ...lead,
                    email: updatedRecord.email || lead.email,
                    name: updatedRecord.name || lead.name,
                    company: updatedRecord.company_name || lead.company,
                    intentScore: updatedRecord.intent_score ?? lead.intentScore,
                    status: updatedRecord.status || lead.status,
                    lastActive: 'Just now',
                  };

                  // If currently inspecting this lead, update selected view in real-time
                  if (selectedLead?.id === updatedRecord.id) {
                    setSelectedLead(updatedLead);
                  }

                  return updatedLead;
                }
                return lead;
              })
            );
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [DEMO_ORG_ID]);

  const getIntentBadge = (score: number) => {
    if (score >= 75) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const filteredLeads = leads.filter((lead) =>
    (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
    lead.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans relative">

      {/* REALTIME TOAST NOTIFICATION */}
      {newLeadNotification && (
        <div className="absolute top-4 right-4 z-50 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm animate-bounce">
          <Bell className="w-4 h-4 text-indigo-200" />
          <span>{newLeadNotification}</span>
        </div>
      )}

      {/* LEFT PANEL: Leads List & Filters */}
      <div className="w-5/12 border-r border-slate-200 flex flex-col bg-white">

        {/* Header */}
        <div className="p-5 border-b border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Live Leads</h1>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            <button
              onClick={loadData}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by email, company, or text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Lead Scroll List */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span>Connecting to Supabase Realtime...</span>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            No active leads found.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredLeads.map((lead) => {
              const isSelected = selectedLead?.id === lead.id;
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`p-4 cursor-pointer transition-colors relative ${
                    isSelected ? 'bg-indigo-50/60 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="font-semibold text-sm text-slate-900 truncate max-w-[200px]">
                      {lead.email || 'Anonymous Visitor'}
                    </div>

                    <div className={`px-2 py-0.5 rounded text-xs font-bold border ${getIntentBadge(lead.intentScore)} flex items-center gap-1`}>
                      <TrendingUp className="w-3 h-3" />
                      {lead.intentScore}/100
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 mb-2 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {lead.company || 'Unknown Company'}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-600 font-medium">{lead.lastActive}</span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {lead.summary}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Selected Lead Inspection */}
      {selectedLead ? (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
          <div className="bg-white p-6 border-b border-slate-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedLead.name || selectedLead.email || 'Anonymous Visitor'}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getIntentBadge(selectedLead.intentScore)}`}>
                  Intent Score: {selectedLead.intentScore}%
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {selectedLead.email || 'No email captured'}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {selectedLead.company || 'No company metadata'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                <Bot className="w-4 h-4" />
                AI Session Summary
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                {selectedLead.summary}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                Transcript
              </h3>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                {selectedLead.messages.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No messages recorded in this stream yet.</p>
                ) : (
                  selectedLead.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'assistant' && (
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-slate-100 text-slate-800 rounded-bl-none'
                      }`}>
                        <p>{msg.content}</p>
                        <span className={`text-[10px] block mt-1 text-right ${
                          msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'
                        }`}>
                          {msg.timestamp}
                        </span>
                      </div>

                      {msg.sender === 'user' && (
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Select a lead to inspect transcripts
        </div>
      )}

    </div>
  );
}
