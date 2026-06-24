import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PAGE_ID = process.env.FACEBOOK_PAGE_ID!;
const PAGE_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN!;
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get('authorization');
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Load settings
    const { data: rows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', [
        'social_auto_enabled',
        'social_auto_topics',
        'social_auto_days',
        'social_auto_time',
        'social_auto_tone',
        'social_auto_image',
        'social_auto_last_posted',
      ]);

    const settings: Record<string, string> = {};
    for (const row of rows || []) settings[row.key] = row.value;

    if (settings.social_auto_enabled !== 'true') {
      return NextResponse.json({ skipped: 'Auto-posting is disabled' });
    }

    // Check if today is a scheduled day
    const days = JSON.parse(settings.social_auto_days || '["tuesday","thursday"]');
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (!days.includes(today)) {
      return NextResponse.json({ skipped: `Not a posting day (today is ${today})` });
    }

    // Check we haven't already posted today
    const lastPosted = settings.social_auto_last_posted;
    const todayDate = new Date().toISOString().slice(0, 10);
    if (lastPosted === todayDate) {
      return NextResponse.json({ skipped: 'Already posted today' });
    }

    // Pick a topic (rotate through list)
    const topics: string[] = JSON.parse(settings.social_auto_topics || '["AI receptionist for NZ businesses","local SEO tips","missed calls costing businesses money"]');
    const topicIndex = parseInt(settings.social_auto_last_posted_index || '0') % topics.length;
    const topic = topics[topicIndex];
    const tone = settings.social_auto_tone || 'engaging';

    // Generate copy with Claude
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Write a single ${tone} Facebook post about: "${topic}"
Business: PinPoint Local AI — AI tools for NZ local businesses (AI receptionist, local SEO, websites)
Rules: ready to post, 3-5 hashtags at end, under 150 words, no labels or numbering`,
      }],
    });

    const postText = (msg.content[0] as { text: string }).text.trim();

    // Optionally fetch a Pexels image
    let imageUrl: string | undefined;
    if (settings.social_auto_image === 'true' && process.env.PEXELS_API_KEY) {
      try {
        const pexelsRes = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(topic)}&per_page=5&orientation=landscape`,
          { headers: { Authorization: process.env.PEXELS_API_KEY } }
        );
        const pexelsData = await pexelsRes.json();
        imageUrl = pexelsData.photos?.[0]?.src?.large2x;
      } catch { /* skip image if pexels fails */ }
    }

    // Post to Facebook
    const params: Record<string, string> = { access_token: PAGE_TOKEN };
    let endpoint: string;

    if (imageUrl) {
      endpoint = `https://graph.facebook.com/v25.0/${PAGE_ID}/photos`;
      params.message = postText;
      params.url = imageUrl;
    } else {
      endpoint = `https://graph.facebook.com/v25.0/${PAGE_ID}/feed`;
      params.message = postText;
    }

    const fbRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    });
    const fbData = await fbRes.json();

    if (!fbRes.ok || fbData.error) {
      return NextResponse.json({ error: fbData.error?.message || 'Facebook post failed' }, { status: 500 });
    }

    // Update last posted date and topic index
    await supabase.from('settings').upsert([
      { key: 'social_auto_last_posted', value: todayDate },
      { key: 'social_auto_last_posted_index', value: String((topicIndex + 1) % topics.length) },
    ], { onConflict: 'key' });

    return NextResponse.json({ success: true, topic, postId: fbData.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
