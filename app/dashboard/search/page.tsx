'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Result = {
  type: 'contact' | 'lead';
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  href: string;
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

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function doSearch(q: string) {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);

    const [contactsRes, leadsRes] = await Promise.all([
      supabase.from('contacts').select('id, name, email, business_name').or(`name.ilike.%${q}%,email.ilike.%${q}%,business_name.ilike.%${q}%`).limit(10),
      supabase.from('leads').select('id, ai_summary, classification, status, contacts(name)').or(`ai_summary.ilike.%${q}%,raw_message.ilike.%${q}%,classification.ilike.%${q}%`).limit(10),
    ]);

    const contactResults: Result[] = (contactsRes.data || []).map(c => ({
      type: 'contact',
      id: c.id,
      title: c.name,
      subtitle: c.email,
      meta: c.business_name,
      href: `/dashboard/contacts/${c.id}`,
    }));

    const leadResults: Result[] = (leadsRes.data || []).map((l: any) => ({
      type: 'lead',
      id: l.id,
      title: l.contacts?.name || 'Unknown',
      subtitle: l.ai_summary || '',
      meta: l.classification?.replace(/_/g, ' '),
      href: `/dashboard/${l.id}`,
    }));

    setResults([...contactResults, ...leadResults]);
    setLoading(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    const t = setTimeout(() => doSearch(val), 300);
    return () => clearTimeout(t);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-white font-semibold text-lg mb-6">Search</h1>

      {/* Search input */}
      <div className="relative mb-8">
        <svg className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          autoFocus
          placeholder="Search contacts, leads, messages..."
          value={query}
          onChange={handleChange}
          className="w-full bg-[#0d1420] border border-white/8 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-600 focus:outline-none text-sm transition-all"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
        )}
      </div>

      {/* Results */}
      {!searched && (
        <div className="text-center text-slate-700 text-sm py-8">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Type to search across contacts and leads
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="text-center text-slate-600 text-sm py-8">No results for "{query}"</div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.filter(r => r.type === 'contact').length > 0 && (
            <>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-1 mb-2">Contacts</p>
              {results.filter(r => r.type === 'contact').map(r => (
                <Link
                  key={r.id}
                  href={r.href}
                  className="flex items-center gap-3 bg-[#0d1420] border border-white/8 hover:border-cyan-400/25 rounded-xl p-4 transition-all group"
                >
                  <div className={`w-9 h-9 rounded-full ${avatarColor(r.title)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {initials(r.title)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{r.title}</p>
                    <p className="text-slate-500 text-xs truncate">{r.subtitle}{r.meta ? ` · ${r.meta}` : ''}</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </>
          )}

          {results.filter(r => r.type === 'lead').length > 0 && (
            <>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-1 mt-5 mb-2">Leads</p>
              {results.filter(r => r.type === 'lead').map(r => (
                <Link
                  key={r.id}
                  href={r.href}
                  className="flex items-center gap-3 bg-[#0d1420] border border-white/8 hover:border-cyan-400/25 rounded-xl p-4 transition-all group"
                >
                  <div className={`w-9 h-9 rounded-full ${avatarColor(r.title)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {initials(r.title)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white text-sm font-medium">{r.title}</p>
                      {r.meta && <span className="text-xs text-slate-600 capitalize">{r.meta}</span>}
                    </div>
                    <p className="text-slate-500 text-xs line-clamp-1">{r.subtitle}</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
