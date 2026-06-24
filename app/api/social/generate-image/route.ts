import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `Professional social media image for a local NZ business: ${prompt}. Clean, modern, high quality.`,
      n: 1,
      size: '1792x1024',
      quality: 'standard',
    });

    const url = response.data?.[0]?.url;
    if (!url) return NextResponse.json({ error: 'No image returned' }, { status: 500 });

    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
