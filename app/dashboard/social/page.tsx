'use client';
import { useState, useRef } from 'react';

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook', color: 'bg-blue-600', icon: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )},
];

type Post = {
  message: string;
  imageUrl: string;
  scheduledAt: string;
  platforms: string[];
};

export default function SocialPage() {
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['facebook']);
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [history, setHistory] = useState<Post[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function togglePlatform(id: string) {
    setPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setImagePreview(url);
      // For now store the data URL; in production this would upload to storage first
      setImageUrl(url);
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageUrl('');
    setImagePreview('');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handlePost() {
    if (!message.trim() || platforms.length === 0) return;
    setPosting(true);
    setResult(null);

    try {
      // If image is a data URL (local file), we can't send it directly to Facebook
      // We send imageUrl only if it's an http/https URL
      const sendImageUrl = imageUrl.startsWith('http') ? imageUrl : undefined;

      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          imageUrl: sendImageUrl,
          scheduledAt: scheduledAt || undefined,
          platforms,
        }),
      });

      const data = await res.json();

      const fbResult = data.results?.facebook;
      if (fbResult?.success) {
        const isScheduled = !!scheduledAt;
        setResult({ success: true, message: isScheduled ? 'Post scheduled successfully!' : 'Post published to Facebook!' });
        setHistory(prev => [{ message, imageUrl, scheduledAt, platforms }, ...prev]);
        setMessage('');
        setImageUrl('');
        setImagePreview('');
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
  const charCount = message.length;
  const overLimit = charCount > 63206;

  // Minimum datetime for scheduling (10 min from now)
  const minDateTime = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-white font-semibold text-lg">Social Media</h1>
        <p className="text-slate-500 text-xs mt-0.5">Create and schedule posts for your social platforms</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Composer */}
        <div className="lg:col-span-2 space-y-4">
          {/* Platform selector */}
          <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-4">
            <p className="text-slate-400 text-xs font-medium mb-3">Post to</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                    platforms.includes(p.id)
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                      : 'bg-white/5 border-white/8 text-slate-500 hover:border-white/15'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg ${p.color} flex items-center justify-center text-white`}>
                    {p.icon}
                  </span>
                  {p.label}
                  {platforms.includes(p.id) && (
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
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
              placeholder="What do you want to share with your audience?"
              rows={6}
              className="w-full bg-transparent text-white text-sm placeholder-slate-600 resize-none focus:outline-none leading-relaxed"
            />
            <div className={`text-right text-xs mt-2 ${overLimit ? 'text-red-400' : 'text-slate-600'}`}>
              {charCount.toLocaleString()} / 63,206
            </div>
          </div>

          {/* Image */}
          <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-4">
            <p className="text-slate-400 text-xs font-medium mb-3">Image (optional)</p>

            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full rounded-xl object-cover max-h-64" />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {!imageUrl.startsWith('http') && (
                  <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    <p className="text-amber-400 text-xs">To include this image on Facebook, paste a public URL below instead of uploading a file.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-white/10 hover:border-white/20 rounded-xl p-8 text-center cursor-pointer transition-colors"
                >
                  <svg className="w-8 h-8 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-slate-500 text-sm">Click to upload image</p>
                  <p className="text-slate-700 text-xs mt-1">JPG, PNG, GIF up to 10MB</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-slate-700 text-xs">or paste image URL</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl.startsWith('http') ? imageUrl : ''}
                  onChange={e => setImageUrl(e.target.value)}
                  className="w-full bg-[#080c14] border border-white/8 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Schedule */}
          <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-4">
            <p className="text-slate-400 text-xs font-medium mb-3">Schedule</p>
            <div className="space-y-3">
              <button
                onClick={() => setScheduledAt('')}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all ${
                  !scheduledAt ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-white/5 border-white/8 text-slate-400 hover:border-white/15'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Post now
              </button>
              <div>
                <p className="text-slate-600 text-xs mb-1.5">Or schedule for later</p>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  min={minDateTime}
                  onChange={e => setScheduledAt(e.target.value)}
                  className={`w-full bg-[#080c14] border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/50 ${
                    scheduledAt ? 'border-cyan-500/30' : 'border-white/8'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Post button */}
          <button
            onClick={handlePost}
            disabled={posting || !message.trim() || platforms.length === 0 || overLimit}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white"
          >
            {posting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {isScheduled ? 'Scheduling...' : 'Publishing...'}
              </span>
            ) : isScheduled ? 'Schedule Post' : 'Publish Now'}
          </button>

          {/* Result feedback */}
          {result && (
            <div className={`rounded-xl p-3 text-sm text-center border ${
              result.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {result.success ? '✓ ' : '✗ '}{result.message}
            </div>
          )}

          {/* Tips */}
          <div className="bg-[#0d1420] border border-white/8 rounded-2xl p-4 space-y-2">
            <p className="text-slate-500 text-xs font-medium">Tips</p>
            <p className="text-slate-700 text-xs">Best times to post: Tue–Thu, 9am–12pm or 1pm–3pm NZST</p>
            <p className="text-slate-700 text-xs">Images increase engagement by up to 3×</p>
            <p className="text-slate-700 text-xs">Keep captions under 125 chars for max reach</p>
          </div>
        </div>
      </div>

      {/* Recent posts */}
      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-white font-medium text-sm mb-4">Posted this session</h2>
          <div className="space-y-3">
            {history.map((post, i) => (
              <div key={i} className="bg-[#0d1420] border border-white/8 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm line-clamp-2">{post.message}</p>
                  <p className="text-slate-600 text-xs mt-1">
                    {post.scheduledAt
                      ? `Scheduled for ${new Date(post.scheduledAt).toLocaleString('en-NZ')}`
                      : 'Published now'}
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
