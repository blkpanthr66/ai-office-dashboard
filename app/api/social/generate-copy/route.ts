import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { topic, tone, platform } = await req.json();
    if (!topic?.trim()) return NextResponse.json({ error: 'Topic is required' }, { status: 400 });

    const toneGuide = tone === 'professional' ? 'professional and authoritative'
      : tone === 'casual' ? 'friendly and conversational'
      : tone === 'promotional' ? 'exciting and sales-focused'
      : 'engaging and approachable';

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Write 3 different ${platform} post captions about: "${topic}"
Tone: ${toneGuide}
Business: PinPoint Local AI — AI-powered tools for NZ local businesses (AI receptionist, local SEO, websites)

Rules:
- Each caption is self-contained and ready to post
- Include 3–5 relevant hashtags at the end
- Keep each under 200 words
- Separate each option with "---"
- No numbering or labels, just the captions`
      }],
    });

    const text = (msg.content[0] as { text: string }).text;
    const options = text.split('---').map(s => s.trim()).filter(Boolean);
    return NextResponse.json({ options });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
