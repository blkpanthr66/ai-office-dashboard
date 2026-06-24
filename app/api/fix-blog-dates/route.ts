import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  // Find all posts published on June 24 2026, ordered by created_at
  const { data: posts, error } = await supabaseAdmin
    .from('blog_posts')
    .select('id, title, published_at, created_at')
    .gte('published_at', '2026-06-24T00:00:00.000Z')
    .lte('published_at', '2026-06-24T23:59:59.999Z')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!posts || posts.length === 0) return NextResponse.json({ message: 'No posts found for June 24' });

  // Keep the last one (most recent) as June 24, update the rest
  const toUpdate = posts.slice(0, -1); // all except the last

  // Dates going backwards, skipping June 20 (already has a post)
  const newDates = [
    '2026-06-23',
    '2026-06-22',
    '2026-06-21',
    '2026-06-19',
    '2026-06-18',
    '2026-06-17',
  ];

  const results = [];
  for (let i = 0; i < toUpdate.length; i++) {
    const post = toUpdate[i];
    const newDate = newDates[i];
    if (!newDate) break;

    const { error: updateError } = await supabaseAdmin
      .from('blog_posts')
      .update({ published_at: `${newDate}T09:00:00.000Z` })
      .eq('id', post.id);

    results.push({
      id: post.id,
      title: post.title,
      old_date: post.published_at,
      new_date: newDate,
      success: !updateError,
      error: updateError?.message,
    });
  }

  return NextResponse.json({ updated: results, kept_as_today: posts[posts.length - 1].title });
}
