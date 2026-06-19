'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Service = {
  id: string;
  service_name: string;
  plan_tier: string;
  mrr: number;
  start_date: string | null;
  renewal_date: string | null;
  status: string;
  contact_id: string;
  contacts: { id: string; name: string; email: string; business_name: string | null } | null;
};

const tierColor: Record<string, string> = {
  Starter: 'text-slate-300 bg-slate-500/15 border-slate-500/30',
  Growth:  'text-blue-300 bg-blue-500/15 border-blue-500/30',
  Pro:     'text-purple-300 bg-purple-500/15 border-purple-500/30',
  Enterprise: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
};

const statusColor: Record<string, { text: string; dot: string }> = {
  active:  { text: 'text-emerald-400', dot: 'bg-emerald-400' },
  paused:  { text: 'text-yellow-400',  dot: 'bg-yellow-400' },
  churned: { text: 'text-red-400',     dot: 'bg-red-400' },
};

function avatarColor(name: string) {
  const colors = ['bg-cyan-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function daysUntil(date: string) {
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function ClientsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');

  useEffect(() => { fetchServices(); }, []);

  async function fetchServices() {
    const { data } = await supabase
      .from('client_services')
      .select('*, contacts(id, name, email, business_name)')
      .order('created_at', { ascending: false });
    setServices(data || []);
    setLoading(false);
  }

  const filtered = services.filter(s =>
    statusFilter === 'all' ? true : s.status === statusFilter
  );

  const totalMRR = services.filter(s => s.status === 'active').reduce((sum, s) => sum + (s.mrr || 0), 0);
  const activeCount = services.filter(s => s.status === 'active').length;
  const renewingSoon = services.filter(s => s.renewal_date && daysUntil(s.renewal_date) <= 30 && s.status === 'active').length;
  const arr = totalMRR * 12;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-semibold text-lg">Clients</h1>
          <p className="text-slate-500 text-xs mt-0.5">Manage active services and plans</p>
        </div>
      </div>

      {/* Revenue stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0d1420] border border-cyan-500/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full -translate-y-4 translate-x-4" />
          <div className="text-2xl font-bold text-cyan-400 mb-1">${totalMRR.toLocaleString()}</div>
          <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Monthly Revenue</div>
        </div>
        <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-5">
          <div className="text-2xl font-bold text-white mb-1">${arr.toLocaleString()}</div>
          <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Annual Revenue</div>
        </div>
        <div className="bg-[#0d1420] border border-emerald-500/20 rounded-2xl p-5">
          <div className="text-2xl font-bold text-emerald-400 mb-1">{activeCount}</div>
          <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Active Services</div>
        </div>
        <div className="bg-[#0d1420] border border-amber-500/20 rounded-2xl p-5">
          <div className="text-2xl font-bold text-amber-400 mb-1">{renewingSoon}</div>
          <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Renewing Soon</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {['active', 'paused', 'churned', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
              statusFilter === f
                ? 'bg-cyan-400 text-[#080c14] shadow-lg shadow-cyan-400/20'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-slate-600 text-xs self-center">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Services list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="bg-[#0d1420] border border-white/8 rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-600 text-sm">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          No {statusFilter !== 'all' ? statusFilter : ''} services found.<br />
          <span className="text-xs">Add services from a contact profile.</span>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(service => {
            const name = service.contacts?.name || 'Unknown';
            const st = statusColor[service.status] || statusColor.active;
            const tier = tierColor[service.plan_tier] || tierColor.Starter;
            const days = service.renewal_date ? daysUntil(service.renewal_date) : null;
            return (
              <Link
                key={service.id}
                href={`/dashboard/contacts/${service.contact_id}`}
                className="flex items-center gap-4 bg-[#0d1420] border border-white/8 hover:border-cyan-400/25 hover:bg-[#0f1825] rounded-2xl p-5 transition-all group"
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full ${avatarColor(name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {initials(name)}
                </div>

                {/* Contact + service info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white font-semibold text-sm">{name}</span>
                    {service.contacts?.business_name && (
                      <span className="text-slate-600 text-xs hidden sm:block">· {service.contacts.business_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400 text-xs">{service.service_name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${tier}`}>
                      {service.plan_tier}
                    </span>
                  </div>
                </div>

                {/* MRR + renewal + status */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-white font-semibold text-sm">${(service.mrr || 0).toLocaleString()}<span className="text-slate-600 text-xs font-normal">/mo</span></div>
                    <div className="text-slate-600 text-xs">${((service.mrr || 0) * 12).toLocaleString()}/yr</div>
                  </div>
                  {days !== null && (
                    <div className="text-right hidden md:block">
                      <div className={`text-xs font-medium ${days <= 14 ? 'text-amber-400' : days <= 30 ? 'text-yellow-400' : 'text-slate-500'}`}>
                        {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                      </div>
                      <div className="text-slate-700 text-xs">renewal</div>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    <span className={`text-xs font-medium capitalize ${st.text}`}>{service.status}</span>
                  </div>
                  <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
