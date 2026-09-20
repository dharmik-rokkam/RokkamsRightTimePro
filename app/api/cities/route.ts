import { NextRequest, NextResponse } from 'next/server';
import { isValidTimezone } from '@/lib/timezone';

// City search backed by DrikPanchang's own city database, so every city we offer
// is one DrikPanchang has (and returns the geoname id the scrape needs).

interface DrikGeoname {
  id: string;
  city: string;
  state?: string;
  country?: string;
  latitude: string;
  longitude: string;
  elevation?: string;
  olson_timezone: string;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2 || q.length > 60) {
    return NextResponse.json({ cities: [] });
  }

  try {
    const res = await fetch(
      `https://www.drikpanchang.com/ajax/geo/dp-city-search.php?search=${encodeURIComponent(q)}&prime-geo=false`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PanchangApp/1.0)' },
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) return NextResponse.json({ error: 'City search unavailable' }, { status: 502 });

    const json = await res.json() as { geonames?: DrikGeoname[] };
    const cities = (json.geonames ?? []).flatMap(g => {
      const geonameId = Number(g.id);
      const lat = Number(g.latitude);
      const lng = Number(g.longitude);
      if (!Number.isInteger(geonameId) || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
      if (!g.city || !isValidTimezone(g.olson_timezone)) return [];
      const elevation = Number(g.elevation);
      return [{
        geonameId,
        city: g.city,
        name: [g.city, g.state, g.country].filter(Boolean).join(', '),
        lat,
        lng,
        elevation: Number.isFinite(elevation) ? elevation : 0,
        timezone: g.olson_timezone,
      }];
    });

    return NextResponse.json({ cities });
  } catch (err) {
    console.error('City search error:', err);
    return NextResponse.json({ error: 'City search unavailable' }, { status: 502 });
  }
}
