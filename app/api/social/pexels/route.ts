import { NextRequest, NextResponse } from 'next/server';

const PEXELS_KEY = process.env.PEXELS_API_KEY!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || 'business';
  const type = searchParams.get('type') || 'photos'; // 'photos' | 'videos'
  const page = searchParams.get('page') || '1';

  try {
    const endpoint = type === 'videos'
      ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=12&page=${page}`
      : `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12&page=${page}&orientation=landscape`;

    const res = await fetch(endpoint, { headers: { Authorization: PEXELS_KEY } });
    const data = await res.json();

    if (type === 'videos') {
      const results = (data.videos || []).map((v: any) => ({
        id: v.id,
        type: 'video',
        preview: v.image,
        url: v.video_files?.find((f: any) => f.quality === 'hd')?.link || v.video_files?.[0]?.link,
        width: v.width,
        height: v.height,
        photographer: v.user?.name,
      }));
      return NextResponse.json({ results, total: data.total_results });
    } else {
      const results = (data.photos || []).map((p: any) => ({
        id: p.id,
        type: 'photo',
        preview: p.src.medium,
        url: p.src.large2x,
        width: p.width,
        height: p.height,
        photographer: p.photographer,
      }));
      return NextResponse.json({ results, total: data.total_results });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
