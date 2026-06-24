import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: `Professional social media image for a local NZ business: ${prompt}. Clean, modern, high quality.`,
      n: 1,
      size: '1536x1024',
      quality: 'high',
    });

    const imageData = response.data?.[0];
    if (!imageData) return NextResponse.json({ error: 'No image returned' }, { status: 500 });

    // gpt-image-1 returns base64, not a URL
    if (imageData.b64_json) {
      const url = `data:image/png;base64,${imageData.b64_json}`;
      return NextResponse.json({ url });
    }

    // Fallback for URL-based response
    if (imageData.url) {
      return NextResponse.json({ url: imageData.url });
    }

    return NextResponse.json({ error: 'No image data in response' }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
