import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const NZ_REGIONS = [
  'Rotorua', 'Auckland', 'Wellington', 'Christchurch', 'Hamilton',
  'Tauranga', 'Dunedin', 'Napier-Hastings', 'Palmerston North', 'Nelson',
  'Queenstown', 'New Plymouth', 'Whangarei', 'Invercargill', 'Whanganui',
];

const CATEGORIES = [
  'AI & Business Growth',
  'AI & Automation',
  'Local SEO',
  'AI Receptionist',
  'Digital Marketing',
  'Websites',
  'Business Technology',
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

async function getRecentPosts(): Promise<{ title: string; category: string }[]> {
  const { data } = await supabaseAdmin
    .from('blog_posts')
    .select('title, category')
    .order('published_at', { ascending: false })
    .limit(20);
  return data || [];
}

function pickRegion(recentTitles: string[]): string {
  const unused = NZ_REGIONS.filter(r => !recentTitles.some(t => t.toLowerCase().includes(r.toLowerCase())));
  const pool = unused.length > 0 ? unused : NZ_REGIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickCategory(recentPosts: { category: string }[]): string {
  const recentCats = recentPosts.slice(0, 5).map(p => p.category);
  const unused = CATEGORIES.filter(c => !recentCats.includes(c));
  const pool = unused.length > 0 ? unused : CATEGORIES;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function generatePost(region: string, category: string, recentTitles: string[]): Promise<{ title: string; excerpt: string; content: string }> {
  const recentList = recentTitles.slice(0, 10).map(t => `- ${t}`).join('\n');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `You are a content writer for PinPoint Local AI, a digital growth agency based in Rotorua, New Zealand. You help local NZ businesses grow with websites, local SEO, AI receptionists, and automation.

Write a complete, publish-ready blog post for the region of ${region}, New Zealand, in the category: "${category}".

The post should focus on current trends in AI, technology, and business growth — and how they apply specifically to businesses in ${region}. Make it feel locally relevant and timely.

Do NOT write about any of these recently published topics:
${recentList}

Requirements:
- Audience: small business owners, trades, and service businesses in ${region} and wider NZ
- Tone: practical, warm, expert — not salesy
- Length: 700–1000 words
- Use simple HTML only: <h2>, <p>, <ul>, <li>, <strong>
- Include a clear intro, 3–4 sections with <h2> headings, and a closing paragraph mentioning PinPoint Local AI
- Naturally reference ${region} and the local business environment at least 2–3 times
- Include 2 teal callout boxes at natural points using EXACTLY this HTML:
  <div class="post-callout"><p><strong>Key insight:</strong> Your tip here.</p></div>
- Do NOT include the H1 title in the content
- Do NOT use markdown, em dashes (—), or the URL pinpointlocalai.co.nz — use pinpointlocal.ai

Respond in this exact JSON format only:
{
  "title": "SEO-friendly blog post title that includes ${region}",
  "excerpt": "One sentence that summarises the post and entices clicks.",
  "content": "<p>Full HTML content here...</p>"
}`,
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI response was not valid JSON');
  return JSON.parse(jsonMatch[0]);
}

async function fetchUnsplashImage(query: string): Promise<{ url: string; credit: string; creditUrl: string } | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  const res = await fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high`,
    { headers: { Authorization: `Client-ID ${key}` } }
  );
  if (!res.ok) return null;

  const photo = await res.json() as {
    urls: { regular: string };
    user: { name: string; links: { html: string } };
  };
  return {
    url: photo.urls.regular,
    credit: photo.user.name,
    creditUrl: photo.user.links.html,
  };
}

async function uploadCoverImage(imageUrl: string, slug: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const path = `blog-covers/${slug}.jpg`;

    const { error } = await supabaseAdmin.storage
      .from('assets')
      .upload(path, buffer, { contentType: 'image/jpeg', upsert: true });

    if (error) return null;

    const { data } = supabaseAdmin.storage.from('assets').getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronHeader = req.headers.get('x-vercel-cron');
  const validSecret = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const validVercel = cronHeader === '1';

  // Also allow logged-in dashboard users
  let validSession = false;
  if (!validSecret && !validVercel) {
    const cookieStore = await cookies();
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    validSession = !!user;
  }

  if (!validSecret && !validVercel && !validSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Pick a fresh region and category
    const recentPosts = await getRecentPosts();
    const recentTitles = recentPosts.map(p => p.title);
    const region = pickRegion(recentTitles);
    const category = pickCategory(recentPosts);

    // 2. Generate post with Claude
    const { title, excerpt, content } = await generatePost(region, category, recentTitles);
    const slug = slugify(title);

    // 3. Fetch cover image from Unsplash
    const unsplashQuery = `${region} New Zealand business technology`;
    const image = await fetchUnsplashImage(unsplashQuery);

    // 4. Upload cover image to Supabase storage
    let coverImage: string | null = null;
    if (image) {
      coverImage = await uploadCoverImage(image.url, slug);
    }

    // 5. Publish to Supabase
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .insert({
        title,
        slug,
        excerpt,
        content,
        category,
        cover_image: coverImage,
        status: 'published',
        published_at: now,
        created_at: now,
        updated_at: now,
      })
      .select('id, slug')
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      post: { id: data.id, slug: data.slug, title, category, cover_image: coverImage },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
