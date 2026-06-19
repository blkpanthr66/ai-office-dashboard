'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Profile = {
  id?: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  country: string;
  industry: string;
  description: string;
  logo_url: string;
  timezone: string;
};

const empty: Profile = {
  business_name: '', owner_name: '', email: '', phone: '',
  website: '', address: '', city: '', country: 'New Zealand',
  industry: '', description: '', logo_url: '', timezone: 'Pacific/Auckland',
};

const INDUSTRIES = ['Digital Marketing', 'SEO / AEO', 'Web Design', 'AI & Automation', 'Consulting', 'Social Media', 'Advertising', 'Other'];
const TIMEZONES  = ['Pacific/Auckland', 'Pacific/Chatham', 'Australia/Sydney', 'Australia/Melbourne', 'UTC'];

// Defined outside component so React never remounts on re-render
function Field({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-slate-500 mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50 transition-colors"
      />
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    const { data } = await supabase.from('business_profile').select('*').limit(1).single();
    if (data) setProfile(data);
    setLoading(false);
  }

  function set(field: keyof Profile, value: string) {
    setProfile(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    if (profile.id) {
      await supabase.from('business_profile').update({ ...profile, updated_at: new Date().toISOString() }).eq('id', profile.id);
    } else {
      const { data } = await supabase.from('business_profile').insert(profile).select().single();
      if (data) setProfile(data);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
    </div>
  );

  const initials = profile.business_name
    ? profile.business_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'PP';

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-semibold text-lg">Business Profile</h1>
          <p className="text-slate-500 text-xs mt-0.5">Your business details used across the CRM</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-[#080c14] text-sm font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-40">
          {saving ? (
            <><div className="w-3.5 h-3.5 border-2 border-[#080c14]/30 border-t-[#080c14] rounded-full animate-spin" />Saving...</>
          ) : saved ? (
            <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Saved</>
          ) : 'Save Changes'}
        </button>
      </div>

      {/* Logo */}
      <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-5">Brand</h2>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500 flex items-center justify-center text-white text-xl font-bold shrink-0 overflow-hidden">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : initials}
          </div>
          <div className="flex-1">
            <Field
              label="Logo URL"
              value={profile.logo_url}
              onChange={v => set('logo_url', v)}
              type="url"
              placeholder="https://yoursite.com/logo.png"
            />
            <p className="text-slate-700 text-xs mt-1.5">Paste a public image URL. Leave blank to use initials.</p>
          </div>
        </div>
      </div>

      {/* Business details */}
      <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-5">Business Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Business Name" value={profile.business_name} onChange={v => set('business_name', v)} placeholder="PinPoint Local AI" />
          <Field label="Your Name"     value={profile.owner_name}    onChange={v => set('owner_name', v)}    placeholder="Peter" />
          <Field label="Email"         value={profile.email}         onChange={v => set('email', v)}         type="email" placeholder="hello@yoursite.com" />
          <Field label="Phone"         value={profile.phone}         onChange={v => set('phone', v)}         placeholder="+64 21 000 000" />
          <Field label="Website"       value={profile.website}       onChange={v => set('website', v)}       type="url" placeholder="https://yoursite.com" />
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Industry</label>
            <select value={profile.industry} onChange={e => set('industry', e.target.value)}
              className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50">
              <option value="">Select industry...</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs text-slate-500 mb-1.5 block">Business Description</label>
          <textarea value={profile.description} onChange={e => set('description', e.target.value)}
            rows={3} placeholder="A short description of what your business does..."
            className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50 resize-none" />
        </div>
      </div>

      {/* Location */}
      <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-5">Location</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Street Address" value={profile.address} onChange={v => set('address', v)} placeholder="123 Main Street" />
          <Field label="City"           value={profile.city}    onChange={v => set('city', v)}    placeholder="Auckland" />
          <Field label="Country"        value={profile.country} onChange={v => set('country', v)} placeholder="New Zealand" />
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Timezone</label>
            <select value={profile.timezone} onChange={e => set('timezone', e.target.value)}
              className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50">
              {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end pb-4">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-[#080c14] text-sm font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-40">
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
