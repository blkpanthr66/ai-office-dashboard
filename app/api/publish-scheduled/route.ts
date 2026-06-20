import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  // Accept Vercel Cron header OR Bearer secret from cron-job.org
  const authHeader = req.headers.get('authorization');
  const cronHeader = req.headers.get('x-vercel-cron');
  const validSecret = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const validVercel = cronHeader === '1';

  if (!validSecret && !validVercel) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();

  const { data: posts, error } = await supabaseAdmin
    .from('blog_posts')
    .select('id, title')
    .eq('status', 'scheduled')
    .lte('published_at', now);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!posts?.length) return NextResponse.json({ published: 0, message: 'No posts due' });

  const ids = posts.map(p => p.id);
  await supabaseAdmin
    .from('blog_posts')
    .update({ status: 'published', updated_at: now })
    .in('id', ids);

  return NextResponse.json({ published: posts.length, titles: posts.map(p => p.title) });
}
