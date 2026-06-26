import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const maxDuration = 60;

const CATEGORY_QUERIES: Record<string, string> = {
  'AI & Business Growth':  'artificial intelligence business office',
  'AI & Automation':       'business automation technology laptop',
  'Local SEO':             'small business owner smartphone google',
  'AI Receptionist':       'business phone call office reception',
  'Digital Marketing':     'digital marketing social media business',
  'Websites':              'web design laptop modern office',
  'Business Technology':   'business technology team office',
};

async function fetchUnsplashImage(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  const res = await fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high`,
    { headers: { Authorization: `Client-ID ${key}` } }
  );
  if (!res.ok) return null;
  const photo = await res.json() as { urls: { regular: string } };
  return photo.urls.regular;
}

async function fetchPexelsImage(query: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`,
    { headers: { Authorization: key } }
  );
  if (!res.ok) return null;
  const data = await res.json() as { photos: { src: { large: string } }[] };
  if (!data.photos?.length) return null;
  const pick = data.photos[Math.floor(Math.random() * data.photos.length)];
  return pick.src.large;
}

async function uploadImage(imageUrl: string, slug: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const path = `blog-covers/${slug}.jpg`;
    const { error } = await supabaseAdmin.storage
      .from('assets')
      .upload(path, buffer, { contentType: 'image/jpeg', upsert: true });
    if (error) return null;
    return supabaseAdmin.storage.from('assets').getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  // Simple secret check so this can't be triggered by anyone
  const secret = new URL(req.url).searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: posts, error } = await supabaseAdmin
    .from('blog_posts')
    .select('id, slug, category')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { slug: string; status: string }[] = [];

  for (const post of posts ?? []) {
    const query = CATEGORY_QUERIES[post.category] ?? 'small business owner technology';

    // Try Unsplash first, fall back to Pexels
    let imgUrl = await fetchUnsplashImage(query);
    if (!imgUrl) imgUrl = await fetchPexelsImage(query);
    if (!imgUrl) { results.push({ slug: post.slug, status: 'no image found' }); continue; }

    const publicUrl = await uploadImage(imgUrl, post.slug);
    if (!publicUrl) { results.push({ slug: post.slug, status: 'upload failed' }); continue; }

    const { error: updateError } = await supabaseAdmin
      .from('blog_posts')
      .update({ cover_image: publicUrl })
      .eq('id', post.id);

    results.push({ slug: post.slug, status: updateError ? `update failed: ${updateError.message}` : 'updated' });

    await new Promise(r => setTimeout(r, 500));
  }

  return NextResponse.json({ updated: results.filter(r => r.status === 'updated').length, results });
}
