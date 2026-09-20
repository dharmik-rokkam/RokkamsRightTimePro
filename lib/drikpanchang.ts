// Fetches Baana, Bhadra, Vidal Yoga, Varjyam, Dur Muhurtam, Amrit Kalam and the special
// yogas directly from DrikPanchang for the selected city (keyed on its geoname id).
// Called server-side from the /api/panchang route.

import type { Location, TimeInterval } from '@/types/panchang';
import { addDays, zonedTimeToUtcMs } from './timezone';

/** Lower-case, accent- and punctuation-free form, with HTML entities decoded. */
function normalizeName(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** The page <title> names the city it was rendered for ("… Panchangam for Mumbai, Maharashtra, India"). */
function pageIsForCity(html: string, city: string | undefined): boolean {
  const want = normalizeName(city ?? '');
  if (!want) return true; // nothing reliable to compare (e.g. non-Latin name)
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '';
  return normalizeName(title).includes(want);
}

// ─── HTML helpers ────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Walk the whole panchang HTML once and map each row label → list of raw
 * value-cell HTML (one entry per window, in order).
 *
 * DrikPanchang renders the timings as a 2-column grid. A row holds up to two
 * (key, value) pairs — column 0 and column 1. When a timing has more than one
 * window, the extra window is a continuation row whose key cell is EMPTY, in the
 * same column as the labelled window above it. So we track the last non-empty
 * label per column and attach empty-key value cells to it.
 */
function extractAllValues(pageHtml: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const push = (label: string, html: string) => {
    if (!label) return;
    const arr = map.get(label);
    if (arr) arr.push(html); else map.set(label, [html]);
  };

  // Row start positions.
  const rowRe = /<div[^>]*class="[^"]*dpTableRow[^"]*"[^>]*>/gi;
  const rowStarts: number[] = [];
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(pageHtml)) !== null) rowStarts.push(rm.index);

  const lastLabel: string[] = []; // per column

  for (let i = 0; i < rowStarts.length; i++) {
    const rowHtml = pageHtml.slice(rowStarts[i], i + 1 < rowStarts.length ? rowStarts[i + 1] : pageHtml.length);

    // Cells within this row, in order (key/value alternating; value cells hold
    // only spans, so the cell ends at the first </div>).
    const cellRe = /class="dpTableCell (dpTableKey|dpTableValue)"[^>]*>/gi;
    const cells: { type: 'key' | 'value'; html: string }[] = [];
    let cm: RegExpExecArray | null;
    while ((cm = cellRe.exec(rowHtml)) !== null) {
      const start = cm.index + cm[0].length;
      const end = rowHtml.indexOf('</div>', start);
      cells.push({ type: cm[1] === 'dpTableKey' ? 'key' : 'value', html: end === -1 ? '' : rowHtml.slice(start, end) });
    }

    // Group into (key, value) pairs; pair index = column.
    for (let j = 0; j + 1 < cells.length; j += 2) {
      if (cells[j].type !== 'key' || cells[j + 1].type !== 'value') continue;
      const col = j / 2;
      const keyText = stripHtml(cells[j].html);
      if (keyText) {
        lastLabel[col] = keyText;
        push(keyText, cells[j + 1].html);
      } else if (lastLabel[col]) {
        // Continuation window (empty label) → belongs to the column's last label.
        push(lastLabel[col], cells[j + 1].html);
      }
    }
  }

  return map;
}

// ─── Time parsing ─────────────────────────────────────────────────────────────

