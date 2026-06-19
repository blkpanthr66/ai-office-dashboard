'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Template = {
  id: string;
  name: string;
  classification: string;
  body: string;
  created_at: string;
};

const CLASSIFICATIONS = [
  { value: 'quote_request',     label: 'Quote Request' },
  { value: 'booking_request',   label: 'Booking Request' },
  { value: 'general_enquiry',   label: 'General Enquiry' },
  { value: 'existing_customer', label: 'Existing Client / Complaint' },
];

const classColor: Record<string, string> = {
  quote_request:     'text-blue-300 bg-blue-500/15 border-blue-500/30',
  booking_request:   'text-purple-300 bg-purple-500/15 border-purple-500/30',
  general_enquiry:   'text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
  existing_customer: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
};

const empty = { name: '', classification: 'quote_request', body: '' };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Template | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchTemplates(); }, []);

  async function fetchTemplates() {
    const { data } = await supabase.from('proposal_templates').select('*').order('classification').order('name');
    setTemplates(data || []);
    setLoading(false);
  }

  function openNew() {
    setSelected(null);
    setForm(empty);
    setShowForm(true);
  }

  function openEdit(t: Template) {
    setSelected(t);
    setForm({ name: t.name, classification: t.classification, body: t.body });
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim() || !form.body.trim()) return;
    setSaving(true);
    if (selected) {
      const { data } = await supabase.from('proposal_templates').update({ name: form.name, classification: form.classification, body: form.body, updated_at: new Date().toISOString() }).eq('id', selected.id).select().single();
      if (data) setTemplates(prev => prev.map(t => t.id === selected.id ? data : t));
    } else {
      const { data } = await supabase.from('proposal_templates').insert({ name: form.name, classification: form.classification, body: form.body }).select().single();
      if (data) setTemplates(prev => [...prev, data]);
    }
    setShowForm(false);
    setSaving(false);
  }

  async function deleteTemplate(id: string) {
    await supabase.from('proposal_templates').delete().eq('id', id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (selected?.id === id) setShowForm(false);
  }

  const grouped = CLASSIFICATIONS.map(c => ({
    ...c,
    templates: templates.filter(t => t.classification === c.value),
  }));

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-semibold text-lg">Proposal Templates</h1>
          <p className="text-slate-500 text-xs mt-0.5">Pre-written replies Claude uses as starting points. Use {'{{name}}'} to insert the contact's name.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/20 px-4 py-2 rounded-xl transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          New Template
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-[#0d1420] border border-white/8 rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.value}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${classColor[group.value]}`}>{group.label}</span>
                <span className="text-slate-700 text-xs">{group.templates.length} template{group.templates.length !== 1 ? 's' : ''}</span>
              </div>
              {group.templates.length === 0 ? (
                <div className="text-slate-700 text-xs py-3 pl-2">No templates yet for this type</div>
              ) : (
                <div className="space-y-2">
                  {group.templates.map(t => (
                    <div key={t.id} className="bg-[#0d1420] border border-white/8 hover:border-white/15 rounded-xl p-4 group transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium mb-1">{t.name}</p>
                          <p className="text-slate-600 text-xs line-clamp-2">{t.body}</p>
                        </div>
                        <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(t)} className="text-slate-500 hover:text-white text-xs transition-colors">Edit</button>
                          <button onClick={() => deleteTemplate(t.id)} className="text-slate-600 hover:text-red-400 text-xs transition-colors">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Template form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d1420] border border-white/10 rounded-2xl p-6 w-full max-w-2xl my-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">{selected ? 'Edit Template' : 'New Template'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Template Name</label>
                <input type="text" placeholder="e.g. Quote Request — Website Build" value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Lead Type</label>
                <select value={form.classification} onChange={e => setForm((p: any) => ({ ...p, classification: e.target.value }))}
                  className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50">
                  {CLASSIFICATIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-slate-500">Template Body</label>
                  <span className="text-xs text-slate-600">Use {'{{name}}'} for contact name</span>
                </div>
                <textarea value={form.body} onChange={e => setForm((p: any) => ({ ...p, body: e.target.value }))} rows={14}
                  placeholder="Hi {{name}},&#10;&#10;Thank you for reaching out..."
                  className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50 resize-y font-mono leading-relaxed" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={save} disabled={saving || !form.name.trim() || !form.body.trim()}
                className="flex-1 bg-cyan-400 hover:bg-cyan-300 text-[#080c14] font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-40">
                {saving ? 'Saving...' : selected ? 'Save Changes' : 'Create Template'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-6 bg-white/5 hover:bg-white/10 text-slate-400 py-3 rounded-xl text-sm transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
