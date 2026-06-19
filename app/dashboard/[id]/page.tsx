'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Lead = {
  id: string;
  contact_id: string;
  raw_message: string;
  classification: string;
  ai_summary: string;
  ai_confidence: number;
  recommended_action: string;
  draft_reply: string;
  missing_info: string[];
  status: string;
  urgency: string;
  source: string;
  source_page: string;
  created_at: string;
  deal_value: number | null;
  follow_up_date: string | null;
  follow_up_note: string | null;
  contacts: { name: string; email: string; phone: string; business_name: string } | null;
};

const classConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  quote_request:    { label: 'Quote Request',    color: 'text-blue-300',   bg: 'bg-blue-500/15',   border: 'border-blue-500/30' },
  booking_request:  { label: 'Booking',          color: 'text-purple-300', bg: 'bg-purple-500/15', border: 'border-purple-500/30' },
  existing_customer:{ label: 'Existing Client',  color: 'text-amber-300',  bg: 'bg-amber-500/15',  border: 'border-amber-500/30' },
  spam:             { label: 'Spam',             color: 'text-slate-400',  bg: 'bg-slate-500/15',  border: 'border-slate-500/30' },
  general_enquiry:  { label: 'General Enquiry',  color: 'text-cyan-300',   bg: 'bg-cyan-500/15',   border: 'border-cyan-500/30' },
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

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [draft, setDraft] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [savingCrm, setSavingCrm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  useEffect(() => { fetchLead(); }, [id]);

  async function fetchLead() {
    const { data } = await supabase
      .from('leads')
      .select('*, contacts(*)')
      .eq('id', id)
      .single();
    if (data) {
      setLead(data);
      setDraft(data.draft_reply || '');
      setDealValue(data.deal_value ? String(data.deal_value) : '');
      setFollowUpDate(data.follow_up_date || '');
      setFollowUpNote(data.follow_up_note || '');
    }
    setLoading(false);
  }

  async function saveCrm() {
    if (!lead) return;
    setSavingCrm(true);
    await supabase.from('leads').update({
      deal_value: dealValue ? parseFloat(dealValue) : null,
      follow_up_date: followUpDate || null,
      follow_up_note: followUpNote || null,
    }).eq('id', lead.id);
    setSavingCrm(false);
  }

  async function handleApprove() {
    if (!lead) return;
    setActionLoading(true);
    setMessage('');
    const res = await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: lead.id, draft_reply: draft, contact_email: lead.contacts?.email, contact_name: lead.contacts?.name }),
    });
    const data = await res.json();
    if (data.success) {
      setMessageType('success');
      setMessage('Reply sent successfully.');
      setLead(prev => prev ? { ...prev, status: 'sent' } : prev);
    } else {
      setMessageType('error');
      setMessage(`Failed to send: ${data.error}`);
    }
    setActionLoading(false);
  }

  async function handleReject() {
    if (!lead) return;
    setActionLoading(true);
    await supabase.from('leads').update({ status: 'rejected' }).eq('id', lead.id);
    await supabase.from('logs').insert({ lead_id: lead.id, action: 'rejected', detail: 'Lead rejected by Peter — no reply sent' });
    setLead(prev => prev ? { ...prev, status: 'rejected' } : prev);
    setMessageType('success');
    setMessage('Lead marked as rejected. No email sent.');
    setActionLoading(false);
  }

  if (loading) return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
      <div className="flex items-center gap-3 text-slate-500">
        <div className="w-5 h-5 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
        Loading lead...
      </div>
    </div>
  );

  if (!lead) return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center text-slate-500">
      Lead not found.
    </div>
  );

  const isClosed = lead.status === 'sent' || lead.status === 'rejected';
  const cls = classConfig[lead.classification] || classConfig.general_enquiry;
  const name = lead.contacts?.name || 'Unknown';
  const confidence = Math.round((lead.ai_confidence || 0) * 100);

  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      {/* Header */}
      <header className="border-b border-white/8 bg-[#080c14]/95 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-white text-sm font-medium truncate">{name}</span>
          {lead.urgency === 'urgent' && (
            <span className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full animate-pulse">
              URGENT
            </span>
          )}
          <div className="ml-auto">
            {isClosed && (
              <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                lead.status === 'sent'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
              }`}>
                {lead.status === 'sent' ? '✓ Replied' : 'Rejected'}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-5">

        {/* Contact + Classification */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contact card */}
          <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-4">Contact</p>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full ${avatarColor(name)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                {initials(name)}
              </div>
              <div>
                <p className="text-white font-semibold">{name}</p>
                <p className="text-slate-400 text-sm">{lead.contacts?.email || '—'}</p>
                {lead.contacts?.phone && <p className="text-slate-500 text-sm">{lead.contacts.phone}</p>}
                {lead.contacts?.business_name && <p className="text-slate-500 text-sm">{lead.contacts.business_name}</p>}
              </div>
            </div>
          </div>

          {/* Classification card */}
          <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-4">Classification</p>
            <div className="space-y-3">
              <span className={`inline-flex text-sm font-semibold px-3 py-1.5 rounded-full border ${cls.color} ${cls.bg} ${cls.border}`}>
                {cls.label}
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">AI Confidence</span>
                  <span className="text-slate-300 font-medium">{confidence}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${confidence >= 80 ? 'bg-emerald-400' : confidence >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                    style={{ width: `${confidence}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-4 text-xs text-slate-500 pt-1">
                <span>from <span className="text-slate-400">/{lead.source_page || lead.source}</span></span>
                <span>{new Date(lead.created_at).toLocaleString('en-NZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CRM Fields */}
        <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-4">Deal Info</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Deal Value ($)</label>
              <input type="number" min="0" step="0.01" placeholder="e.g. 2500"
                value={dealValue} onChange={e => setDealValue(e.target.value)}
                className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Follow-up Date</label>
              <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50" />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs text-slate-500 mb-1.5 block">Follow-up Note</label>
            <input type="text" placeholder="e.g. Waiting on their budget approval"
              value={followUpNote} onChange={e => setFollowUpNote(e.target.value)}
              className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50" />
          </div>
          <button onClick={saveCrm} disabled={savingCrm}
            className="text-xs font-semibold text-cyan-400 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/20 px-4 py-2 rounded-xl transition-colors disabled:opacity-40">
            {savingCrm ? 'Saving...' : 'Save Deal Info'}
          </button>
        </div>

        {/* Original message */}
        <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-4">Original Message</p>
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{lead.raw_message}</p>
        </div>

        {/* AI Summary + Recommended Action */}
        <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-4">AI Summary</p>
          <p className="text-slate-300 text-sm leading-relaxed mb-5">{lead.ai_summary}</p>
          <div className="flex items-start gap-3 bg-cyan-500/5 border border-cyan-500/15 rounded-xl p-4">
            <div className="w-5 h-5 rounded-full bg-cyan-400/20 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-cyan-500 uppercase tracking-wider mb-1">Recommended Action</p>
              <p className="text-cyan-200 text-sm">{lead.recommended_action}</p>
            </div>
          </div>
        </div>

        {/* Missing info */}
        {lead.missing_info && lead.missing_info.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Missing Information</p>
            </div>
            <ul className="space-y-2">
              {lead.missing_info.map((item, i) => (
                <li key={i} className="text-amber-200/80 text-sm flex items-start gap-2.5">
                  <span className="text-amber-500 mt-1 shrink-0">›</span> {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Draft reply */}
        <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">Draft Reply</p>
            {!isClosed && (
              <span className="text-xs text-slate-600">Editable before sending</span>
            )}
          </div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            disabled={isClosed}
            rows={12}
            className="w-full bg-[#080c14] border border-white/8 rounded-xl px-4 py-3 text-slate-200 text-sm leading-relaxed focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 resize-y disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono"
          />
        </div>

        {/* Status message */}
        {message && (
          <div className={`flex items-center gap-3 rounded-xl p-4 text-sm border ${
            messageType === 'success'
              ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/8 border-red-500/20 text-red-300'
          }`}>
            <span>{messageType === 'success' ? '✓' : '✕'}</span>
            {message}
          </div>
        )}

        {/* Action buttons */}
        {!isClosed ? (
          <div className="flex gap-3 pb-8">
            <button
              onClick={handleApprove}
              disabled={actionLoading || !draft.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-[#080c14] font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-cyan-400/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#080c14]/30 border-t-[#080c14] rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Approve & Send Reply
                </>
              )}
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading}
              className="px-6 bg-white/4 hover:bg-red-500/10 border border-white/8 hover:border-red-500/25 text-slate-400 hover:text-red-400 font-medium py-3.5 rounded-xl text-sm transition-all disabled:opacity-40"
            >
              Reject
            </button>
          </div>
        ) : (
          <div className={`text-center py-4 rounded-xl text-sm font-medium mb-8 ${
            lead.status === 'sent'
              ? 'bg-blue-500/8 text-blue-400 border border-blue-500/20'
              : 'bg-slate-500/8 text-slate-500 border border-slate-500/20'
          }`}>
            {lead.status === 'sent' ? '✓ Reply sent' : 'Lead rejected — no reply sent'}
          </div>
        )}
      </main>
    </div>
  );
}