/** Parse "HH:MM AM" or "HH:MM PM" → minutes since midnight. */
function parseHHMM(s: string): number | null {
  const m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

/** A panchang calendar day in a city's own timezone. */
interface Day { dateStr: string; tz: string }

/**
 * The UTC instant at which the city's wall clock reads `minutes` after midnight on `day`
 * (or on the following day). Read from the wall clock, not counted as elapsed time, so it
 * stays right on the day daylight saving starts or ends.
 */
function at(day: Day, minutes: number, nextDay: boolean): Date {
  return new Date(zonedTimeToUtcMs(nextDay ? addDays(day.dateStr, 1) : day.dateStr, Math.floor(minutes / 60), minutes % 60, day.tz));
}

/**
 * Given a slice of HTML that comes AFTER a time string, return true if it
 * contains a month-name date reference inside a dpInlineBlock span — meaning
 * that time is on the NEXT calendar day.
 */
function nextDayDateFollows(htmlAfterTime: string): boolean {
  return /dpInlineBlock[^>]*>[^<]*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(
    htmlAfterTime.slice(0, 300)
  );
}

/**
 * Locate time tokens in the raw HTML, tolerant of the <span> tags DrikPanchang
 * inserts between the digits and the AM/PM marker (e.g. "12:29 <span>PM</span>").
 */
function findTimeTokens(raw: string): { mins: number; startPos: number; endPos: number }[] {
  const re = /(\d{1,2}):(\d{2})(?:\s|<[^>]*>)*?(AM|PM)/gi;
  const out: { mins: number; startPos: number; endPos: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
    out.push({ mins: h * 60 + min, startPos: m.index, endPos: re.lastIndex });
  }
  return out;
}

// ─── Per-cell parsers ──────────────────────────────────────────────────────────

/** Parse a single Baana value cell ("TYPE upto/from … / range"). */
function parseBaanaCell(raw: string, sunrise: Date, nextSunrise: Date, day: Day): TimeInterval[] {
  if (!raw || /^\s*(&nbsp;)?\s*$/.test(raw)) return [];

  const text = stripHtml(raw);

  const typeMatch = text.match(/^([A-Za-z]+)\s+/);
  const label = typeMatch ? typeMatch[1] : undefined;

  // "TYPE upto HH:MM[, Mon DD]" — ends at the given time (active from before sunrise)
  const uptoM = text.match(/upto\s+(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  if (uptoM) {
    const mins = parseHHMM(uptoM[1]);
    if (mins === null) return [];
    const posAfterTime = raw.indexOf(uptoM[1]) + uptoM[1].length;
    const isNextDay = nextDayDateFollows(raw.slice(posAfterTime));
    const end = at(day, mins, isNextDay);
    const clipEnd = new Date(Math.min(end.getTime(), nextSunrise.getTime()));
    if (clipEnd <= sunrise) return [];
    return [{ start: sunrise, end: clipEnd, label }];
  }

  // "TYPE from HH:MM[, Mon DD] to Full Night" — starts at the given time
  if (/full\s*night/i.test(text)) {
    const fromM = text.match(/from\s+(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    if (fromM) {
      const mins = parseHHMM(fromM[1]);
      if (mins === null) return [];
      const posAfterTime = raw.indexOf(fromM[1]) + fromM[1].length;
      const isNextDay = nextDayDateFollows(raw.slice(posAfterTime));
      const start = at(day, mins, isNextDay);
      const clipStart = new Date(Math.max(start.getTime(), sunrise.getTime()));
      if (clipStart >= nextSunrise) return [];
      return [{ start: clipStart, end: nextSunrise, label }];
    }
  }

  // Explicit "HH:MM to HH:MM" range within the day
  const times = [...text.matchAll(/(\d{1,2}:\d{2}\s*(?:AM|PM))/gi)];
  if (times.length >= 2) {
    const startMins = parseHHMM(times[0][1]);
    const endMins   = parseHHMM(times[1][1]);
    if (startMins === null || endMins === null) return [];
    const t0pos = raw.indexOf(times[0][1]);
    const t1pos = raw.indexOf(times[1][1], t0pos + times[0][1].length);
    const start = at(day, startMins, nextDayDateFollows(raw.slice(t0pos - 5, t0pos + 100)));
    const end   = at(day, endMins,   nextDayDateFollows(raw.slice(t1pos - 5, t1pos + 100)));
    const clipStart = new Date(Math.max(start.getTime(), sunrise.getTime()));
    const clipEnd   = new Date(Math.min(end.getTime(),   nextSunrise.getTime()));
    if (clipEnd <= clipStart) return [];
    return [{ start: clipStart, end: clipEnd, label }];
  }

  return [];
}

/**
 * Parse a single value cell presented as a time range over the panchang day
 * (e.g. "05:19 AM to 11:46 PM"), possibly crossing into the next day
 * ("…, Jun 25") or "Full Night". Used for Vidaal Yoga, Varjyam, Bhadra,
 * Dur Muhurtam.
 */
function parseRangeCell(raw: string, sunrise: Date, nextSunrise: Date, day: Day): TimeInterval[] {
  if (!raw || /^\s*(&nbsp;)?\s*$/.test(raw)) return [];

  const text = stripHtml(raw);
  const toks = findTimeTokens(raw);
  if (toks.length === 0) return [];

  const nextDayAfter = (fromPos: number, toPos: number) => nextDayDateFollows(raw.slice(fromPos, toPos));

  // "Full Night" end → starts at first time, clips to nextSunrise
  if (/full\s*night/i.test(text)) {
    const t = toks[0];
    const start = at(day, t.mins, nextDayAfter(t.endPos, t.endPos + 220));
    const clipStart = new Date(Math.max(start.getTime(), sunrise.getTime()));
    if (clipStart >= nextSunrise) return [];
    return [{ start: clipStart, end: nextSunrise }];
  }

  // "upto HH:MM" → started before sunrise, single end time
  if (/upto/i.test(text)) {
    const t = toks[0];
    const end = at(day, t.mins, nextDayAfter(t.endPos, t.endPos + 220));
    const clipEnd = new Date(Math.min(end.getTime(), nextSunrise.getTime()));
    if (clipEnd <= sunrise) return [];
    return [{ start: sunrise, end: clipEnd }];
  }

  // "START to END[, Mon DD]" range — DrikPanchang's explicit times are
  // authoritative, so use them exactly (a window may legitimately end a few
  // minutes past the next sunrise, e.g. an overnight Amrit Kalam continuation).
  if (toks.length >= 2) {
    const a = toks[0], b = toks[1];
    const startNextDay = nextDayAfter(a.endPos, b.startPos);
    const endNextDay   = startNextDay || nextDayAfter(b.endPos, b.endPos + 220);
    const start = at(day, a.mins, startNextDay);
    const end   = at(day, b.mins, endNextDay  );
    if (end.getTime() <= start.getTime()) return [];
    return [{ start, end }];
  }

  return [];
}

// ─── Multi-window wrappers ──────────────────────────────────────────────────────

function sortByStart(ivs: TimeInterval[]): TimeInterval[] {
  return ivs.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function parseBaana(values: string[], sunrise: Date, nextSunrise: Date, day: Day): TimeInterval[] {
  return sortByStart(values.flatMap(v => parseBaanaCell(v, sunrise, nextSunrise, day)));
}

function parseRange(values: string[], sunrise: Date, nextSunrise: Date, day: Day): TimeInterval[] {
  return sortByStart(values.flatMap(v => parseRangeCell(v, sunrise, nextSunrise, day)));
}

/** Special yogas use the range format, plus a "Whole Day" value → sunrise..nextSunrise. */
function parseSpecialYogaCell(raw: string, sunrise: Date, nextSunrise: Date, day: Day): TimeInterval[] {
  if (!raw || /^\s*(&nbsp;)?\s*$/.test(raw)) return [];
  if (/whole\s*day|all\s*day|full\s*day/i.test(stripHtml(raw))) return [{ start: sunrise, end: nextSunrise }];
  return parseRangeCell(raw, sunrise, nextSunrise, day);
}

function parseSpecialYoga(values: string[], sunrise: Date, nextSunrise: Date, day: Day): TimeInterval[] {
  return sortByStart(values.flatMap(v => parseSpecialYogaCell(v, sunrise, nextSunrise, day)));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface DrikSpecialYogas {
  raviYoga: TimeInterval[];
  sarvarthaSiddhi: TimeInterval[];
  amritaSiddhi: TimeInterval[];
  dwipushkar: TimeInterval[];
  tripushkar: TimeInterval[];
  guruPushya: TimeInterval[];
  raviPushya: TimeInterval[];
}

/**
 * @param localDateStr the panchang's calendar date (YYYY-MM-DD) in the city's own timezone
 */
export async function fetchDrikInauspicious(
  sunrise: Date,
  nextSunrise: Date,
  localDateStr: string,
  location: Location
): Promise<{ ok: boolean; baana: TimeInterval[]; bhadra: TimeInterval[]; vidalYoga: TimeInterval[]; varjyam: TimeInterval[]; durMuhurta: TimeInterval[]; amritKalam: TimeInterval[]; specialYogas: DrikSpecialYogas }> {
  // DrikPanchang takes the date as DD/MM/YYYY
  const [yyyy, mm, dd] = localDateStr.split('-');
  const dateStr = `${dd}/${mm}/${yyyy}`;

  const day: Day = { dateStr: localDateStr, tz: location.timezone };

  const emptySpecial: DrikSpecialYogas = { raviYoga: [], sarvarthaSiddhi: [], amritaSiddhi: [], dwipushkar: [], tripushkar: [], guruPushya: [], raviPushya: [] };
  const empty = { ok: false, baana: [], bhadra: [], vidalYoga: [], varjyam: [], durMuhurta: [], amritKalam: [], specialYogas: emptySpecial };

  if (!location.geonameId) return empty;

  try {
    const res = await fetch(
      `https://www.drikpanchang.com/panchang/day-panchang.html?geoname-id=${location.geonameId}&date=${dateStr}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PanchangApp/1.0)' },
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) return empty;
    const html = await res.text();
    // Guard against blocked/captcha pages that return 200 but lack the panchang table.
    if (!/dpTableKey/.test(html) || !/Inauspicious Timings/i.test(html)) return empty;
    // Guard against DrikPanchang serving a different city than the one we asked for.
    if (!pageIsForCity(html, location.city)) return empty;
    const values = extractAllValues(html);
    const v = (label: string) => values.get(label) ?? [];

    return {
      ok: true,
      baana:      parseBaana(v('Baana'), sunrise, nextSunrise, day),
      bhadra:     parseRange(v('Bhadra'), sunrise, nextSunrise, day),
      vidalYoga:  parseRange(v('Vidaal Yoga'), sunrise, nextSunrise, day),
      varjyam:    parseRange(v('Varjyam'), sunrise, nextSunrise, day),
      durMuhurta: parseRange(v('Dur Muhurtam'), sunrise, nextSunrise, day),
      amritKalam: parseRange(v('Amrit Kalam'), sunrise, nextSunrise, day),
      specialYogas: {
        raviYoga:        parseSpecialYoga(v('Ravi Yoga'),            sunrise, nextSunrise, day),
        sarvarthaSiddhi: parseSpecialYoga(v('Sarvartha Siddhi Yoga'), sunrise, nextSunrise, day),
        amritaSiddhi:    parseSpecialYoga(v('Amrita Siddhi Yoga'),   sunrise, nextSunrise, day),
        dwipushkar:      parseSpecialYoga(v('Dwipushkar Yoga'),      sunrise, nextSunrise, day),
        tripushkar:      parseSpecialYoga(v('Tripushkar Yoga'),      sunrise, nextSunrise, day),
        guruPushya:      parseSpecialYoga(v('Guru Pushya Yoga'),     sunrise, nextSunrise, day),
        raviPushya:      parseSpecialYoga(v('Ravi Pushya Yoga'),     sunrise, nextSunrise, day),
      },
    };
  } catch {
    return empty;
  }
}
