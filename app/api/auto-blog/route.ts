import { NextRequest, NextResponse, after } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

async function generatePost(region: string | null, category: string, recentTitles: string[]): Promise<{ title: string; excerpt: string; content: string }> {
  const recentList = recentTitles.slice(0, 10).map(t => `- ${t}`).join('\n');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `You are a content writer for PinPoint Local AI, a digital growth agency based in Rotorua, New Zealand. You help local NZ businesses grow with websites, local SEO, AI receptionists, and automation.

Write a complete, publish-ready blog post in the category: "${category}".
${region ? `This post is focused on the ${region} region of New Zealand — reference ${region} naturally 2-3 times throughout.` : `This post is for a general NZ business audience — broad, practical advice about AI, technology, and business growth applicable to any NZ business.`}

Do NOT write about any of these recently published topics:
${recentList}

Requirements:
- Audience: NZ small business owners, trades, and service businesses
- Tone: practical, warm, expert — not salesy
- Length: 700–1000 words
- Use simple HTML only: <h2>, <p>, <ul>, <li>, <strong>
- Include a clear intro, 3–4 sections with <h2> headings, and a closing paragraph mentioning PinPoint Local AI
- Include 2 teal callout boxes at natural points using EXACTLY this HTML:
  <div class="post-callout"><p><strong>Key insight:</strong> Your tip here.</p></div>
- Do NOT include the H1 title in the content
- Always refer to the current year as 2026 — never use 2025
- Do NOT use markdown, em dashes (—), or the URL pinpointlocalai.co.nz — use pinpointlocal.ai

Respond in this exact JSON format only:
{
  "title": "${region ? `SEO-friendly title that includes ${region}` : 'SEO-friendly title for a general NZ business audience'}",
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

async function generateAndPublish() {
  const recentPosts = await getRecentPosts();
  const recentTitles = recentPosts.map(p => p.title);
  const isRegional = Math.random() < 0.5;
  const region = isRegional ? pickRegion(recentTitles) : null;
  const category = pickCategory(recentPosts);

  const { title, excerpt, content } = await generatePost(region, category, recentTitles);
  const slug = slugify(title);

  const unsplashQuery = region ? `${region} New Zealand business` : `New Zealand business technology AI`;
  const image = await fetchUnsplashImage(unsplashQuery);

  let coverImage: string | null = null;
  if (image) coverImage = await uploadCoverImage(image.url, slug);

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('blog_posts')
    .insert({
      title,
      slug,
      excerpt,
      content,
      category,
      author: 'PinPoint Local AI',
      cover_image: coverImage,
      status: 'published',
      published_at: now,
      created_at: now,
      updated_at: now,
    });

  if (error) throw new Error(error.message);
}

export async function GET(req: NextRequest) {
  void req;

  // Respond immediately so cron-job.org doesn't time out,
  // then generate and publish the post in the background.
  after(async () => {
    try {
      await generateAndPublish();
    } catch (err) {
      console.error('[auto-blog] background generation failed:', err);
    }
  });

  return NextResponse.json({ success: true, message: 'Blog generation started' });
}
