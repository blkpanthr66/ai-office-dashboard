'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  created_at: string;
  leads: { id: string; status: string }[];
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

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'gallery'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('view-contacts') as 'list' | 'gallery') || 'list';
    }
    return 'list';
  });

  useEffect(() => { fetchContacts(); }, []);

  function setViewMode(v: 'list' | 'gallery') {
    setView(v);
    localStorage.setItem('view-contacts', v);
  }

  async function fetchContacts() {
    const { data } = await supabase
      .from('contacts')
      .select('*, leads(id, status)')
      .order('created_at', { ascending: false });
    setContacts(data || []);
    setLoading(false);
  }

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.business_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-white font-semibold text-lg">Contacts</h1>
          <p className="text-slate-500 text-xs mt-0.5">{contacts.length} total contacts</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <svg className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-[#0d1420] border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 w-52"
            />
          </div>
          {/* View toggle */}
          <div className="flex items-center bg-white/5 border border-white/8 rounded-xl p-1 gap-0.5">
            <button onClick={() => setViewMode('list')} title="List view"
              className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button onClick={() => setViewMode('gallery')} title="Gallery view"
              className={`p-1.5 rounded-lg transition-all ${view === 'gallery' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        view === 'list' ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="bg-[#0d1420] border border-white/8 rounded-2xl p-5 animate-pulse h-20" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="bg-[#0d1420] border border-white/8 rounded-2xl h-40 animate-pulse" />)}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-600 text-sm">No contacts found</div>
      ) : view === 'list' ? (
        /* ── LIST VIEW ── */
        <div className="space-y-2">
          {filtered.map(contact => {
            const leadCount = contact.leads?.length || 0;
            const wonCount = contact.leads?.filter(l => l.status === 'won').length || 0;
            return (
              <Link key={contact.id} href={`/dashboard/contacts/${contact.id}`}
                className="flex items-center gap-4 bg-[#0d1420] border border-white/8 hover:border-cyan-400/25 hover:bg-[#0f1825] rounded-2xl p-5 transition-all group">
                <div className={`w-11 h-11 rounded-full ${avatarColor(contact.name)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                  {initials(contact.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white font-semibold text-sm">{contact.name}</span>
                    {contact.business_name && (
                      <span className="text-slate-600 text-xs">· {contact.business_name}</span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs">{contact.email}{contact.phone ? ` · ${contact.phone}` : ''}</p>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-center hidden sm:block">
                    <div className="text-white text-sm font-semibold">{leadCount}</div>
                    <div className="text-slate-600 text-xs">Lead{leadCount !== 1 ? 's' : ''}</div>
                  </div>
                  {wonCount > 0 && (
                    <div className="text-center hidden sm:block">
                      <div className="text-cyan-400 text-sm font-semibold">{wonCount}</div>
                      <div className="text-slate-600 text-xs">Won</div>
                    </div>
                  )}
                  <div className="text-slate-600 text-xs hidden md:block">
                    {new Date(contact.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
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
          {filtered.map(contact => {
            const leadCount = contact.leads?.length || 0;
            const wonCount = contact.leads?.filter(l => l.status === 'won').length || 0;
            return (
              <Link key={contact.id} href={`/dashboard/contacts/${contact.id}`}
                className="flex flex-col bg-[#0d1420] border border-white/8 hover:border-cyan-400/25 hover:bg-[#0f1825] rounded-2xl p-5 transition-all group">
                {/* Avatar + name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full ${avatarColor(contact.name)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {initials(contact.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{contact.name}</p>
                    {contact.business_name && (
                      <p className="text-slate-500 text-xs truncate">{contact.business_name}</p>
                    )}
                  </div>
                </div>
                {/* Contact info */}
                <div className="space-y-1 mb-4 flex-1">
                  <p className="text-slate-500 text-xs truncate">{contact.email}</p>
                  {contact.phone && <p className="text-slate-600 text-xs">{contact.phone}</p>}
                </div>
                {/* Footer stats */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-white text-sm font-semibold">{leadCount}</span>
                      <span className="text-slate-600 text-xs ml-1">lead{leadCount !== 1 ? 's' : ''}</span>
                    </div>
                    {wonCount > 0 && (
                      <div>
                        <span className="text-cyan-400 text-sm font-semibold">{wonCount}</span>
                        <span className="text-slate-600 text-xs ml-1">won</span>
                      </div>
                    )}
                  </div>
                  <span className="text-slate-700 text-xs">
                    {new Date(contact.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
