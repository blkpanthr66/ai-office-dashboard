import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PAGE_ID = process.env.FACEBOOK_PAGE_ID!;
const PAGE_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN!;
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // Allow Vercel cron, valid secret, or ?force=true for manual testing from dashboard
  const auth = req.headers.get('authorization');
  const isCron = req.headers.get('x-vercel-cron') === '1';
  const isForced = new URL(req.url).searchParams.get('force') === 'true';
  const hasSecret = CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
  if (CRON_SECRET && !isCron && !hasSecret && !isForced) {
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
        'social_auto_last_posted_index',
      ]);

    const settings: Record<string, string> = {};
    for (const row of rows || []) settings[row.key] = row.value;

    if (settings.social_auto_enabled !== 'true') {
      return NextResponse.json({ skipped: 'Auto-posting is disabled' });
    }

    const todayDate = new Date().toISOString().slice(0, 10);

    if (!isForced) {
      // Check if today is a scheduled day
      const days = JSON.parse(settings.social_auto_days || '["tuesday","thursday"]');
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      if (!days.includes(today)) {
        return NextResponse.json({ skipped: `Not a posting day (today is ${today})` });
      }

      // Check we haven't already posted today
      const lastPosted = settings.social_auto_last_posted;
      if (lastPosted === todayDate) {
        return NextResponse.json({ skipped: 'Already posted today' });
      }
    }

    const tone = settings.social_auto_tone || 'engaging';

    // Services and audiences to rotate through for variety
    const SERVICES = [
      'AI receptionist (never miss a call, 24/7 answering)',
      'local SEO — getting found on Google in your area',
      'Answer Engine Optimisation (AEO) — showing up in AI search results',
      'Google Business Profile optimisation',
      'one-page mobile-first websites that convert visitors into leads',
      'digital marketing for local NZ businesses',
      'automated lead generation and follow-up',
      'AI tools that save small business owners hours every week',
    ];

    const AUDIENCES = [
      'tradies (plumbers, electricians, builders, painters)',
      'husband and wife business teams',
      'family-run businesses',
      'solo operators and one-person businesses',
      'professional services (accountants, lawyers, consultants)',
      'small retail and hospitality businesses',
      'service businesses juggling jobs and admin',
      'NZ small business owners who wear all the hats',
    ];

    // Use manual topics from dashboard if set, otherwise AI picks service + audience
    const manualTopics: string[] = JSON.parse(settings.social_auto_topics || '[]');
    const topicIndex = parseInt(settings.social_auto_last_posted_index || '0');

    let topic: string;
    let pexelsQuery: string;

    if (manualTopics.length > 0) {
      topic = manualTopics[topicIndex % manualTopics.length];
      pexelsQuery = topic;
    } else {
      const service = SERVICES[topicIndex % SERVICES.length];
      const audience = AUDIENCES[topicIndex % AUDIENCES.length];
      topic = `${service} — for ${audience}`;
      pexelsQuery = service;
    }

    const POST_FORMATS = [
      'Start with a relatable question the business owner asks themselves. Then answer it.',
      'Open with a short punchy story or scenario (2-3 sentences), then tie it back to the solution.',
      'Share a surprising stat or fact, then explain what it means for NZ small businesses.',
      'Write it as a quick tip or insight — "Here\'s something most NZ business owners don\'t realise..."',
      'Use a before/after format — what life looks like without this, versus with it.',
      'Write it as a myth-busting post — "A lot of NZ business owners think X, but actually..."',
      'Open with a pain point, then pivot to the solution with a hopeful tone.',
      'Write a short motivational post that speaks to the hustle of running a small NZ business.',
    ];
    const postFormat = POST_FORMATS[topicIndex % POST_FORMATS.length];

    // Generate copy with Claude
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 350,
      messages: [{
        role: 'user',
        content: `Write a single ${tone} Facebook post for PinPoint Local AI, a NZ digital growth agency.

Topic: ${topic}
Format: ${postFormat}

PinPoint Local AI helps NZ local businesses grow with: AI receptionists, local SEO, AEO, Google Business Profile, mobile-first websites, digital marketing, and automation.

Rules:
- Write directly as the post — no labels, no preamble, no numbering
- Under 150 words
- Conversational and relatable, speak to the business owner's real situation
- End with 3-5 relevant hashtags
- Reference New Zealand or NZ naturally at least once
- Do not mention pricing`,
      }],
    });

    const postText = (msg.content[0] as { text: string }).text.trim();

    // Topic-specific Pexels queries — matched to each service so the image relates to the post
    const SERVICE_IMAGE_QUERIES: Record<string, string> = {
      'AI receptionist': 'business phone answering service',
      'local SEO': 'google search local business marketing',
      'Answer Engine Optimisation': 'artificial intelligence search technology',
      'Google Business Profile': 'google maps local business listing',
      'one-page': 'mobile website design smartphone',
      'digital marketing': 'digital marketing social media laptop',
      'lead generation': 'business sales leads customer',
      'AI tools': 'business productivity technology automation',
    };

    // Pick the image query based on whichever service keyword matches the current topic
    const matchedQuery = Object.entries(SERVICE_IMAGE_QUERIES).find(([key]) =>
      topic.toLowerCase().includes(key.toLowerCase())
    );
    const mediaQuery = matchedQuery ? matchedQuery[1] : 'new zealand small business owner';

    let mediaUrl: string | undefined;
    let mediaType: 'photo' | 'video' | undefined;

    if (settings.social_auto_image === 'true' && process.env.PEXELS_API_KEY) {
      try {
        // Always use Pexels with topic-specific query so image matches post content
        const pRes = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(mediaQuery)}&per_page=20&orientation=landscape`,
          { headers: { Authorization: process.env.PEXELS_API_KEY } }
        );
        const pData = await pRes.json();
        const photos = pData.photos || [];
        // Pick from first 15 results with offset based on topicIndex for variety
        const offset = topicIndex % Math.max(photos.length, 1);
        const pick = photos[offset] || photos[0];
        if (pick?.src?.large2x) { mediaUrl = pick.src.large2x; mediaType = 'photo'; }
      } catch (mediaErr) {
        console.error('[auto-post] media fetch failed:', mediaErr);
      }
    }

    // Post to Facebook
    const params: Record<string, string> = { access_token: PAGE_TOKEN };
    let endpoint: string;

    if (mediaType === 'video' && mediaUrl) {
      endpoint = `https://graph.facebook.com/v25.0/${PAGE_ID}/videos`;
      params.file_url = mediaUrl;
      params.description = postText;
    } else if (mediaType === 'photo' && mediaUrl) {
      endpoint = `https://graph.facebook.com/v25.0/${PAGE_ID}/photos`;
      params.message = postText;
      params.url = mediaUrl;
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
      { key: 'social_auto_last_posted_index', value: String(topicIndex + 1) },
    ], { onConflict: 'key' });

    return NextResponse.json({ success: true, topic, mediaType: mediaType || 'text', postId: fbData.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
