import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { title, category, excerpt } = await req.json();

  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'AI not configured — add ANTHROPIC_API_KEY to Vercel environment variables' }, { status: 500 });

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Write a professional blog post for a New Zealand digital marketing agency called PinPoint Local AI.

Title: "${title}"
Category: ${category || 'General'}
${excerpt ? `Context: ${excerpt}` : ''}

Requirements:
- Write for NZ small business owners as the audience
- Practical, helpful, and authoritative tone
- 600–900 words
- Use simple HTML formatting: <h2> for subheadings, <p> for paragraphs, <ul>/<li> for lists, <strong> for bold
- Include a clear intro, 3–4 key sections, and a call to action at the end mentioning PinPoint Local AI
- Include 1–2 teal callout boxes for key insights or tips using this exact HTML: <div class="post-callout"><p><strong>Key insight:</strong> Your insight here.</p></div>
- Do NOT include the main title (it will be added separately)
- Do NOT include markdown, only HTML tags listed above

Also provide a one-sentence excerpt summarising the post.

Respond in this exact JSON format:
{
  "excerpt": "One sentence summary here.",
  "content": "<p>Full HTML content here...</p>"
}`,
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Unexpected AI response format');
    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ content: parsed.content, excerpt: parsed.excerpt });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
