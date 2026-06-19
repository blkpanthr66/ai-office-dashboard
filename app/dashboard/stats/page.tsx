'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Stats = {
  totalLeads: number;
  leadsThisWeek: number;
  leadsLastWeek: number;
  newLeads: number;
  urgentLeads: number;
  sentLeads: number;
  totalMRR: number;
  totalContacts: number;
  activeClients: number;
  conversionRate: number;
  byClassification: Record<string, number>;
  bySource: Record<string, number>;
  recentLeads: any[];
};

const classLabels: Record<string, string> = {
  quote_request: 'Quotes',
  booking_request: 'Bookings',
  general_enquiry: 'Enquiries',
  existing_customer: 'Existing Clients',
  spam: 'Spam',
  urgent: 'Urgent',
};

const classColors: Record<string, string> = {
  quote_request: 'bg-blue-400',
  booking_request: 'bg-purple-400',
  general_enquiry: 'bg-cyan-400',
  existing_customer: 'bg-amber-400',
  spam: 'bg-slate-500',
  urgent: 'bg-red-400',
};

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  async function fetchStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [leadsRes, servicesRes, contactsRes] = await Promise.all([
      supabase.from('leads').select('*, contacts(name, email)').order('created_at', { ascending: false }),
      supabase.from('client_services').select('mrr, status'),
      supabase.from('contacts').select('id', { count: 'exact' }),
    ]);

    const leads = leadsRes.data || [];
    const services = servicesRes.data || [];

    const leadsThisWeek = leads.filter(l => l.created_at >= weekAgo).length;
    const leadsLastWeek = leads.filter(l => l.created_at >= twoWeeksAgo && l.created_at < weekAgo).length;
    const totalMRR = services.filter(s => s.status === 'active').reduce((sum, s) => sum + (s.mrr || 0), 0);
    const activeClients = services.filter(s => s.status === 'active').length;

    const byClassification: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    leads.forEach(l => {
      byClassification[l.classification] = (byClassification[l.classification] || 0) + 1;
      const src = l.source_page || 'unknown';
      bySource[src] = (bySource[src] || 0) + 1;
    });

    const sentCount = leads.filter(l => l.status === 'sent' || l.status === 'won').length;
    const nonSpam = leads.filter(l => l.classification !== 'spam').length;
    const conversionRate = nonSpam > 0 ? Math.round((sentCount / nonSpam) * 100) : 0;

    setStats({
      totalLeads: leads.length,
      leadsThisWeek,
      leadsLastWeek,
      newLeads: leads.filter(l => l.status === 'new').length,
      urgentLeads: leads.filter(l => l.urgency === 'urgent').length,
      sentLeads: sentCount,
      totalMRR,
      totalContacts: contactsRes.count || 0,
      activeClients,
      conversionRate,
      byClassification,
      bySource,
      recentLeads: leads.slice(0, 5),
    });
    setLoading(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
    </div>
  );

  if (!stats) return null;

  const weekChange = stats.leadsLastWeek > 0
    ? Math.round(((stats.leadsThisWeek - stats.leadsLastWeek) / stats.leadsLastWeek) * 100)
    : null;

  const topSource = Object.entries(stats.bySource).sort((a, b) => b[1] - a[1])[0];
  const maxClass = Math.max(...Object.values(stats.byClassification));
  const maxSource = Math.max(...Object.values(stats.bySource));

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white font-semibold text-lg">Overview</h1>
          <p className="text-slate-500 text-xs mt-0.5">Your business at a glance</p>
        </div>
        <button onClick={fetchStats} className="text-slate-500 hover:text-white text-xs transition-colors flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#0d1420] border border-cyan-500/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-full -translate-y-6 translate-x-6" />
          <div className="text-3xl font-bold text-cyan-400 mb-1">${stats.totalMRR.toLocaleString()}</div>
          <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Monthly Revenue</div>
          <div className="text-slate-600 text-xs mt-1">${(stats.totalMRR * 12).toLocaleString()} / year</div>
        </div>
        <div className="bg-[#0d1420] border border-emerald-500/20 rounded-2xl p-5">
          <div className="text-3xl font-bold text-white mb-1">{stats.activeClients}</div>
          <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Active Clients</div>
          <div className="text-slate-600 text-xs mt-1">{stats.totalContacts} total contacts</div>
        </div>
        <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-5">
          <div className="flex items-end gap-2 mb-1">
            <div className="text-3xl font-bold text-white">{stats.leadsThisWeek}</div>
            {weekChange !== null && (
              <div className={`text-xs font-semibold mb-1 ${weekChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {weekChange >= 0 ? '↑' : '↓'} {Math.abs(weekChange)}%
              </div>
            )}
          </div>
          <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Leads This Week</div>
          <div className="text-slate-600 text-xs mt-1">{stats.leadsLastWeek} last week</div>
        </div>
        <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-5">
          <div className="text-3xl font-bold text-white mb-1">{stats.conversionRate}%</div>
          <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Reply Rate</div>
          <div className="text-slate-600 text-xs mt-1">{stats.sentLeads} of {stats.totalLeads} leads replied</div>
        </div>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0d1420] border border-emerald-500/15 rounded-xl p-4">
          <div className="text-xl font-bold text-emerald-400">{stats.newLeads}</div>
          <div className="text-slate-600 text-xs mt-0.5">Needs Review</div>
        </div>
        <div className="bg-[#0d1420] border border-red-500/15 rounded-xl p-4">
          <div className="text-xl font-bold text-red-400">{stats.urgentLeads}</div>
          <div className="text-slate-600 text-xs mt-0.5">Urgent</div>
        </div>
        <div className="bg-[#0d1420] border border-white/8 rounded-xl p-4">
          <div className="text-xl font-bold text-white">{stats.totalLeads}</div>
          <div className="text-slate-600 text-xs mt-0.5">Total Leads</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Lead breakdown by type */}
        <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-5">Leads by Type</h2>
          <div className="space-y-3">
            {Object.entries(stats.byClassification)
              .sort((a, b) => b[1] - a[1])
              .map(([cls, count]) => (
                <div key={cls}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-300 text-sm">{classLabels[cls] || cls}</span>
                    <span className="text-slate-500 text-xs font-medium">{count}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${classColors[cls] || 'bg-slate-400'}`}
                      style={{ width: `${(count / maxClass) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Lead source tracking */}
        <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-5">Lead Sources</h2>
          {Object.keys(stats.bySource).length === 0 ? (
            <p className="text-slate-700 text-sm text-center py-8">No source data yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.bySource)
                .sort((a, b) => b[1] - a[1])
                .map(([src, count]) => (
                  <div key={src}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-slate-300 text-sm">/{src}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">{Math.round((count / stats.totalLeads) * 100)}%</span>
                        <span className="text-slate-500 text-xs font-medium">{count}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-400 transition-all"
                        style={{ width: `${(count / maxSource) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
          {topSource && (
            <p className="text-slate-600 text-xs mt-4 pt-4 border-t border-white/5">
              Top source: <span className="text-cyan-400">/{topSource[0]}</span> with {topSource[1]} leads
            </p>
          )}
        </div>
      </div>

      {/* Recent leads */}
      <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest">Recent Leads</h2>
          <Link href="/dashboard" className="text-cyan-400 hover:text-cyan-300 text-xs transition-colors">View all →</Link>
        </div>
        <div className="space-y-2">
          {stats.recentLeads.map(lead => (
            <Link key={lead.id} href={`/dashboard/${lead.id}`}
              className="flex items-center gap-3 hover:bg-white/3 rounded-xl p-2 -mx-2 transition-colors group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium">{lead.contacts?.name || 'Unknown'}</span>
                  {lead.urgency === 'urgent' && <span className="text-xs text-red-400 font-bold">URGENT</span>}
                </div>
                <p className="text-slate-600 text-xs truncate">{lead.ai_summary}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-slate-600 text-xs">{new Date(lead.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}</span>
                <svg className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
