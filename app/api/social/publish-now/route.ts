import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAGE_ID = process.env.FACEBOOK_PAGE_ID!;
const PAGE_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN!;

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Post ID required' }, { status: 400 });

  const { data: post, error } = await supabase
    .from('social_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  const result = await postToFacebook(post.message, post.image_url);

  if (result.success) {
    await supabase.from('social_posts').update({
      status: 'published',
      published_at: new Date().toISOString(),
      facebook_post_id: result.id,
    }).eq('id', id);
    return NextResponse.json({ success: true, facebookId: result.id });
  } else {
    await supabase.from('social_posts').update({ error: result.error }).eq('id', id);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
}

async function postToFacebook(message: string, imageUrl?: string | null) {
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
    } else if (imageUrl?.startsWith('http')) {
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
