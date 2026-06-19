'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Lead = {
  id: string;
  classification: string;
  urgency: string;
  status: string;
  ai_summary: string;
  source_page: string;
  created_at: string;
  contacts: { name: string; email: string } | null;
};

const classConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  quote_request:     { label: 'Quote Request',   color: 'text-blue-300',   bg: 'bg-blue-500/15',   border: 'border-blue-500/30' },
  booking_request:   { label: 'Booking',         color: 'text-purple-300', bg: 'bg-purple-500/15', border: 'border-purple-500/30' },
  existing_customer: { label: 'Existing Client', color: 'text-amber-300',  bg: 'bg-amber-500/15',  border: 'border-amber-500/30' },
  spam:              { label: 'Spam',            color: 'text-slate-400',  bg: 'bg-slate-500/15',  border: 'border-slate-500/30' },
  general_enquiry:   { label: 'General Enquiry', color: 'text-cyan-300',   bg: 'bg-cyan-500/15',   border: 'border-cyan-500/30' },
};

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  new:      { label: 'New',      color: 'text-emerald-400', dot: 'bg-emerald-400' },
  reviewed: { label: 'Reviewed', color: 'text-yellow-400',  dot: 'bg-yellow-400' },
  approved: { label: 'Approved', color: 'text-blue-400',    dot: 'bg-blue-400' },
  sent:     { label: 'Sent',     color: 'text-slate-400',   dot: 'bg-slate-400' },
  rejected: { label: 'Rejected', color: 'text-red-400',     dot: 'bg-red-400' },
};

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function avatarColor(name: string) {
  const colors = ['bg-cyan-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function ListIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  );
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState<'list' | 'gallery'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('inbox-view') as 'list' | 'gallery') || 'list';
    }
    return 'list';
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchLeads(); }, []);

  function setViewMode(v: 'list' | 'gallery') {
    setView(v);
    localStorage.setItem('inbox-view', v);
  }

  async function fetchLeads() {
    const { data } = await supabase
      .from('leads')
      .select('*, contacts(name, email)')
      .order('created_at', { ascending: false });
    setLeads(data || []);
    setLoading(false);
    setRefreshing(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchLeads();
  }

  const filtered = filter === 'all'
    ? leads
    : filter === 'new'
    ? leads.filter(l => l.status === 'new')
    : leads.filter(l => l.urgency === 'urgent');

  const newCount = leads.filter(l => l.status === 'new').length;
  const urgentCount = leads.filter(l => l.urgency === 'urgent').length;
  const sentCount = leads.filter(l => l.status === 'sent').length;

  const skeletonList = (
    <div className="space-y-2">
      {[1,2,3,4].map(i => (
        <div key={i} className="bg-[#0d1420] border border-white/8 rounded-2xl p-5 animate-pulse">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/10 rounded w-1/3" />
              <div className="h-3 bg-white/5 rounded w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const skeletonGallery = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="bg-[#0d1420] border border-white/8 rounded-2xl p-5 h-44 animate-pulse" />
      ))}
    </div>
  );

  const empty = (
    <div className="text-center py-20 text-slate-600">
      <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="text-sm">No leads found</p>
    </div>
  );

  return (
    <div className="text-white">
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-5">
            <div className="text-3xl font-bold text-white mb-1">{leads.length}</div>
            <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Total Leads</div>
          </div>
          <div className="bg-[#0d1420] border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -translate-y-4 translate-x-4" />
            <div className="text-3xl font-bold text-emerald-400 mb-1">{newCount}</div>
            <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Needs Review</div>
          </div>
          <div className="bg-[#0d1420] border border-red-500/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full -translate-y-4 translate-x-4" />
            <div className="text-3xl font-bold text-red-400 mb-1">{urgentCount}</div>
            <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Urgent</div>
          </div>
          <div className="bg-[#0d1420] border border-blue-500/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -translate-y-4 translate-x-4" />
            <div className="text-3xl font-bold text-blue-400 mb-1">{sentCount}</div>
            <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Replied</div>
          </div>
        </div>

        {/* Filters + view toggle */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-2">
            {[
              { key: 'all',    label: 'All leads' },
              { key: 'new',    label: `New (${newCount})` },
              { key: 'urgent', label: `Urgent (${urgentCount})` },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filter === f.key
                    ? 'bg-cyan-400 text-[#080c14] shadow-lg shadow-cyan-400/20'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-600 text-xs">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            {/* View toggle */}
            <div className="flex items-center bg-white/5 border border-white/8 rounded-xl p-1 gap-0.5">
              <button
                onClick={() => setViewMode('list')}
                title="List view"
                className={`p-1.5 rounded-lg transition-all ${
                  view === 'list'
                    ? 'bg-white/10 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <ListIcon />
              </button>
              <button
                onClick={() => setViewMode('gallery')}
                title="Gallery view"
                className={`p-1.5 rounded-lg transition-all ${
                  view === 'gallery'
                    ? 'bg-white/10 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <GridIcon />
              </button>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-slate-500 hover:text-white transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Leads */}
        {loading ? (
          view === 'list' ? skeletonList : skeletonGallery
        ) : filtered.length === 0 ? empty : view === 'list' ? (
          /* ── LIST VIEW ── */
          <div className="space-y-2">
            {filtered.map(lead => {
              const name = lead.contacts?.name || 'Unknown';
              const cls = classConfig[lead.classification] || classConfig.general_enquiry;
              const sts = statusConfig[lead.status] || statusConfig.new;
              return (
                <Link
                  key={lead.id}
                  href={`/dashboard/${lead.id}`}
                  className="flex items-center gap-4 bg-[#0d1420] border border-white/8 hover:border-cyan-400/25 hover:bg-[#0f1825] rounded-2xl p-5 transition-all group"
                >
                  <div className={`w-10 h-10 rounded-full ${avatarColor(name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {initials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white text-sm">{name}</span>
                      <span className="text-slate-500 text-xs hidden sm:block">{lead.contacts?.email}</span>
                      {lead.urgency === 'urgent' && (
                        <span className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">URGENT</span>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs line-clamp-1">{lead.ai_summary}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${cls.color} ${cls.bg} ${cls.border} hidden md:block`}>
                      {cls.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${sts.dot}`} />
                      <span className={`text-xs font-medium ${sts.color}`}>{sts.label}</span>
                    </div>
                    <span className="text-slate-600 text-xs hidden lg:block">
                      {new Date(lead.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}
                    </span>
                    <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* ── GALLERY VIEW ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(lead => {
              const name = lead.contacts?.name || 'Unknown';
              const cls = classConfig[lead.classification] || classConfig.general_enquiry;
              const sts = statusConfig[lead.status] || statusConfig.new;
              return (
                <Link
                  key={lead.id}
                  href={`/dashboard/${lead.id}`}
                  className="flex flex-col bg-[#0d1420] border border-white/8 hover:border-cyan-400/25 hover:bg-[#0f1825] rounded-2xl p-5 transition-all group"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${avatarColor(name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {initials(name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{name}</p>
                        <p className="text-slate-500 text-xs truncate">{lead.contacts?.email || '—'}</p>
                      </div>
                    </div>
                    {lead.urgency === 'urgent' && (
                      <span className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full shrink-0 ml-2">!</span>
                    )}
                  </div>

                  {/* Summary */}
                  <p className="text-slate-400 text-xs leading-relaxed line-clamp-3 flex-1 mb-4">{lead.ai_summary}</p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${cls.color} ${cls.bg} ${cls.border}`}>
                      {cls.label}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${sts.dot}`} />
                        <span className={`text-xs ${sts.color}`}>{sts.label}</span>
                      </div>
                      <span className="text-slate-600 text-xs">
                        {new Date(lead.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
