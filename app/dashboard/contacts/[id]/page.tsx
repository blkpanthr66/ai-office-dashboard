'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Contact = {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  mobile: string | null;
  phone: string | null;
  business_name: string | null;
  business_address: string | null;
  business_phone: string | null;
  business_email: string | null;
  website: string | null;
  industry: string | null;
  preferred_contact: string | null;
  how_found: string | null;
  tags: string[] | null;
  interests: string | null;
  linkedin_url: string | null;
  source: string;
  created_at: string;
};

type Lead = {
  id: string;
  classification: string;
  ai_summary: string;
  status: string;
  created_at: string;
  deal_value: number | null;
};

type Note = { id: string; body: string; created_at: string };

type Service = {
  id: string;
  service_name: string;
  plan_tier: string;
  mrr: number;
  start_date: string | null;
  renewal_date: string | null;
  status: string;
  notes: string | null;
};

const INDUSTRY_OPTIONS = ['Restaurant / Café', 'Builder / Trades', 'Retail', 'Health & Wellness', 'Professional Services', 'Real Estate', 'Education', 'Hospitality', 'E-commerce', 'Non-profit', 'Other'];
const HOW_FOUND_OPTIONS = ['Google Search', 'Referral', 'Social Media', 'Cold Outreach', 'Event / Workshop', 'Website', 'Other'];
const CONTACT_PREF_OPTIONS = ['Email', 'Phone', 'Mobile / Text', 'LinkedIn'];
const SERVICE_OPTIONS = ['SEO', 'Website Build', 'AI Receptionist', 'Digital Marketing', 'Google Ads', 'Social Media', 'Consulting'];
const TIER_OPTIONS = ['Starter', 'Growth', 'Pro', 'Enterprise'];
const SERVICE_STATUS_OPTIONS = ['active', 'paused', 'churned'];

const statusColor: Record<string, string> = {
  new: 'text-emerald-400 bg-emerald-400/10',
  sent: 'text-blue-400 bg-blue-400/10',
  rejected: 'text-slate-500 bg-slate-500/10',
  won: 'text-cyan-400 bg-cyan-400/10',
  contacted: 'text-purple-400 bg-purple-400/10',
};

const tierColor: Record<string, string> = {
  Starter: 'text-slate-300 bg-slate-500/15 border-slate-500/30',
  Growth: 'text-blue-300 bg-blue-500/15 border-blue-500/30',
  Pro: 'text-purple-300 bg-purple-500/15 border-purple-500/30',
  Enterprise: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
};

const serviceStatusColor: Record<string, { text: string; dot: string }> = {
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

function Field({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-slate-600 mb-0.5">{label}</p>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">{value}</a>
      ) : (
        <p className="text-sm text-slate-300">{value}</p>
      )}
    </div>
  );
}

const emptyService = { service_name: 'SEO', plan_tier: 'Starter', mrr: '', start_date: '', renewal_date: '', status: 'active', notes: '' };

