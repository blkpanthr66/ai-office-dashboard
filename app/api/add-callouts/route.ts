import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { content } = await req.json();
  if (!content) return NextResponse.json({ error: 'No content provided' }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are editing an HTML blog post. Add 2 teal callout boxes at natural points in the content — after a key point or insight, or before a list of tips.

Use EXACTLY this HTML for each callout (no other format):
<div class="post-callout"><p><strong>Key insight:</strong> Your insight text here.</p></div>

Rules:
- Insert callouts INSIDE the existing HTML, not at the start or end
- Keep all existing HTML exactly as-is — only INSERT callout divs, do not rewrite anything
- First callout: after roughly the 1/3 mark of the content
- Second callout: after roughly the 2/3 mark of the content
- The callout text should be a concise, punchy insight (1-2 sentences) relevant to the surrounding content
- Use labels like "Key insight:", "Pro tip:", "Remember:", or "Important:" — vary them

Return ONLY the updated HTML with callouts inserted. No explanation, no markdown, just the HTML.

Content to enhance:
${content}`,
      }],
    });

    const updated = message.content[0].type === 'text' ? message.content[0].text.trim() : content;
    return NextResponse.json({ content: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
