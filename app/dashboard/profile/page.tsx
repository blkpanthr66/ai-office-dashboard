'use client';
import { useEffect, useRef, useState } from 'react';
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
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState('');
  const [uploading, setUploading] = useState(false);
  const [logoMode, setLogoMode]   = useState<'url' | 'upload'>('url');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    const { data, error } = await supabase.from('business_profile').select('*').limit(1).single();
    if (data) setProfile(data);
    if (error && error.code !== 'PGRST116') {
      setError('Could not load profile. Make sure the business_profile table exists in Supabase.');
    }
    setLoading(false);
  }

  function set(field: keyof Profile, value: string) {
    setProfile(prev => ({ ...prev, [field]: value }));
    setSaved(false);
    setError('');
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    setError('');
    const ext = file.name.split('.').pop();
    const path = `logos/logo-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('assets').upload(path, file, { upsert: true });
    if (uploadError) {
      setError('Upload failed: ' + uploadError.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('assets').getPublicUrl(path);
    set('logo_url', data.publicUrl);
    setUploading(false);
  }

  async function save() {
    setSaving(true);
    setError('');
    if (profile.id) {
      const { error } = await supabase
        .from('business_profile')
        .update({ ...profile, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      if (error) { setError('Save failed: ' + error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from('business_profile').insert(profile).select().single();
      if (error) { setError('Save failed: ' + error.message); setSaving(false); return; }
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

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 text-red-300 text-xs rounded-xl px-4 py-3">
          {error}
          {error.includes('business_profile table') && (
            <p className="mt-1 text-red-400">Run <strong>supabase-profile-team.sql</strong> in your Supabase SQL Editor first.</p>
          )}
        </div>
      )}

      {/* Logo */}
      <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-5">Brand</h2>
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500 flex items-center justify-center text-white text-xl font-bold shrink-0 overflow-hidden">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : initials}
          </div>
          <div className="flex-1 space-y-3">
            {/* Toggle */}
            <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
              <button onClick={() => setLogoMode('url')}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${logoMode === 'url' ? 'bg-cyan-400/20 text-cyan-400' : 'text-slate-500 hover:text-white'}`}>
                URL
              </button>
              <button onClick={() => setLogoMode('upload')}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${logoMode === 'upload' ? 'bg-cyan-400/20 text-cyan-400' : 'text-slate-500 hover:text-white'}`}>
                Upload
              </button>
            </div>

            {logoMode === 'url' ? (
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Logo URL</label>
                <input
                  type="url"
                  value={profile.logo_url}
                  onChange={e => set('logo_url', e.target.value)}
                  placeholder="https://yoursite.com/logo.png"
                  className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50 transition-colors"
                />
                <p className="text-slate-700 text-xs mt-1.5">Paste a public image URL.</p>
              </div>
            ) : (
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Upload Image</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }}
                />
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40">
                  {uploading ? (
                    <><div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin" />Uploading...</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Choose file</>
                  )}
                </button>
                <p className="text-slate-700 text-xs mt-1.5">Uploads to Supabase Storage (assets bucket).</p>
                {profile.logo_url && (
                  <p className="text-slate-600 text-xs mt-1 truncate">Current: {profile.logo_url}</p>
                )}
              </div>
            )}
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
