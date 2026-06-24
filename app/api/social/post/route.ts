import { NextRequest, NextResponse } from 'next/server';

const PAGE_ID = process.env.FACEBOOK_PAGE_ID!;
const PAGE_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, imageUrl, scheduledAt, platforms } = body as {
      message: string;
      imageUrl?: string;
      scheduledAt?: string; // ISO string
      platforms: string[];
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const results: Record<string, { success: boolean; id?: string; error?: string }> = {};

    if (platforms.includes('facebook')) {
      results.facebook = await postToFacebook(message, imageUrl, scheduledAt);
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error('Social post error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function postToFacebook(
  message: string,
  imageUrl?: string,
  scheduledAt?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    let endpoint: string;
    const params: Record<string, string> = {
      message,
      access_token: PAGE_TOKEN,
    };

    if (scheduledAt) {
      const ts = Math.floor(new Date(scheduledAt).getTime() / 1000);
      const now = Math.floor(Date.now() / 1000);
      // Facebook requires scheduled time to be 10min–30days in future
      if (ts < now + 600 || ts > now + 30 * 24 * 3600) {
        return { success: false, error: 'Scheduled time must be 10 minutes to 30 days in the future' };
      }
      params.scheduled_publish_time = String(ts);
      params.published = 'false';
    }

    if (imageUrl && isVideo(imageUrl)) {
      // Video post
      endpoint = `https://graph.facebook.com/v25.0/${PAGE_ID}/videos`;
      params.file_url = imageUrl;
      params.description = message;
      delete params.message;
    } else if (imageUrl) {
      // Photo post
      endpoint = `https://graph.facebook.com/v25.0/${PAGE_ID}/photos`;
      params.url = imageUrl;
    } else {
      // Text post
      endpoint = `https://graph.facebook.com/v25.0/${PAGE_ID}/feed`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message || 'Facebook API error' };
    }

    return { success: true, id: data.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

function isVideo(url: string) {
  return /\.(mp4|mov|avi|mkv|webm|m4v)(\?|$)/i.test(url);
}
