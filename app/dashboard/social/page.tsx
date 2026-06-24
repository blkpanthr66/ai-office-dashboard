'use client';
import { useState, useRef } from 'react';

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook', color: 'bg-blue-600', icon: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )},
];

const TONES = [
  { id: 'engaging', label: 'Engaging' },
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'promotional', label: 'Promotional' },
];

type AITab = 'copy' | 'stock' | 'generate';
type StockType = 'photos' | 'videos';

type Post = {
  message: string;
  imageUrl: string;
  scheduledAt: string;
  platforms: string[];
};

export default function SocialPage() {
  // Composer state
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['facebook']);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [history, setHistory] = useState<Post[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // AI panel state
  const [aiTab, setAiTab] = useState<AITab>('copy');
  const [aiOpen, setAiOpen] = useState(false);

  // Copy generation
  const [copyTopic, setCopyTopic] = useState('');
  const [copyTone, setCopyTone] = useState('engaging');
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [copyOptions, setCopyOptions] = useState<string[]>([]);

  // Stock media
  const [stockQuery, setStockQuery] = useState('');
  const [stockType, setStockType] = useState<StockType>('photos');
  const [stockResults, setStockResults] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [stockSearched, setStockSearched] = useState(false);

  // DALL-E
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');

  function togglePlatform(id: string) {
    setPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  async function handleMediaFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVid = file.type.startsWith('video/');
    setMediaType(isVid ? 'video' : 'image');
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/social/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (data.url) {
        setImageUrl(data.url);
      } else {
        setResult({ success: false, message: data.error || 'Upload failed' });
        clearMedia();
      }
    } catch {
      setResult({ success: false, message: 'Upload failed — check your connection' });
      clearMedia();
    } finally {
      setUploading(false);
    }
  }

  function clearMedia() {
    setImageUrl('');
    setImagePreview('');
    setMediaType(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function useStockMedia(item: any) {
    setImageUrl(item.url);
    setImagePreview(item.preview);
    setMediaType(item.type === 'video' ? 'video' : 'image');
    setAiOpen(false);
  }

  function useGeneratedImage(url: string) {
    setImageUrl(url);
    setImagePreview(url);
    setMediaType('image');
    setAiOpen(false);
  }

  async function generateCopy() {
    if (!copyTopic.trim()) return;
    setGeneratingCopy(true);
    setCopyOptions([]);
    try {
      const res = await fetch('/api/social/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: copyTopic, tone: copyTone, platform: platforms[0] || 'facebook' }),
      });
      const data = await res.json();
      if (data.options) setCopyOptions(data.options);
      else setResult({ success: false, message: data.error || 'Copy generation failed' });
    } catch {
      setResult({ success: false, message: 'Copy generation failed' });
    } finally {
      setGeneratingCopy(false);
    }
  }

  async function searchStock() {
    if (!stockQuery.trim()) return;
    setLoadingStock(true);
    setStockResults([]);
    setStockSearched(true);
    try {
      const res = await fetch(`/api/social/pexels?query=${encodeURIComponent(stockQuery)}&type=${stockType}`);
      const data = await res.json();
      setStockResults(data.results || []);
    } catch {
      setResult({ success: false, message: 'Stock search failed' });
    } finally {
      setLoadingStock(false);
    }
  }

  async function generateImage() {
    if (!imagePrompt.trim()) return;
    setGeneratingImage(true);
    setGeneratedImageUrl('');
    try {
      const res = await fetch('/api/social/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt }),
      });
      const data = await res.json();
      if (data.url) setGeneratedImageUrl(data.url);
      else setResult({ success: false, message: data.error || 'Image generation failed' });
    } catch {
      setResult({ success: false, message: 'Image generation failed' });
    } finally {
      setGeneratingImage(false);
    }
  }

  async function handlePost() {
    if (!message.trim() || platforms.length === 0) return;
    if (uploading) {
      setResult({ success: false, message: 'Media is still uploading — please wait' });
      return;
    }
    setPosting(true);
    setResult(null);
    try {
      const sendImageUrl = imageUrl.startsWith('http') ? imageUrl : undefined;
      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, imageUrl: sendImageUrl, scheduledAt: scheduledAt || undefined, platforms }),
      });
      const data = await res.json();
      const fbResult = data.results?.facebook;
      if (fbResult?.success) {
        setResult({ success: true, message: scheduledAt ? 'Post scheduled successfully!' : 'Post published to Facebook!' });
        setHistory(prev => [{ message, imageUrl, scheduledAt, platforms }, ...prev]);
        setMessage('');
        clearMedia();
        setScheduledAt('');
      } else {
        setResult({ success: false, message: fbResult?.error || data.error || 'Something went wrong' });
      }
    } catch {
      setResult({ success: false, message: 'Network error — please try again' });
    } finally {
      setPosting(false);
    }
  }

  const isScheduled = !!scheduledAt;
  const overLimit = message.length > 63206;
  const minDateTime = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white font-semibold text-lg">Social Media</h1>
          <p className="text-slate-500 text-xs mt-0.5">Create and schedule posts for your social platforms</p>
        </div>
        <button
          onClick={() => setAiOpen(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            aiOpen
              ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
              : 'bg-white/5 border-white/8 text-slate-400 hover:border-white/15 hover:text-white'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Assistant
        </button>
      </div>

      {/* AI Assistant Panel */}
      {aiOpen && (
        <div className="bg-[#0d1420] border border-purple-500/20 rounded-2xl p-5 mb-6">
          {/* Tabs */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-5 w-fit">
            {([
              { id: 'copy', label: 'Write Copy', icon: '✍️' },
              { id: 'stock', label: 'Stock Media', icon: '🎞️' },
              { id: 'generate', label: 'AI Image', icon: '🎨' },
            ] as { id: AITab; label: string; icon: string }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setAiTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  aiTab === tab.id ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>

          {/* Copy Tab */}
          {aiTab === 'copy' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-slate-500 text-xs mb-1.5 block">What's the post about?</label>
                  <input
                    type="text"
                    placeholder="e.g. AI receptionist for tradies, missed calls costing money..."
                    value={copyTopic}
                    onChange={e => setCopyTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && generateCopy()}
                    className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-400/50"
                  />
                </div>
                <div>
                  <label className="text-slate-500 text-xs mb-1.5 block">Tone</label>
                  <select
                    value={copyTone}
                    onChange={e => setCopyTone(e.target.value)}
                    className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400/50"
                  >
                    {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <button
                onClick={generateCopy}
                disabled={generatingCopy || !copyTopic.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generatingCopy ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                )}
                {generatingCopy ? 'Generating...' : 'Generate 3 Options'}
              </button>
              {copyOptions.length > 0 && (
                <div className="space-y-3 mt-2">
                  <p className="text-slate-500 text-xs">Click any option to use it in the composer</p>
                  {copyOptions.map((opt, i) => (
                    <div
                      key={i}
                      onClick={() => { setMessage(opt); setAiOpen(false); }}
                      className="bg-[#080c14] border border-white/8 hover:border-purple-400/30 rounded-xl p-4 text-slate-300 text-sm cursor-pointer transition-all whitespace-pre-wrap leading-relaxed hover:bg-purple-500/5"
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stock Tab */}
          {aiTab === 'stock' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search for photos or videos..."
                    value={stockQuery}
                    onChange={e => setStockQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchStock()}
                    className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-400/50"
                  />
                </div>
                <div className="flex bg-white/5 border border-white/8 rounded-xl p-1 gap-0.5">
                  {(['photos', 'videos'] as StockType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setStockType(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                        stockType === t ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >{t}</button>
                  ))}
                </div>
                <button
                  onClick={searchStock}
                  disabled={loadingStock || !stockQuery.trim()}
                  className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                >
                  {loadingStock ? '...' : 'Search'}
                </button>
              </div>

              {loadingStock && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-video bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              )}

              {!loadingStock && stockResults.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {stockResults.map(item => (
                    <div
                      key={item.id}
                      onClick={() => useStockMedia(item)}
                      className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group border border-white/5 hover:border-purple-400/40 transition-all"
                    >
                      <img src={item.preview} alt="" className="w-full h-full object-cover" />
                      {item.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 bg-black/60 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-white text-xs font-medium bg-black/60 px-2 py-1 rounded-lg">Use this</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loadingStock && stockSearched && stockResults.length === 0 && (
                <p className="text-slate-600 text-sm text-center py-6">No results found — try a different search</p>
              )}
              <p className="text-slate-700 text-xs">Powered by Pexels · Free to use</p>
            </div>
          )}

          {/* AI Image Tab */}
          {aiTab === 'generate' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-500 text-xs mb-1.5 block">Describe the image you want</label>
                <textarea
                  placeholder="e.g. A friendly AI robot answering a phone in a modern NZ office, bright and professional..."
                  value={imagePrompt}
                  onChange={e => setImagePrompt(e.target.value)}
                  rows={3}
                  className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-400/50 resize-none"
                />
              </div>
              <button
                onClick={generateImage}
                disabled={generatingImage || !imagePrompt.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generatingImage ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                )}
                {generatingImage ? 'Generating (~15s)...' : 'Generate with DALL-E 3'}
              </button>
              {generatingImage && (
                <div className="aspect-video bg-white/3 rounded-xl border border-white/5 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    <p className="text-slate-500 text-sm">Creating your image...</p>
                  </div>
                </div>
              )}
              {generatedImageUrl && !generatingImage && (
                <div className="space-y-3">
                  <img src={generatedImageUrl} alt="Generated" className="w-full rounded-xl" />
                  <button
                    onClick={() => useGeneratedImage(generatedImageUrl)}
                    className="w-full py-2.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 rounded-xl text-sm font-medium transition-all"
                  >
                    Use this image
                  </button>
                </div>
              )}
              <p className="text-slate-700 text-xs">Powered by DALL-E 3 · ~$0.04 per image</p>
            </div>
          )}
        </div>
      )}

      {/* Composer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Platform selector */}
          <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-4">
            <p className="text-slate-400 text-xs font-medium mb-3">Post to</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => togglePlatform(p.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                    platforms.includes(p.id)
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                      : 'bg-white/5 border-white/8 text-slate-500 hover:border-white/15'
                  }`}>
                  <span className={`w-6 h-6 rounded-lg ${p.color} flex items-center justify-center text-white`}>{p.icon}</span>
                  {p.label}
                  {platforms.includes(p.id) && (
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  )}
                </button>
              ))}
              <span className="flex items-center text-slate-600 text-xs ml-1">Instagram coming soon</span>
            </div>
          </div>

          {/* Message */}
          <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-4">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your post here, or use AI Assistant above to generate copy..."
              rows={6}
              className="w-full bg-transparent text-white text-sm placeholder-slate-600 resize-none focus:outline-none leading-relaxed"
            />
            <div className={`text-right text-xs mt-2 ${overLimit ? 'text-red-400' : 'text-slate-600'}`}>
              {message.length.toLocaleString()} / 63,206
            </div>
          </div>

          {/* Media */}
          <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-4">
            <p className="text-slate-400 text-xs font-medium mb-3">Media (optional)</p>
            {imagePreview ? (
              <div className="relative">
                {mediaType === 'video'
                  ? <video src={imagePreview} controls className="w-full rounded-xl max-h-64" />
                  : <img src={imagePreview} alt="Preview" className="w-full rounded-xl object-cover max-h-64" />
                }
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    <span className="text-white text-sm">Uploading...</span>
                  </div>
                )}
                <button onClick={clearMedia} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                {!uploading && imageUrl.startsWith('http') && (
                  <p className="text-emerald-400 text-xs mt-2">✓ Ready to post</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-white/10 hover:border-white/20 rounded-xl p-8 text-center cursor-pointer transition-colors">
                  <svg className="w-8 h-8 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-slate-500 text-sm">Upload your own image or video</p>
                  <p className="text-slate-700 text-xs mt-1">JPG, PNG, GIF, MP4, MOV</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleMediaFile} className="hidden" />
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-slate-700 text-xs">or use AI Assistant above for stock / generated images</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-4">
            <p className="text-slate-400 text-xs font-medium mb-3">Schedule</p>
            <div className="space-y-3">
              <button onClick={() => setScheduledAt('')}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all ${
                  !scheduledAt ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-white/5 border-white/8 text-slate-400 hover:border-white/15'
                }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Post now
              </button>
              <div>
                <p className="text-slate-600 text-xs mb-1.5">Or schedule for later</p>
                <input type="datetime-local" value={scheduledAt} min={minDateTime}
                  onChange={e => setScheduledAt(e.target.value)}
                  className={`w-full bg-[#080c14] border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/50 ${scheduledAt ? 'border-cyan-500/30' : 'border-white/8'}`}
                />
              </div>
            </div>
          </div>

          <button onClick={handlePost}
            disabled={posting || uploading || !message.trim() || platforms.length === 0 || overLimit}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white">
            {posting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                {isScheduled ? 'Scheduling...' : 'Publishing...'}
              </span>
            ) : isScheduled ? 'Schedule Post' : 'Publish Now'}
          </button>

          {result && (
            <div className={`rounded-xl p-3 text-sm text-center border ${
              result.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {result.success ? '✓ ' : '✗ '}{result.message}
            </div>
          )}

          <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-4 space-y-2">
            <p className="text-slate-500 text-xs font-medium">Tips</p>
            <p className="text-slate-700 text-xs">Best times: Tue–Thu, 9am–12pm or 1–3pm NZST</p>
            <p className="text-slate-700 text-xs">Images increase engagement by up to 3×</p>
            <p className="text-slate-700 text-xs">Keep captions under 125 chars for max reach</p>
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-white font-medium text-sm mb-4">Posted this session</h2>
          <div className="space-y-3">
            {history.map((post, i) => (
              <div key={i} className="bg-[#0d1420] border border-white/8 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm line-clamp-2">{post.message}</p>
                  <p className="text-slate-600 text-xs mt-1">
                    {post.scheduledAt ? `Scheduled for ${new Date(post.scheduledAt).toLocaleString('en-NZ')}` : 'Published now'}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1">
                  {post.scheduledAt ? 'Scheduled' : 'Live'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
