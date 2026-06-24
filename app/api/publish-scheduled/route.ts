import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
const PAGE_ID = process.env.FACEBOOK_PAGE_ID!;
const PAGE_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN!;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronHeader = req.headers.get('x-vercel-cron');
  const validSecret = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const validVercel = cronHeader === '1';

  if (!validSecret && !validVercel) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();
  const results: { id: string; success: boolean; error?: string }[] = [];

  // ── Publish scheduled blog posts ──────────────────────────────────────────
  const { data: blogPosts, error: blogError } = await supabaseAdmin
    .from('blog_posts')
    .select('id, title')
    .eq('status', 'scheduled')
    .lte('published_at', now);

  if (!blogError && blogPosts?.length) {
    await supabaseAdmin
      .from('blog_posts')
      .update({ status: 'published', updated_at: now })
      .in('id', blogPosts.map(p => p.id));
  }

  // ── Publish scheduled social posts ────────────────────────────────────────
  const { data: socialPosts } = await supabaseAdmin
    .from('social_posts')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now);

  for (const post of socialPosts || []) {
    for (const platform of post.platforms || ['facebook']) {
      if (platform === 'facebook') {
        const res = await postToFacebook(post.message, post.image_url);
        if (res.success) {
          await supabaseAdmin
            .from('social_posts')
            .update({ status: 'published', published_at: now, facebook_post_id: res.id })
            .eq('id', post.id);
          results.push({ id: post.id, success: true });
        } else {
          await supabaseAdmin
            .from('social_posts')
            .update({ status: 'failed', error: res.error })
            .eq('id', post.id);
          results.push({ id: post.id, success: false, error: res.error });
        }
      }
    }
  }

  return NextResponse.json({
    blogPublished: blogPosts?.length || 0,
    socialPublished: results.filter(r => r.success).length,
    socialFailed: results.filter(r => !r.success).length,
  });
}

async function postToFacebook(
  message: string,
  imageUrl?: string | null
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const params: Record<string, string> = {
      message,
      access_token: PAGE_TOKEN,
    };

    let endpoint: string;
    if (imageUrl && /\.(mp4|mov|avi|mkv|webm|m4v)(\?|$)/i.test(imageUrl)) {
      endpoint = `https://graph.facebook.com/v25.0/${PAGE_ID}/videos`;
      params.file_url = imageUrl;
      params.description = message;
      delete params.message;
    } else if (imageUrl && imageUrl.startsWith('http')) {
      endpoint = `https://graph.facebook.com/v25.0/${PAGE_ID}/photos`;
      params.url = imageUrl;
    } else {
      endpoint = `https://graph.facebook.com/v25.0/${PAGE_ID}/feed`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    });
    const data = await res.json();
    if (!res.ok || data.error) return { success: false, error: data.error?.message || 'Facebook error' };
    return { success: true, id: data.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
