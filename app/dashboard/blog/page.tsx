'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';


type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  category: string;
  tags: string[];
  status: string;
  author: string;
  authored_by: string;
  published_at: string | null;
  created_at: string;
};

const CATEGORIES = ['AI & Tech', 'SEO & AEO', 'Websites', 'Business Growth', 'General'];
const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  draft:     { label: 'Draft',     dot: 'bg-amber-400',   text: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20'   },
  scheduled: { label: 'Scheduled', dot: 'bg-blue-400',    text: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20'     },
  published: { label: 'Published', dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  archived:  { label: 'Archived',  dot: 'bg-slate-500',   text: 'text-slate-500',   bg: 'bg-slate-500/10 border-slate-500/20'   },
};

const emptyForm = {
  title: '', slug: '', excerpt: '', content: '', cover_image: '',
  category: 'General', tags: [] as string[], status: 'draft', author: 'PinPoint Local AI',
  scheduled_at: '',
};

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-slate-500 mb-1.5 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50 transition-colors" />
    </div>
  );
}

export default function BlogPage() {
  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState<'list' | 'edit'>('list');
  const [editing, setEditing]     = useState<Post | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [tagInput, setTagInput]   = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]   = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [scheduleDate, setScheduleDate] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [coverMode, setCoverMode]       = useState<'url' | 'upload'>('url');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverError, setCoverError]     = useState('');
  const tagRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchPosts(); }, []);

  async function fetchPosts() {
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
    setPosts(data || []);
    setLoading(false);
  }

  function f(field: string, value: string | string[]) {
    setForm(p => ({ ...p, [field]: value }));
  }

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setTagInput('');
    setGenError('');
    setScheduleDate('');
    setShowSchedule(false);
    setView('edit');
  }

  function openEdit(post: Post) {
    setEditing(post);
    const scheduledAt = post.status === 'scheduled' && post.published_at
      ? new Date(post.published_at).toISOString().slice(0, 16) : '';
    setForm({
      title: post.title, slug: post.slug, excerpt: post.excerpt || '',
      content: post.content || '', cover_image: post.cover_image || '',
      category: post.category || 'General', tags: post.tags || [],
      status: post.status, author: post.author || 'PinPoint Local AI',
      scheduled_at: scheduledAt,
    });
    setTagInput('');
    setGenError('');
    setScheduleDate(scheduledAt);
    setShowSchedule(!!scheduledAt);
    setView('edit');
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) f('tags', [...form.tags, t]);
    setTagInput('');
  }

  function removeTag(tag: string) {
    f('tags', form.tags.filter(t => t !== tag));
  }

  async function uploadCoverImage(file: File) {
    setUploadingCover(true);
    setCoverError('');
    const ext = file.name.split('.').pop();
    const path = `blog-covers/cover-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('assets').upload(path, file, { upsert: true });
    if (uploadError) { setCoverError('Upload failed: ' + uploadError.message); setUploadingCover(false); return; }
    const { data } = supabase.storage.from('assets').getPublicUrl(path);
    f('cover_image', data.publicUrl);
    setUploadingCover(false);
  }

  async function save(publishNow = false, scheduledFor = '') {
    if (!form.title.trim()) return;
    setSaving(true);
    const slug = form.slug || slugify(form.title);
    let status: string;
    let published_at: string | null;

    if (publishNow) {
      status = 'published';
      published_at = new Date().toISOString();
    } else if (scheduledFor) {
      status = 'scheduled';
      published_at = new Date(scheduledFor).toISOString();
    } else if (form.status === 'scheduled' && scheduleDate) {
      status = 'scheduled';
      published_at = new Date(scheduleDate).toISOString();
    } else if (form.status === 'scheduled' && !scheduleDate) {
      status = 'draft';
      published_at = editing?.published_at || null;
    } else {
      status = form.status;
      published_at = editing?.published_at || null;
    }

    const { scheduled_at: _drop, ...rest } = form;
    const payload = { ...rest, slug, status, published_at, updated_at: new Date().toISOString() };

    if (editing) {
      const { data } = await supabase.from('blog_posts').update(payload).eq('id', editing.id).select().single();
      if (data) setPosts(prev => prev.map(p => p.id === editing.id ? data : p));
    } else {
      const { data } = await supabase.from('blog_posts').insert({ ...payload, authored_by: 'human' }).select().single();
      if (data) setPosts(prev => [data, ...prev]);
    }
    setSaving(false);
    setView('list');
  }

  async function deletePost(id: string) {
    await supabase.from('blog_posts').delete().eq('id', id);
    setPosts(prev => prev.filter(p => p.id !== id));
  }

  async function generateWithAI() {
    if (!form.title.trim()) { setGenError('Enter a title first so the AI knows what to write about.'); return; }
    setGenerating(true);
    setGenError('');
    try {
      const res = await fetch('/api/generate-blog-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, category: form.category, excerpt: form.excerpt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      f('content', data.content);
      if (data.excerpt && !form.excerpt) f('excerpt', data.excerpt);
      if (!form.slug) f('slug', slugify(form.title));
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'AI generation failed');
    }
    setGenerating(false);
  }

  const filtered = filterStatus === 'all' ? posts : posts.filter(p => p.status === filterStatus);
  const counts = { all: posts.length, draft: posts.filter(p => p.status === 'draft').length, published: posts.filter(p => p.status === 'published').length };

  // ── Edit view ─────────────────────────────────────────────────────────────
  if (view === 'edit') return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-white font-semibold text-lg">{editing ? 'Edit Post' : 'New Post'}</h1>
            <p className="text-slate-500 text-xs mt-0.5">{editing ? `Last updated ${new Date(editing.created_at).toLocaleDateString('en-NZ')}` : 'Write or generate a blog post'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => save(false)} disabled={saving || !form.title.trim()}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-40">
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button onClick={() => setShowSchedule(s => !s)}
            className={`px-4 py-2.5 border text-sm font-medium rounded-xl transition-colors ${showSchedule ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' : 'bg-white/5 hover:bg-white/10 border-white/8 text-slate-300'}`}>
            📅 Schedule
          </button>
          <button onClick={() => save(true)} disabled={saving || !form.title.trim()}
            className="px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-[#080c14] text-sm font-bold rounded-xl transition-colors disabled:opacity-40">
            Publish Now
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6 space-y-4">
        <Field label="Post Title *" value={form.title} onChange={v => { f('title', v); if (!editing) f('slug', slugify(v)); }} placeholder="e.g. How AI Is Changing Local SEO in 2026" />
        <Field label="URL Slug" value={form.slug} onChange={v => f('slug', v)} placeholder="how-ai-is-changing-local-seo" />
        <Field label="Excerpt (short summary)" value={form.excerpt} onChange={v => f('excerpt', v)} placeholder="A 1–2 sentence summary shown in blog listings..." />
      </div>

      {/* Schedule panel */}
      {showSchedule && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <div className="flex-1">
              <p className="text-blue-300 text-sm font-medium mb-3">Schedule Publication</p>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={e => setScheduleDate(e.target.value)}
                  className="bg-[#080c14] border border-blue-500/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400/50 [color-scheme:dark]"
                />
                <button
                  onClick={() => { if (scheduleDate) save(false, scheduleDate); }}
                  disabled={!scheduleDate || saving || !form.title.trim()}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40">
                  Confirm Schedule
                </button>
              </div>
              <p className="text-slate-600 text-xs mt-2">The post will automatically go live at this date and time (NZ time).</p>
            </div>
          </div>
        </div>
      )}

      {/* AI generate */}
      <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest">Content</h2>
            <p className="text-slate-600 text-xs mt-1">Write your own or let AI draft it from your title</p>
          </div>
          <button onClick={generateWithAI} disabled={generating || !form.title.trim()}
            className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-xs font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-40">
            {generating ? (
              <><div className="w-3.5 h-3.5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />Generating...</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Generate with AI</>
            )}
          </button>
        </div>
        {genError && <div className="mb-3 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{genError}</div>}
        {/* Formatting toolbar */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {[
            { label: 'H2', title: 'Heading', snippet: '<h2>Heading</h2>' },
            { label: 'B', title: 'Bold', snippet: '<strong>bold text</strong>' },
            { label: '¶', title: 'Paragraph', snippet: '<p>Your paragraph here.</p>' },
            { label: '• List', title: 'Bullet List', snippet: '<ul>\n  <li>Item one</li>\n  <li>Item two</li>\n  <li>Item three</li>\n</ul>' },
            { label: '1. List', title: 'Numbered List', snippet: '<ol>\n  <li>First step</li>\n  <li>Second step</li>\n  <li>Third step</li>\n</ol>' },
          ].map(({ label, title, snippet }) => (
            <button key={label} title={title} type="button"
              onClick={() => {
                const ta = document.querySelector('textarea[data-content]') as HTMLTextAreaElement;
                if (!ta) return;
                const start = ta.selectionStart, end = ta.selectionEnd;
                const before = form.content.slice(0, start), after = form.content.slice(end);
                const newVal = before + '\n' + snippet + '\n' + after;
                f('content', newVal);
                setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + snippet.length + 2; ta.focus(); }, 0);
              }}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-400 hover:text-white text-xs font-mono rounded-lg transition-colors">
              {label}
            </button>
          ))}
          <button title="Teal Callout / Insight Box" type="button"
            onClick={() => {
              const ta = document.querySelector('textarea[data-content]') as HTMLTextAreaElement;
              if (!ta) return;
              const snippet = '<div class="post-callout"><p><strong>Key insight:</strong> Write your tip, insight, or highlight here.</p></div>';
              const start = ta.selectionStart;
              const before = form.content.slice(0, start), after = form.content.slice(start);
              const newVal = before + '\n' + snippet + '\n' + after;
              f('content', newVal);
              setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + snippet.length + 2; ta.focus(); }, 0);
            }}
            className="px-2.5 py-1 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/20 text-cyan-400 text-xs font-semibold rounded-lg transition-colors">
            💡 Callout
          </button>
        </div>
        <textarea data-content value={form.content} onChange={e => f('content', e.target.value)}
          rows={18} placeholder="Start writing your post here, or click 'Generate with AI' above..."
          className="w-full bg-[#080c14] border border-white/8 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-400/50 resize-y font-mono leading-relaxed" />
        <p className="text-slate-700 text-xs mt-2">You can write in plain text or HTML. The website will display it formatted.</p>
      </div>

      {/* Meta */}
      <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-6 space-y-4">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest">Post Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Category</label>
            <select value={form.category} onChange={e => f('category', e.target.value)}
              className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Status</label>
            <select value={form.status} onChange={e => { f('status', e.target.value); if (e.target.value === 'scheduled') setShowSchedule(true); else setShowSchedule(false); }}
              className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50">
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Schedule date picker — shown when status is Scheduled */}
        {(form.status === 'scheduled' || showSchedule) && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <label className="text-xs text-blue-400 font-semibold mb-2 flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Scheduled Publish Date &amp; Time
            </label>
            <input
              type="datetime-local"
              value={scheduleDate}
              min={new Date().toISOString().slice(0, 16)}
              onChange={e => setScheduleDate(e.target.value)}
              className="w-full bg-[#080c14] border border-blue-500/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-400/50 [color-scheme:dark]"
            />
            <p className="text-slate-500 text-xs mt-2">Post will automatically go live at this date and time (NZ time).</p>
          </div>
        )}

        <Field label="Author Name" value={form.author} onChange={v => f('author', v)} placeholder="PinPoint Local AI" />
        {/* Cover image */}
        <div>
          <label className="text-xs text-slate-500 mb-1.5 block">Cover Image</label>
          {form.cover_image && (
            <img src={form.cover_image} alt="Cover preview" className="w-full h-36 object-cover rounded-xl mb-3 bg-white/5" />
          )}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit mb-3">
            <button onClick={() => setCoverMode('url')}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${coverMode === 'url' ? 'bg-cyan-400/20 text-cyan-400' : 'text-slate-500 hover:text-white'}`}>
              URL
            </button>
            <button onClick={() => setCoverMode('upload')}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${coverMode === 'upload' ? 'bg-cyan-400/20 text-cyan-400' : 'text-slate-500 hover:text-white'}`}>
              Upload
            </button>
          </div>
          {coverMode === 'url' ? (
            form.cover_image ? (
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-xs">Image set</span>
                <button onClick={() => f('cover_image', '')} className="text-xs text-red-400 hover:text-red-300 transition-colors">Remove</button>
              </div>
            ) : (
              <input type="url" value={form.cover_image} onChange={e => f('cover_image', e.target.value)}
                placeholder="https://yoursite.com/image.jpg"
                className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400/50 transition-colors" />
            )
          ) : (
            <>
              <input ref={coverFileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f2 = e.target.files?.[0]; if (f2) uploadCoverImage(f2); e.target.value = ''; }} />
              <button onClick={() => coverFileRef.current?.click()} disabled={uploadingCover}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40">
                {uploadingCover ? (
                  <><div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin" />Uploading...</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Choose image</>
                )}
              </button>
              {form.cover_image && (
                <button onClick={() => f('cover_image', '')} className="ml-3 text-xs text-red-400 hover:text-red-300 transition-colors">Remove</button>
              )}
            </>
          )}
          {coverError && <p className="text-red-400 text-xs mt-2">{coverError}</p>}
        </div>
        {/* Tags */}
        <div>
          <label className="text-xs text-slate-500 mb-1.5 block">Tags</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1.5 bg-white/5 border border-white/8 text-slate-300 text-xs px-2.5 py-1 rounded-lg">
                {tag}
                <button onClick={() => removeTag(tag)} className="text-slate-600 hover:text-red-400 transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input ref={tagRef} type="text" placeholder="Add tag..." value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); }}}
              className="flex-1 bg-[#080c14] border border-white/8 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-400/50" />
            <button onClick={addTag} className="px-3 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 text-sm rounded-xl transition-colors">Add</button>
          </div>
        </div>
      </div>

      <div className="flex justify-between pb-4">
        <button onClick={() => setView('list')} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-400 text-sm rounded-xl transition-colors">
          Cancel
        </button>
        <div className="flex gap-2">
          <button onClick={() => save(false)} disabled={saving || !form.title.trim()}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-40">
            Save Draft
          </button>
          {showSchedule && scheduleDate && (
            <button onClick={() => save(false, scheduleDate)} disabled={saving || !form.title.trim()}
              className="px-5 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40">
              Confirm Schedule
            </button>
          )}
          <button onClick={() => save(true)} disabled={saving || !form.title.trim()}
            className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-[#080c14] text-sm font-bold rounded-xl transition-colors disabled:opacity-40">
            Publish Now
          </button>
        </div>
      </div>
    </div>
  );

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white font-semibold text-lg">Blog Manager</h1>
          <p className="text-slate-500 text-xs mt-0.5">Write posts or generate them with AI</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-[#080c14] text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          New Post
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-5">
          <div className="text-3xl font-bold text-white mb-1">{counts.all}</div>
          <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Total Posts</div>
        </div>
        <div className="bg-[#0d1420] border border-emerald-500/20 rounded-2xl p-5">
          <div className="text-3xl font-bold text-emerald-400 mb-1">{counts.published}</div>
          <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Published</div>
        </div>
        <div className="bg-[#0d1420] border border-amber-500/20 rounded-2xl p-5">
          <div className="text-3xl font-bold text-amber-400 mb-1">{counts.draft}</div>
          <div className="text-slate-500 text-xs uppercase tracking-wide font-medium">Drafts</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit mb-6">
        {(['all', 'published', 'scheduled', 'draft', 'archived'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`text-xs px-4 py-2 rounded-lg capitalize transition-colors ${filterStatus === s ? 'bg-cyan-400/20 text-cyan-400' : 'text-slate-500 hover:text-white'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-[#0d1420] border border-white/8 rounded-2xl h-24 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </div>
          <p className="text-slate-500 text-sm font-medium">No posts yet</p>
          <p className="text-slate-700 text-xs mt-1">Create your first post or generate one with AI</p>
          <button onClick={openNew} className="mt-4 px-5 py-2.5 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/20 text-cyan-400 text-sm font-semibold rounded-xl transition-colors">
            Write First Post
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(post => {
            const sts = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
            return (
              <div key={post.id} className="bg-[#0d1420] border border-white/8 hover:border-white/15 rounded-2xl p-5 transition-all group">
                <div className="flex items-start gap-4">
                  {post.cover_image && (
                    <img src={post.cover_image} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 bg-white/5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-white font-semibold text-sm">{post.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${sts.bg} ${sts.text}`}>{sts.label}</span>
                      {post.authored_by === 'ai' && (
                        <span className="text-xs px-2 py-0.5 rounded-full border bg-purple-500/10 border-purple-500/20 text-purple-300">AI</span>
                      )}
                    </div>
                    {post.excerpt && <p className="text-slate-500 text-xs line-clamp-2 mb-1">{post.excerpt}</p>}
                    <div className="flex items-center gap-3 text-slate-700 text-xs">
                      <span>{post.category}</span>
                      {post.published_at && <span>Published {new Date(post.published_at).toLocaleDateString('en-NZ')}</span>}
                      <span>By {post.author}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(post)}
                      className="text-xs text-slate-400 hover:text-white border border-white/8 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors">
                      Edit
                    </button>
                    <button onClick={() => deletePost(post.id)}
                      className="text-xs text-slate-600 hover:text-red-400 border border-white/8 hover:border-red-500/20 hover:bg-red-500/5 px-3 py-1.5 rounded-lg transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info banner */}
      <div className="mt-8 bg-purple-500/5 border border-purple-500/15 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <svg className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          <div>
            <p className="text-purple-300 text-sm font-medium mb-1">AI Blog Generation</p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Click <strong className="text-slate-400">New Post</strong>, enter a title and category, then hit <strong className="text-slate-400">Generate with AI</strong>. The AI will write a full post tailored to your business. You can edit before publishing. Automatic weekly AI posts coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
