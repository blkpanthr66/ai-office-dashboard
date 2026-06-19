import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (or manually by admin)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();

  // Find all scheduled posts whose publish time has passed
  const { data: posts, error } = await supabaseAdmin
    .from('blog_posts')
    .select('id, title')
    .eq('status', 'scheduled')
    .lte('published_at', now);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!posts?.length) return NextResponse.json({ published: 0 });

  // Publish them
  const ids = posts.map(p => p.id);
  await supabaseAdmin
    .from('blog_posts')
    .update({ status: 'published', updated_at: now })
    .in('id', ids);

  console.log(`Published ${posts.length} scheduled post(s):`, posts.map(p => p.title));
  return NextResponse.json({ published: posts.length, titles: posts.map(p => p.title) });
}
