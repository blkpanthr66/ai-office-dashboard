import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const KEYS = [
  'social_auto_enabled',
  'social_auto_topics',
  'social_auto_days',
  'social_auto_tone',
  'social_auto_image',
  'social_auto_last_posted',
];

export async function GET() {
  const { data } = await supabase.from('settings').select('key, value').in('key', KEYS);
  const settings: Record<string, string> = {};
  for (const row of data || []) settings[row.key] = row.value;
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows = Object.entries(body).map(([key, value]) => ({ key, value: String(value) }));
  const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
