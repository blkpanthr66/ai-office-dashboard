'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type ServiceType = { id: string; name: string };

export default function SettingsPage() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [newType, setNewType] = useState('');
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    fetchServiceTypes();
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle('light-mode', saved === 'light');
    }
  }, []);

  async function fetchServiceTypes() {
    const { data } = await supabase.from('service_types').select('*').order('name');
    setServiceTypes(data || []);
    setLoadingTypes(false);
  }

  async function addServiceType() {
    const name = newType.trim();
    if (!name) return;
    const { data } = await supabase.from('service_types').insert({ name }).select().single();
    if (data) setServiceTypes(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewType('');
  }

  async function deleteServiceType(id: string) {
    await supabase.from('service_types').delete().eq('id', id);
    setServiceTypes(prev => prev.filter(s => s.id !== id));
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('light-mode', next === 'light');
  }

  async function exportCSV(type: 'contacts' | 'leads') {
    setExporting(type);
    let rows: any[] = [];
    let headers: string[] = [];

    if (type === 'contacts') {
      const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
      rows = data || [];
      headers = ['Name', 'Email', 'Mobile', 'Business Name', 'Business Email', 'Business Phone', 'Website', 'Industry', 'Address', 'How Found', 'Tags', 'Created'];
      rows = rows.map(r => [
        r.name, r.email, r.mobile || '', r.business_name || '', r.business_email || '',
        r.business_phone || r.phone || '', r.website || '', r.industry || '',
        r.business_address || '', r.how_found || '',
        (r.tags || []).join('; '),
        new Date(r.created_at).toLocaleDateString('en-NZ'),
      ]);
    } else {
      const { data } = await supabase.from('leads').select('*, contacts(name, email)').order('created_at', { ascending: false });
      rows = data || [];
      headers = ['Contact', 'Email', 'Classification', 'Status', 'Urgency', 'Deal Value', 'Summary', 'Source', 'Created'];
      rows = rows.map(r => [
        r.contacts?.name || '', r.contacts?.email || '',
        r.classification, r.status, r.urgency,
        r.deal_value ? `$${r.deal_value}` : '',
        r.ai_summary || '', r.source_page || '',
        new Date(r.created_at).toLocaleDateString('en-NZ'),
      ]);
    }

    const csv = [headers, ...rows].map(row =>
      row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pinpoint-${type}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-white font-semibold text-lg">Settings</h1>
        <p className="text-slate-500 text-xs mt-0.5">Manage your CRM preferences</p>
      </div>

      {/* Appearance */}
      <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-5">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Theme</p>
            <p className="text-slate-500 text-xs mt-0.5">Currently using {theme} mode</p>
          </div>
          <button onClick={toggleTheme}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            {theme === 'dark' ? (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>Switch to Light</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>Switch to Dark</>
            )}
          </button>
        </div>
      </div>

      {/* Export */}
      <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-5">Export Data</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => exportCSV('contacts')} disabled={exporting === 'contacts'}
            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 hover:text-white text-sm font-medium px-4 py-3 rounded-xl transition-colors disabled:opacity-40">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {exporting === 'contacts' ? 'Exporting...' : 'Export Contacts'}
          </button>
          <button onClick={() => exportCSV('leads')} disabled={exporting === 'leads'}
            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 hover:text-white text-sm font-medium px-4 py-3 rounded-xl transition-colors disabled:opacity-40">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {exporting === 'leads' ? 'Exporting...' : 'Export Leads'}
          </button>
        </div>
        <p className="text-slate-700 text-xs mt-3">Downloads a .csv file with all data. Opens in Excel or Google Sheets.</p>
      </div>

      {/* Custom service types */}
      <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-5">Service Types</h2>
        <p className="text-slate-600 text-xs mb-4">These appear in the Add Service dropdown on contact profiles.</p>
        {loadingTypes ? (
          <div className="text-slate-700 text-sm">Loading...</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {serviceTypes.map(s => (
                <div key={s.id} className="flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 group">
                  <span className="text-slate-300 text-sm">{s.name}</span>
                  <button onClick={() => deleteServiceType(s.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 ml-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Add custom service type..." value={newType}
                onChange={e => setNewType(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addServiceType(); }}}
                className="flex-1 bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50" />
              <button onClick={addServiceType} disabled={!newType.trim()}
                className="px-4 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/20 text-cyan-400 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40">
                Add
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
