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
  'AI Tools & Platforms',
  'Ecommerce & Online Sales',
  'Website Design & Trends',
  'Local SEO',
  'AI Receptionist',
  'Digital Marketing',
  'Business Technology',
  'AI in Everyday Business',
];

// Topic prompts give the AI a specific angle to write about per category
const CATEGORY_TOPICS: Record<string, string[]> = {
  'AI & Business Growth': [
    'how AI is changing the way small businesses compete in 2026',
    'practical ways AI is helping NZ business owners save time and win more customers',
    'the biggest AI trends shaping small business in 2026',
  ],
  'AI & Automation': [
    'automating repetitive tasks so business owners can focus on growth',
    'how workflow automation is replacing manual admin for small businesses',
    'tools that automate lead follow-up, bookings, and customer communication',
  ],
  'AI Tools & Platforms': [
    'a plain-English overview of the latest AI tools worth knowing about (ChatGPT, Claude, Gemini, Copilot)',
    'how the big LLM platforms differ and which is best for small business use cases',
    'new AI features in everyday tools like Google, Microsoft 365, and social media platforms',
    'what the latest model releases mean for NZ business owners',
  ],
  'Ecommerce & Online Sales': [
    'what is new in ecommerce and how NZ businesses can sell more online in 2026',
    'AI-powered tools that are transforming online stores and product discovery',
    'how small NZ retailers can compete with big brands using smart ecommerce tools',
    'the rise of AI shopping assistants and what it means for online sellers',
  ],
  'Website Design & Trends': [
    'the latest website design trends NZ businesses should know about in 2026',
    'how AI website builders are changing what is possible for small business sites',
    'why fast, mobile-first websites are more important than ever for local businesses',
    'what makes a website actually convert visitors into paying customers',
  ],
  'Local SEO': [
    'how to get found on Google in your local area without paying for ads',
    'Google Business Profile tips that actually move the needle for NZ businesses',
    'why local citations and reviews are critical for local search ranking',
  ],
  'AI Receptionist': [
    'how AI phone answering is helping NZ trades and service businesses never miss a call',
    'what happens when a small business switches to an AI receptionist',
    'the cost of missed calls and how AI receptionists are solving it',
  ],
  'Digital Marketing': [
    'social media strategies that are working for NZ small businesses in 2026',
    'how to use AI to create better content and marketing faster',
    'Google Ads vs organic SEO: what makes sense for a local NZ business',
  ],
  'Business Technology': [
    'the tech stack a modern NZ small business should have in 2026',
    'how cloud tools are levelling the playing field for small business owners',
    'cybersecurity basics every small business owner needs to know',
  ],
  'AI in Everyday Business': [
    'real examples of NZ business owners using AI in their day-to-day work',
    'how to use ChatGPT or Claude to write better emails, quotes, and proposals',
    'AI tools that save small business owners hours every week',
  ],
};

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

  const topics = CATEGORY_TOPICS[category] ?? [];
  const topicHint = topics.length > 0
    ? `Suggested angle for this post: "${topics[Math.floor(Math.random() * topics.length)]}"`
    : '';

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `You are a content writer for PinPoint Local AI, a digital growth agency based in Rotorua, New Zealand. You help local NZ businesses grow with websites, local SEO, AI receptionists, and automation.

Write a complete, publish-ready blog post in the category: "${category}".
${topicHint ? `${topicHint}\n` : ''}${region ? `This post is focused on the ${region} region of New Zealand — reference ${region} naturally 2-3 times throughout.` : `This post is for a general NZ business audience — broad, practical advice about AI, technology, and business growth applicable to any NZ business.`}

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

  // Try direct parse first, then fall back to field extraction
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    // Extract fields individually to handle unescaped content in the HTML
    const titleMatch = jsonMatch[0].match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const excerptMatch = jsonMatch[0].match(/"excerpt"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const contentMatch = jsonMatch[0].match(/"content"\s*:\s*"([\s\S]*?)"\s*\}/);

    if (!titleMatch || !excerptMatch || !contentMatch) {
      throw new Error('Could not extract fields from AI response');
    }

    return {
      title: titleMatch[1],
      excerpt: excerptMatch[1],
      content: contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
    };
  }
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
  const isRegional = Math.random() < 0.15;
  const region = isRegional ? pickRegion(recentTitles) : null;
  const category = pickCategory(recentPosts);

  const { title, excerpt, content } = await generatePost(region, category, recentTitles);
  const slug = slugify(title);

  const categoryImageQueries: Record<string, string> = {
    'AI & Business Growth':       'artificial intelligence business office',
    'AI & Automation':            'business automation technology laptop',
    'AI Tools & Platforms':       'AI chatbot technology screen interface',
    'Ecommerce & Online Sales':   'ecommerce online shopping technology',
    'Website Design & Trends':    'web design laptop modern interface',
    'Local SEO':                  'small business owner smartphone google',
    'AI Receptionist':            'business phone call office reception',
    'Digital Marketing':          'digital marketing social media business',
    'Business Technology':        'business technology team office',
    'AI in Everyday Business':    'business owner laptop AI technology office',
  };
  const unsplashQuery = categoryImageQueries[category] ?? 'small business owner technology';
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

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  void req;

  // after() keeps the Vercel function alive after the response is sent
  after(generateAndPublish().catch(err =>
    console.error('[auto-blog] background generation failed:', err)
  ));

  return NextResponse.json({ success: true, message: 'Blog generation started' });
}
