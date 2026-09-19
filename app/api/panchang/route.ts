import { NextRequest, NextResponse } from 'next/server';
import { computePanchang } from '@/lib/calculations/panchang';
import { computeTransitions } from '@/lib/calculations/transitions';
import { computeBusinessSlots } from '@/lib/businessMuhurta';
import { fetchDrikInauspicious } from '@/lib/drikpanchang';
import { MUSCAT } from '@/lib/location';

function getUTCOffsetMinutes(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  }).formatToParts(date);
  const tzStr = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT+0';
  const match = tzStr.match(/GMT([+-]?)(\d+)?(?::(\d+))?/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * ((parseInt(match[2] ?? '0')) * 60 + parseInt(match[3] ?? '0'));
}

function localDateStringToUTC(dateStr: string, timezone: string): Date {
  const noonUTC = new Date(dateStr + 'T12:00:00Z');
  const offsetMin = getUTCOffsetMinutes(noonUTC, timezone);
  return new Date(noonUTC.getTime() - offsetMin * 60000);
}

function roundMin(d: Date | null | undefined): string | null {
  if (!d) return null;
  const sec = d.getSeconds() + d.getMilliseconds() / 1000;
  const rounded = new Date(d.getTime() - sec * 1000 + (sec >= 30 ? 60000 : 0));
  rounded.setMilliseconds(0);
  return rounded.toISOString();
}

function serializeInterval(iv: { start: Date; end: Date; label?: string }) {
  return { start: roundMin(iv.start)!, end: roundMin(iv.end)!, label: iv.label };
}

function serializeMuhurta(m: ReturnType<typeof computePanchang>['muhurta']) {
  return {
    rahuKalam:        serializeInterval(m.rahuKalam),
    gulikaKalam:      serializeInterval(m.gulikaKalam),
    yamaGanda:        serializeInterval(m.yamaGanda),
    abhijitMuhurta:   m.abhijitMuhurta ? serializeInterval(m.abhijitMuhurta) : null,
    brahmaMuhurta:    serializeInterval(m.brahmaMuhurta),
    godhuliMuhurta:   serializeInterval(m.godhuliMuhurta),
    vijayaMuhurta:    serializeInterval(m.vijayaMuhurta),
    pratahSandhya:    serializeInterval(m.pratahSandhya),
    sayahanaSandhya:  serializeInterval(m.sayahanaSandhya),
    nishitaMuhurta:   serializeInterval(m.nishitaMuhurta),
    madhyahnaSandhya: serializeInterval(m.madhyahnaSandhya),
    amritKalam:  m.amritKalam.map(serializeInterval),
    durMuhurta:  m.durMuhurta.map(serializeInterval),
    varjyam:     m.varjyam.map(serializeInterval),
    baana:       m.baana.map(serializeInterval),
    vidalYoga:   m.vidalYoga.map(serializeInterval),
    bhadra:      m.bhadra.map(serializeInterval),
  };
}

// Nishita always ends just past midnight — it belongs to the previous panchang day.
// Vidal Yoga is computed per sunrise-to-sunrise day; the pre-sunrise fragment from
// yesterday's nakshatra is already covered by yesterday's panchang (DrikPanchang only
// shows Vidal from sunrise, not from midnight).
// Baana, Bhadra and Vidal Yoga are sourced from DrikPanchang per panchang day
// (sunrise→sunrise); DrikPanchang never shows them as a next-day pre-sunrise fragment.
const OVERFLOW_EXCLUDE = new Set(['nishitaMuhurta', 'vidalYoga', 'amritKalam', 'baana', 'bhadra', 'varjyam', 'durMuhurta']);

