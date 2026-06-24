import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET — returns the current featured post data
export async function GET() {
  // Fetch settings
  const { data: settings } = await supabaseAdmin
    .from('settings')
    .select('key, value')
    .in('key', ['featured_post_slug', 'featured_post_mode', 'featured_post_last_rotated']);

  const map: Record<string, string> = {};
  for (const row of settings || []) map[row.key] = row.value;

  let slug = map['featured_post_slug'];
  const mode = map['featured_post_mode'] || 'manual';
  const lastRotated = map['featured_post_last_rotated'];

  // Auto-rotate: if mode is auto and 3+ days have passed, pick the next most recent published post
  if (mode === 'auto' && lastRotated) {
    const daysSince = (Date.now() - new Date(lastRotated).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= 3) {
      const { data: posts } = await supabaseAdmin
        .from('blog_posts')
        .select('slug')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(10);

      if (posts && posts.length > 0) {
        const currentIndex = posts.findIndex(p => p.slug === slug);
        const nextIndex = (currentIndex + 1) % posts.length;
        slug = posts[nextIndex].slug;

        // Update settings
        await supabaseAdmin.from('settings').upsert([
          { key: 'featured_post_slug', value: slug, updated_at: new Date().toISOString() },
          { key: 'featured_post_last_rotated', value: new Date().toISOString(), updated_at: new Date().toISOString() },
        ]);
      }
    }
  }

  if (!slug) return NextResponse.json({ post: null, mode });

  const { data: post } = await supabaseAdmin
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image, category, published_at')
    .eq('slug', slug)
    .single();

  return NextResponse.json({ post, mode, lastRotated });
}

// POST — update featured post slug and/or mode
export async function POST(req: NextRequest) {
  const body = await req.json() as { slug?: string; mode?: string };

  const updates: { key: string; value: string; updated_at: string }[] = [];
  const now = new Date().toISOString();

  if (body.slug !== undefined) {
    updates.push({ key: 'featured_post_slug', value: body.slug, updated_at: now });
    updates.push({ key: 'featured_post_last_rotated', value: now, updated_at: now });
  }
  if (body.mode !== undefined) {
    updates.push({ key: 'featured_post_mode', value: body.mode, updated_at: now });
  }

  if (updates.length > 0) {
    const { error } = await supabaseAdmin.from('settings').upsert(updates);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