export default function ContactProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<Contact | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Notes
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Edit contact modal
  const [showEditContact, setShowEditContact] = useState(false);
  const [contactForm, setContactForm] = useState<any>({});
  const [savingContact, setSavingContact] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [confirmDeleteContact, setConfirmDeleteContact] = useState(false);
  const [confirmDeleteLead, setConfirmDeleteLead] = useState<Lead | null>(null);

  // Service modal
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState<any>(emptyService);
  const [savingService, setSavingService] = useState(false);

  useEffect(() => { fetchAll(); }, [id]);

  async function fetchAll() {
    const [contactRes, leadsRes, notesRes, servicesRes] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', id).single(),
      supabase.from('leads').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
      supabase.from('notes').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
      supabase.from('client_services').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
    ]);
    setContact(contactRes.data);
    setLeads(leadsRes.data || []);
    setNotes(notesRes.data || []);
    setServices(servicesRes.data || []);
    setLoading(false);
  }

  // Notes
  async function addNote() {
    if (!newNote.trim() || !contact) return;
    setSavingNote(true);
    const { data } = await supabase.from('notes').insert({ contact_id: contact.id, body: newNote.trim() }).select().single();
    if (data) setNotes(prev => [data, ...prev]);
    setNewNote('');
    setSavingNote(false);
  }

  async function deleteNote(noteId: string) {
    await supabase.from('notes').delete().eq('id', noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  }

  async function deleteContact() {
    if (!contact) return;
    await supabase.from('leads').delete().eq('contact_id', contact.id);
    await supabase.from('notes').delete().eq('contact_id', contact.id);
    await supabase.from('client_services').delete().eq('contact_id', contact.id);
    await supabase.from('contacts').delete().eq('id', contact.id);
    window.location.href = '/dashboard/contacts';
  }

  async function deleteLead(leadId: string) {
    await supabase.from('leads').delete().eq('id', leadId);
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setConfirmDeleteLead(null);
  }

  // Edit contact
  function openEditContact() {
    if (!contact) return;
    setContactForm({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email || '',
      mobile: contact.mobile || '',
      business_name: contact.business_name || '',
      business_address: contact.business_address || '',
      business_phone: contact.business_phone || contact.phone || '',
      business_email: contact.business_email || '',
      website: contact.website || '',
      industry: contact.industry || '',
      preferred_contact: contact.preferred_contact || 'Email',
      how_found: contact.how_found || '',
      interests: contact.interests || '',
      linkedin_url: contact.linkedin_url || '',
      tags: contact.tags || [],
    });
    setShowEditContact(true);
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || contactForm.tags.includes(t)) return;
    setContactForm((p: any) => ({ ...p, tags: [...p.tags, t] }));
    setTagInput('');
  }

  function removeTag(tag: string) {
    setContactForm((p: any) => ({ ...p, tags: p.tags.filter((t: string) => t !== tag) }));
  }

  async function saveContact() {
    if (!contact) return;
    setSavingContact(true);
    const payload = {
      ...contactForm,
      name: `${contactForm.first_name} ${contactForm.last_name}`.trim() || contact.name,
    };
    const { data } = await supabase.from('contacts').update(payload).eq('id', contact.id).select().single();
    if (data) setContact(data);
    setShowEditContact(false);
    setSavingContact(false);
  }

  // Services
  function openAddService() {
    setEditingService(null);
    setServiceForm(emptyService);
    setShowServiceForm(true);
  }

  function openEditService(s: Service) {
    setEditingService(s);
    setServiceForm({ service_name: s.service_name, plan_tier: s.plan_tier, mrr: s.mrr?.toString() || '', start_date: s.start_date || '', renewal_date: s.renewal_date || '', status: s.status, notes: s.notes || '' });
    setShowServiceForm(true);
  }

  async function saveService() {
    if (!contact) return;
    setSavingService(true);
    const payload = { contact_id: contact.id, service_name: serviceForm.service_name, plan_tier: serviceForm.plan_tier, mrr: parseFloat(serviceForm.mrr) || 0, start_date: serviceForm.start_date || null, renewal_date: serviceForm.renewal_date || null, status: serviceForm.status, notes: serviceForm.notes || null };
    if (editingService) {
      const { data } = await supabase.from('client_services').update(payload).eq('id', editingService.id).select().single();
      if (data) setServices(prev => prev.map(s => s.id === editingService.id ? data : s));
    } else {
      const { data } = await supabase.from('client_services').insert(payload).select().single();
      if (data) setServices(prev => [data, ...prev]);
    }
    setShowServiceForm(false);
    setSavingService(false);
  }

  async function deleteService(serviceId: string) {
    await supabase.from('client_services').delete().eq('id', serviceId);
    setServices(prev => prev.filter(s => s.id !== serviceId));
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
    </div>
  );
  if (!contact) return <div className="text-center py-20 text-slate-600">Contact not found.</div>;

  const name = contact.name;
  const totalMRR = services.filter(s => s.status === 'active').reduce((sum, s) => sum + (s.mrr || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/dashboard/contacts" className="flex items-center gap-1.5 text-slate-500 hover:text-white text-sm transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Contacts
      </Link>

      {/* Profile header */}
      <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6 mb-5">
        <div className="flex items-start gap-5">
          <div className={`w-16 h-16 rounded-full ${avatarColor(name)} flex items-center justify-center text-white text-xl font-bold shrink-0`}>
            {initials(name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-white text-xl font-bold">{name}</h1>
              {contact.tags && contact.tags.length > 0 && contact.tags.map(tag => (
                <span key={tag} className="text-xs bg-white/8 text-slate-400 px-2 py-0.5 rounded-full border border-white/10">{tag}</span>
              ))}
            </div>
            {contact.business_name && <p className="text-slate-400 text-sm mb-1">{contact.business_name}{contact.industry ? ` · ${contact.industry}` : ''}</p>}
            {contact.how_found && <p className="text-slate-600 text-xs mb-2">Found via {contact.how_found}</p>}
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              <a href={`mailto:${contact.email}`} className="hover:text-cyan-400 transition-colors">{contact.email}</a>
              {contact.mobile && <a href={`tel:${contact.mobile}`} className="hover:text-cyan-400 transition-colors">{contact.mobile}</a>}
              {contact.website && <a href={contact.website} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">{contact.website.replace(/^https?:\/\//, '')}</a>}
              {contact.linkedin_url && <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">LinkedIn</a>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            {totalMRR > 0 && (
              <div className="text-right">
                <div className="text-xl font-bold text-cyan-400">${totalMRR.toLocaleString()}<span className="text-slate-600 text-xs font-normal">/mo</span></div>
              </div>
            )}
            <button onClick={openEditContact} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 px-3 py-1.5 rounded-lg transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
            <button onClick={() => setConfirmDeleteContact(true)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-white/8 hover:border-red-500/20 px-3 py-1.5 rounded-lg transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Detail cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Business details */}
        <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-4">Business</p>
          <div className="space-y-3">
            <Field label="Business Name" value={contact.business_name} />
            <Field label="Industry" value={contact.industry} />
            <Field label="Address" value={contact.business_address} />
            <Field label="Website" value={contact.website} href={contact.website || undefined} />
            <Field label="Business Phone" value={contact.business_phone || contact.phone} />
            <Field label="Business Email" value={contact.business_email} href={contact.business_email ? `mailto:${contact.business_email}` : undefined} />
          </div>
        </div>

        {/* Personal / CRM details */}
        <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-4">Contact</p>
          <div className="space-y-3">
            <Field label="First Name" value={contact.first_name} />
            <Field label="Last Name" value={contact.last_name} />
            <Field label="Mobile" value={contact.mobile} href={contact.mobile ? `tel:${contact.mobile}` : undefined} />
            <Field label="Email" value={contact.email} href={`mailto:${contact.email}`} />
            <Field label="LinkedIn" value={contact.linkedin_url} href={contact.linkedin_url || undefined} />
            <Field label="Preferred Contact" value={contact.preferred_contact} />
            <Field label="Interests" value={contact.interests} />
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest">Active Services</h2>
          <button onClick={openAddService} className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/20 px-3 py-1.5 rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Add Service
          </button>
        </div>
        {services.length === 0 ? (
          <div className="text-slate-700 text-sm text-center py-6">No services yet</div>
        ) : (
          <div className="space-y-2">
            {services.map(s => {
              const st = serviceStatusColor[s.status] || serviceStatusColor.active;
              const tier = tierColor[s.plan_tier] || tierColor.Starter;
              return (
                <div key={s.id} className="flex items-center gap-4 bg-[#080c14] border border-white/5 rounded-xl p-4 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-semibold">{s.service_name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${tier}`}>{s.plan_tier}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      {s.start_date && <span>Started {new Date(s.start_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                      {s.renewal_date && <span>Renews {new Date(s.renewal_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-white font-semibold text-sm">${(s.mrr || 0).toLocaleString()}<span className="text-slate-600 text-xs font-normal">/mo</span></div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      <span className={`text-xs font-medium capitalize ${st.text}`}>{s.status}</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditService(s)} className="text-slate-500 hover:text-white text-xs">Edit</button>
                      <button onClick={() => deleteService(s.id)} className="text-slate-600 hover:text-red-400 text-xs">Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Leads */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">Lead History</h2>
          {leads.length === 0 ? (
            <div className="text-slate-700 text-sm text-center py-8">No leads yet</div>
          ) : leads.map(lead => (
            <div key={lead.id} className="relative group bg-[#0d1420] border border-white/8 hover:border-white/20 rounded-xl p-4 transition-all">
              <Link href={`/dashboard/${lead.id}`} className="absolute inset-0 rounded-xl" aria-label="View lead" />
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-white text-sm font-medium capitalize">{lead.classification.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColor[lead.status] || statusColor.new}`}>{lead.status}</span>
                  <button onClick={e => { e.preventDefault(); setConfirmDeleteLead(lead); }}
                    className="relative z-10 opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Delete enquiry">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              <p className="text-slate-500 text-xs line-clamp-2 mb-2">{lead.ai_summary}</p>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 text-xs">{new Date(lead.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {lead.deal_value && <span className="text-emerald-400 text-xs font-semibold">${lead.deal_value.toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="lg:col-span-2">
          <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">Notes</h2>
          <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-4 mb-3">
            <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note..." rows={3} className="w-full bg-transparent text-slate-300 text-sm placeholder-slate-700 focus:outline-none resize-none mb-3" />
            <button onClick={addNote} disabled={!newNote.trim() || savingNote} className="w-full bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/20 text-cyan-400 text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-40">
              {savingNote ? 'Saving...' : 'Add Note'}
            </button>
          </div>
          <div className="space-y-2">
            {notes.length === 0 ? (
              <p className="text-slate-700 text-xs text-center py-4">No notes yet</p>
            ) : notes.map(note => (
              <div key={note.id} className="bg-[#0d1420] border border-white/8 rounded-xl p-3 group">
                <p className="text-slate-300 text-sm leading-relaxed mb-2">{note.body}</p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 text-xs">{new Date(note.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}</span>
                  <button onClick={() => deleteNote(note.id)} className="text-slate-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Contact Modal */}
      {showEditContact && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d1420] border border-white/10 rounded-2xl p-6 w-full max-w-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">Edit Contact</h3>
              <button onClick={() => setShowEditContact(false)} className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Personal */}
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">Personal</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[['First Name','first_name'],['Last Name','last_name'],['Mobile','mobile'],['Email','email'],['LinkedIn URL','linkedin_url'],['Interests','interests']].map(([label, key]) => (
                <div key={key}>
                  <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                  <input type="text" value={contactForm[key] || ''} onChange={e => setContactForm((p: any) => ({ ...p, [key]: e.target.value }))}
                    className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50" />
                </div>
              ))}
            </div>

            {/* Business */}
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">Business</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[['Business Name','business_name'],['Website','website'],['Business Phone','business_phone'],['Business Email','business_email'],['Business Address','business_address']].map(([label, key]) => (
                <div key={key} className={key === 'business_address' ? 'col-span-2' : ''}>
                  <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                  <input type="text" value={contactForm[key] || ''} onChange={e => setContactForm((p: any) => ({ ...p, [key]: e.target.value }))}
                    className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50" />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Industry</label>
                <select value={contactForm.industry || ''} onChange={e => setContactForm((p: any) => ({ ...p, industry: e.target.value }))}
                  className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50">
                  <option value="">Select industry</option>
                  {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* CRM */}
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">CRM</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">How They Found You</label>
                <select value={contactForm.how_found || ''} onChange={e => setContactForm((p: any) => ({ ...p, how_found: e.target.value }))}
                  className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50">
                  <option value="">Select source</option>
                  {HOW_FOUND_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Preferred Contact Method</label>
                <select value={contactForm.preferred_contact || 'Email'} onChange={e => setContactForm((p: any) => ({ ...p, preferred_contact: e.target.value }))}
                  className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50">
                  {CONTACT_PREF_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div className="mb-6">
              <label className="text-xs text-slate-500 mb-1.5 block">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(contactForm.tags || []).map((tag: string) => (
                  <span key={tag} className="flex items-center gap-1 text-xs bg-white/8 text-slate-300 px-2.5 py-1 rounded-full border border-white/10">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="text-slate-500 hover:text-red-400 transition-colors ml-0.5">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Add tag..." value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); }}}
                  className="flex-1 bg-[#080c14] border border-white/8 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-400/50" />
                <button onClick={addTag} className="px-4 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-400 text-sm rounded-xl transition-colors">Add</button>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={saveContact} disabled={savingContact} className="flex-1 bg-cyan-400 hover:bg-cyan-300 text-[#080c14] font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-40">
                {savingContact ? 'Saving...' : 'Save Contact'}
              </button>
              <button onClick={() => setShowEditContact(false)} className="px-6 bg-white/5 hover:bg-white/10 text-slate-400 font-medium py-3 rounded-xl text-sm transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Contact Confirmation */}
      {confirmDeleteContact && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1420] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-white font-semibold text-center mb-1">Delete Contact?</h3>
            <p className="text-slate-400 text-sm text-center mb-1"><span className="text-white font-medium">{name}</span> will be permanently deleted.</p>
            <p className="text-slate-600 text-xs text-center mb-6">This will also delete all their enquiries, notes, and services. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteContact(false)} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 py-2.5 rounded-xl text-sm transition-colors">Cancel</button>
              <button onClick={deleteContact} className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-semibold py-2.5 rounded-xl text-sm transition-colors">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Lead Confirmation */}
      {confirmDeleteLead && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1420] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-white font-semibold text-center mb-1">Delete Enquiry?</h3>
            <p className="text-slate-400 text-sm text-center mb-1 capitalize">{confirmDeleteLead.classification.replace(/_/g, ' ')}</p>
            <p className="text-slate-600 text-xs text-center mb-6">This enquiry will be permanently deleted. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteLead(null)} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 py-2.5 rounded-xl text-sm transition-colors">Cancel</button>
              <button onClick={() => deleteLead(confirmDeleteLead.id)} className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-semibold py-2.5 rounded-xl text-sm transition-colors">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {showServiceForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1420] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-semibold mb-5">{editingService ? 'Edit Service' : 'Add Service'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Service</label>
                <select value={serviceForm.service_name} onChange={e => setServiceForm((p: any) => ({ ...p, service_name: e.target.value }))}
                  className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50">
                  {SERVICE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Plan Tier</label>
                  <select value={serviceForm.plan_tier} onChange={e => setServiceForm((p: any) => ({ ...p, plan_tier: e.target.value }))}
                    className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50">
                    {TIER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Monthly Value ($)</label>
                  <input type="number" placeholder="0" value={serviceForm.mrr} onChange={e => setServiceForm((p: any) => ({ ...p, mrr: e.target.value }))}
                    className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Start Date</label>
                  <input type="date" value={serviceForm.start_date} onChange={e => setServiceForm((p: any) => ({ ...p, start_date: e.target.value }))}
                    className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Renewal Date</label>
                  <input type="date" value={serviceForm.renewal_date} onChange={e => setServiceForm((p: any) => ({ ...p, renewal_date: e.target.value }))}
                    className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Status</label>
                <select value={serviceForm.status} onChange={e => setServiceForm((p: any) => ({ ...p, status: e.target.value }))}
                  className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50">
                  {SERVICE_STATUS_OPTIONS.map(o => <option key={o} value={o} className="capitalize">{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Notes (optional)</label>
                <textarea value={serviceForm.notes} onChange={e => setServiceForm((p: any) => ({ ...p, notes: e.target.value }))} rows={2}
                  className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={saveService} disabled={savingService} className="flex-1 bg-cyan-400 hover:bg-cyan-300 text-[#080c14] font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40">
                {savingService ? 'Saving...' : editingService ? 'Save Changes' : 'Add Service'}
              </button>
              <button onClick={() => setShowServiceForm(false)} className="px-5 bg-white/5 hover:bg-white/10 text-slate-400 py-2.5 rounded-xl text-sm transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