function extractOverflowMuhurta(
  m: ReturnType<typeof serializeMuhurta>,
  midnightMs: number,
  sunriseMs: number,
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, raw] of Object.entries(m)) {
    if (OVERFLOW_EXCLUDE.has(key)) continue;
    if (raw === null) continue;
    const arr: any[] = Array.isArray(raw) ? raw : [raw];
    const overflow = arr
      .filter(iv => iv?.start && iv?.end && new Date(iv.end).getTime() > midnightMs)
      .map(iv => {
        const s = new Date(iv.start).getTime();
        const e = new Date(iv.end).getTime();
        return { ...iv, start: new Date(Math.max(s, midnightMs)).toISOString(), end: new Date(Math.min(e, sunriseMs)).toISOString() };
      })
      .filter(iv => new Date(iv.end).getTime() > new Date(iv.start).getTime());
    if (overflow.length > 0)
      result[key] = Array.isArray(raw) ? overflow : overflow[0];
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date: dateInput } = body;

    if (!dateInput || !/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return NextResponse.json({ error: 'date (YYYY-MM-DD) is required' }, { status: 400 });
    }

    const dateStr: string = dateInput;
    const date = localDateStringToUTC(dateStr, MUSCAT.timezone);

    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    // computePanchang() handles all nakshatra muhurtas internally — no override needed
    const data = computePanchang(date, MUSCAT);

    // Compute element transition times for the full Muscat calendar day (midnight → midnight)
    const offsetMin = getUTCOffsetMinutes(date, MUSCAT.timezone);
    const midnightUTC = new Date(new Date(dateStr + 'T00:00:00Z').getTime() - offsetMin * 60000);
    const nextMidnightUTC = new Date(midnightUTC.getTime() + 86400000);
    const transitions = computeTransitions(midnightUTC, nextMidnightUTC);

    // Previous day's panchang for early morning (midnight → this sunrise) overflow slots
    const yesterday = new Date(date.getTime() - 86400000);
    const prevData = computePanchang(yesterday, MUSCAT);

    const sunrise = data.sunMoonTimes.sunrise;
    const sunriseMs = sunrise.getTime();
    const midnightMs = midnightUTC.getTime();

    const nextSunrise = new Date(data.sunMoonTimes.sunrise.getTime() + 86400000);
    // The actual next sunrise is already computed inside computePanchang; expose it here
    // by re-computing tomorrow's sunrise time
    const tomorrow = new Date(date.getTime() + 86400000);
    const tomorrowData = computePanchang(tomorrow, MUSCAT);
    const nextSunriseDate = tomorrowData.sunMoonTimes.sunrise;

    // Baana, Bhadra and Vidal Yoga come straight from DrikPanchang (Muscat) so they
    // match the source exactly. Cached 24h; falls back to [] if the fetch fails.
    // Only trust the scrape when it clearly succeeded; otherwise keep computePanchang's own
    // baana/bhadra/etc. so a blocked/failed fetch (common on serverless IPs) doesn't wipe them.
    const drik = await fetchDrikInauspicious(sunrise, nextSunriseDate);
    if (drik.ok) {
      data.muhurta.baana      = drik.baana;
      data.muhurta.bhadra     = drik.bhadra;
      data.muhurta.vidalYoga  = drik.vidalYoga;
      data.muhurta.varjyam    = drik.varjyam;
      data.muhurta.durMuhurta = drik.durMuhurta;
      data.muhurta.amritKalam = drik.amritKalam;
    }

    // Special yogas come only from DrikPanchang (no computed fallback) → empty when the scrape failed.
    const specialYogas = drik.ok
      ? Object.fromEntries(Object.entries(drik.specialYogas).map(([k, ivs]) => [k, ivs.map(serializeInterval)]))
      : { raviYoga: [], sarvarthaSiddhi: [], amritaSiddhi: [], dwipushkar: [], tripushkar: [], guruPushya: [], raviPushya: [] };

    const prevMuhurtaSer = serializeMuhurta(prevData.muhurta);

    const rawEarlySlots = computeBusinessSlots(
      transitions as any,
      prevMuhurtaSer as any,
      prevData.vara.index,
      prevData.paksha as 'Shukla' | 'Krishna',
      sunriseMs,
    );
    const earlyMorningSlots = rawEarlySlots.filter(s => s.start >= midnightMs && s.start < sunriseMs);
    const earlyMorningMuhurta = extractOverflowMuhurta(prevMuhurtaSer, midnightMs, sunriseMs);

    const muhurtaSer = serializeMuhurta(data.muhurta);

    const response = {
      ...data,
      date: data.date.toISOString(),
      sunMoonTimes: {
        sunrise:    roundMin(data.sunMoonTimes.sunrise),
        sunset:     roundMin(data.sunMoonTimes.sunset),
        solarNoon:  roundMin(data.sunMoonTimes.solarNoon),
        moonrise:   roundMin(data.sunMoonTimes.moonrise),
        moonset:    roundMin(data.sunMoonTimes.moonset),
        nextSunrise: roundMin(nextSunriseDate),
      },
      muhurta: muhurtaSer,
      specialYogas,
      transitions,
      earlyMorningSlots,
      earlyMorningMuhurta,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('Panchang API error:', err);
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 });
  }
}
