'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  notes: string;
  created_at: string;
};

const ROLES = ['Admin', 'Staff', 'VA', 'Contractor', 'Manager', 'Support', 'Viewer'];
const ROLE_COLORS: Record<string, string> = {
  Admin:      'text-red-300 bg-red-500/10 border-red-500/20',
  Staff:      'text-blue-300 bg-blue-500/10 border-blue-500/20',
  VA:         'text-purple-300 bg-purple-500/10 border-purple-500/20',
  Contractor: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  Manager:    'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
  Support:    'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  Viewer:     'text-slate-300 bg-slate-500/10 border-slate-500/20',
};
const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  active:   { label: 'Active',   dot: 'bg-emerald-400', text: 'text-emerald-400' },
  pending:  { label: 'Pending',  dot: 'bg-amber-400',   text: 'text-amber-400'   },
  inactive: { label: 'Inactive', dot: 'bg-slate-500',   text: 'text-slate-500'   },
};

const emptyForm = { name: '', email: '', role: 'Staff', status: 'active', notes: '' };

function avatarColor(name: string) {
  const colors = ['bg-cyan-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function TeamPage() {
  const [members, setMembers]     = useState<Member[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Member | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [inviteError, setInviteError]   = useState('');

  useEffect(() => { fetchMembers(); }, []);

  async function fetchMembers() {
    const { data } = await supabase.from('team_members').select('*').order('created_at');
    setMembers(data || []);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(m: Member) {
    setEditing(m);
    setForm({ name: m.name, email: m.email, role: m.role, status: m.status, notes: m.notes || '' });
    setShowModal(true);
  }

  async function save() {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    setInviteStatus('idle');
    setInviteError('');
    if (editing) {
      const { data } = await supabase.from('team_members').update(form).eq('id', editing.id).select().single();
      if (data) setMembers(prev => prev.map(m => m.id === editing.id ? data : m));
    } else {
      const { data } = await supabase.from('team_members').insert(form).select().single();
      if (data) {
        setMembers(prev => [...prev, data]);
        // Send invite email
        const res = await fetch('/api/invite-team-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, email: form.email, role: form.role }),
        });
        const json = await res.json();
        if (!res.ok) {
          setInviteStatus('error');
          setInviteError(json.error || 'Invite failed');
          setSaving(false);
          setShowModal(false);
          return;
        }
        setInviteStatus('sent');
      }
    }
    setSaving(false);
    setShowModal(false);
  }

  async function deleteMember(id: string) {
    setDeleting(id);
    await supabase.from('team_members').delete().eq('id', id);
    setMembers(prev => prev.filter(m => m.id !== id));
    setDeleting(null);
  }

  async function toggleStatus(m: Member) {
    const next = m.status === 'active' ? 'inactive' : 'active';
    await supabase.from('team_members').update({ status: next }).eq('id', m.id);
    setMembers(prev => prev.map(x => x.id === m.id ? { ...x, status: next } : x));
  }

  const activeCount  = members.filter(m => m.status === 'active').length;
  const pendingCount = members.filter(m => m.status === 'pending').length;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white font-semibold text-lg">Team</h1>
          <p className="text-slate-500 text-xs mt-0.5">Manage staff, VAs and collaborators</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-[#080c14] text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-5">
          <div className="text-3xl font-bold text-white mb-1">{members.length}</div>
          <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Total Members</div>
        </div>
        <div className="bg-[#0d1420] border border-emerald-500/20 rounded-2xl p-5">
          <div className="text-3xl font-bold text-emerald-400 mb-1">{activeCount}</div>
          <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Active</div>
        </div>
        <div className="bg-[#0d1420] border border-amber-500/20 rounded-2xl p-5">
          <div className="text-3xl font-bold text-amber-400 mb-1">{pendingCount}</div>
          <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Pending</div>
        </div>
      </div>

      {/* Invite status */}
      {inviteStatus === 'sent' && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm rounded-2xl px-5 py-4 flex items-center gap-3">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          Invite sent — they'll receive an email with a secure login link.
          <button onClick={() => setInviteStatus('idle')} className="ml-auto text-emerald-500 hover:text-emerald-300 text-xs">Dismiss</button>
        </div>
      )}
      {inviteStatus === 'error' && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-2xl px-5 py-4 flex items-center gap-3">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Invite failed: {inviteError}
          <button onClick={() => setInviteStatus('idle')} className="ml-auto text-red-500 hover:text-red-300 text-xs">Dismiss</button>
        </div>
      )}

      {/* Members list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="bg-[#0d1420] border border-white/8 rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm font-medium">No team members yet</p>
          <p className="text-slate-700 text-xs mt-1">Add your first staff member or VA</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map(m => {
            const sts = STATUS_CONFIG[m.status] || STATUS_CONFIG.pending;
            const roleColor = ROLE_COLORS[m.role] || ROLE_COLORS.Staff;
            return (
              <div key={m.id}
                className="bg-[#0d1420] border border-white/8 hover:border-white/15 rounded-2xl p-5 transition-all group">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className={`w-11 h-11 rounded-full ${avatarColor(m.name)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {initials(m.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-white font-semibold text-sm">{m.name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${roleColor}`}>{m.role}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${sts.dot}`} />
                        <span className={`text-xs ${sts.text}`}>{sts.label}</span>
                      </div>
                    </div>
                    <p className="text-slate-500 text-xs">{m.email}</p>
                    {m.notes && <p className="text-slate-600 text-xs mt-1 line-clamp-1">{m.notes}</p>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => toggleStatus(m)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        m.status === 'active'
                          ? 'text-slate-400 border-white/8 hover:text-amber-400 hover:border-amber-400/20 hover:bg-amber-500/5'
                          : 'text-slate-400 border-white/8 hover:text-emerald-400 hover:border-emerald-400/20 hover:bg-emerald-500/5'
                      }`}>
                      {m.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => openEdit(m)}
                      className="text-xs text-slate-400 hover:text-white border border-white/8 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors">
                      Edit
                    </button>
                    <button onClick={() => deleteMember(m.id)} disabled={deleting === m.id}
                      className="text-xs text-slate-600 hover:text-red-400 border border-white/8 hover:border-red-500/20 hover:bg-red-500/5 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                      {deleting === m.id ? '...' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info banner */}
      <div className="mt-8 bg-cyan-500/5 border border-cyan-500/15 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <svg className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-cyan-300 text-sm font-medium mb-1">Automatic invitations</p>
            <p className="text-slate-500 text-xs leading-relaxed">
              When you add a new team member, they automatically receive a welcome email plus a secure login link from Supabase. They click the link to set their own password — no temporary passwords needed.
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1420] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold">{editing ? 'Edit Member' : 'Add Team Member'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Full Name *</label>
                <input type="text" placeholder="Jane Smith" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Email Address *</label>
                <input type="email" placeholder="jane@example.com" value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Role</label>
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50">
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Notes</label>
                <input type="text" placeholder="e.g. Handles social media Mon–Fri" value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={save} disabled={saving || !form.name.trim() || !form.email.trim()}
                className="flex-1 bg-cyan-400 hover:bg-cyan-300 text-[#080c14] font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-40">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Member'}
              </button>
              <button onClick={() => setShowModal(false)}
                className="px-5 bg-white/5 hover:bg-white/10 text-slate-400 py-3 rounded-xl text-sm transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
