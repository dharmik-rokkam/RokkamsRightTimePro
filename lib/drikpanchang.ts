// Fetches Baana, Bhadra, Vidal Yoga, Varjyam and Dur Muhurtam timings directly
// from DrikPanchang (Muscat). Called server-side from the /api/panchang route.

import type { TimeInterval } from '@/types/panchang';

const GEO_ID = '287286'; // Muscat, Oman
const TZ_HOURS = 4;      // UTC+4

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

/** Minutes-since-midnight on a given local calendar midnight (UTC Date). */
function minutesToDate(minutes: number, midnight: Date): Date {
  return new Date(midnight.getTime() + minutes * 60000);
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
function parseBaanaCell(raw: string, sunrise: Date, nextSunrise: Date, localMidnight: Date): TimeInterval[] {
  if (!raw || /^\s*(&nbsp;)?\s*$/.test(raw)) return [];

  const text = stripHtml(raw);
  const nextMidnight = new Date(localMidnight.getTime() + 86400000);

  const typeMatch = text.match(/^([A-Za-z]+)\s+/);
  const label = typeMatch ? typeMatch[1] : undefined;

  // "TYPE upto HH:MM[, Mon DD]" — ends at the given time (active from before sunrise)
  const uptoM = text.match(/upto\s+(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  if (uptoM) {
    const mins = parseHHMM(uptoM[1]);
    if (mins === null) return [];
    const posAfterTime = raw.indexOf(uptoM[1]) + uptoM[1].length;
    const isNextDay = nextDayDateFollows(raw.slice(posAfterTime));
    const end = minutesToDate(mins, isNextDay ? nextMidnight : localMidnight);
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
      const start = minutesToDate(mins, isNextDay ? nextMidnight : localMidnight);
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
    const start = minutesToDate(startMins, nextDayDateFollows(raw.slice(t0pos - 5, t0pos + 100)) ? nextMidnight : localMidnight);
    const end   = minutesToDate(endMins,   nextDayDateFollows(raw.slice(t1pos - 5, t1pos + 100)) ? nextMidnight : localMidnight);
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
function parseRangeCell(raw: string, sunrise: Date, nextSunrise: Date, localMidnight: Date): TimeInterval[] {
  if (!raw || /^\s*(&nbsp;)?\s*$/.test(raw)) return [];

  const text = stripHtml(raw);
  const nextMidnight = new Date(localMidnight.getTime() + 86400000);
  const toks = findTimeTokens(raw);
  if (toks.length === 0) return [];

  const nextDayAfter = (fromPos: number, toPos: number) => nextDayDateFollows(raw.slice(fromPos, toPos));

  // "Full Night" end → starts at first time, clips to nextSunrise
  if (/full\s*night/i.test(text)) {
    const t = toks[0];
    const start = minutesToDate(t.mins, nextDayAfter(t.endPos, t.endPos + 220) ? nextMidnight : localMidnight);
    const clipStart = new Date(Math.max(start.getTime(), sunrise.getTime()));
    if (clipStart >= nextSunrise) return [];
    return [{ start: clipStart, end: nextSunrise }];
  }

  // "upto HH:MM" → started before sunrise, single end time
  if (/upto/i.test(text)) {
    const t = toks[0];
    const end = minutesToDate(t.mins, nextDayAfter(t.endPos, t.endPos + 220) ? nextMidnight : localMidnight);
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
    const start = minutesToDate(a.mins, startNextDay ? nextMidnight : localMidnight);
    const end   = minutesToDate(b.mins, endNextDay   ? nextMidnight : localMidnight);
    if (end.getTime() <= start.getTime()) return [];
    return [{ start, end }];
  }

  return [];
}

// ─── Multi-window wrappers ──────────────────────────────────────────────────────

function sortByStart(ivs: TimeInterval[]): TimeInterval[] {
  return ivs.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function parseBaana(values: string[], sunrise: Date, nextSunrise: Date, localMidnight: Date): TimeInterval[] {
  return sortByStart(values.flatMap(v => parseBaanaCell(v, sunrise, nextSunrise, localMidnight)));
}

function parseRange(values: string[], sunrise: Date, nextSunrise: Date, localMidnight: Date): TimeInterval[] {
  return sortByStart(values.flatMap(v => parseRangeCell(v, sunrise, nextSunrise, localMidnight)));
}

/** Special yogas use the range format, plus a "Whole Day" value → sunrise..nextSunrise. */
function parseSpecialYogaCell(raw: string, sunrise: Date, nextSunrise: Date, localMidnight: Date): TimeInterval[] {
  if (!raw || /^\s*(&nbsp;)?\s*$/.test(raw)) return [];
  if (/whole\s*day|all\s*day|full\s*day/i.test(stripHtml(raw))) return [{ start: sunrise, end: nextSunrise }];
  return parseRangeCell(raw, sunrise, nextSunrise, localMidnight);
}

function parseSpecialYoga(values: string[], sunrise: Date, nextSunrise: Date, localMidnight: Date): TimeInterval[] {
  return sortByStart(values.flatMap(v => parseSpecialYogaCell(v, sunrise, nextSunrise, localMidnight)));
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

export async function fetchDrikInauspicious(
  sunrise: Date,
  nextSunrise: Date
): Promise<{ ok: boolean; baana: TimeInterval[]; bhadra: TimeInterval[]; vidalYoga: TimeInterval[]; varjyam: TimeInterval[]; durMuhurta: TimeInterval[]; amritKalam: TimeInterval[]; specialYogas: DrikSpecialYogas }> {
  // Format the panchang date as DD/MM/YYYY in Muscat local time
  const localDate = new Date(sunrise.getTime() + TZ_HOURS * 3600000);
  const dd = localDate.getUTCDate().toString().padStart(2, '0');
  const mm = (localDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const yyyy = localDate.getUTCFullYear();
  const dateStr = `${dd}/${mm}/${yyyy}`;

  // Local midnight of the panchang calendar day (UTC)
  const localMidnight = new Date(
    Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate())
    - TZ_HOURS * 3600000
  );

  const emptySpecial: DrikSpecialYogas = { raviYoga: [], sarvarthaSiddhi: [], amritaSiddhi: [], dwipushkar: [], tripushkar: [], guruPushya: [], raviPushya: [] };
  const empty = { ok: false, baana: [], bhadra: [], vidalYoga: [], varjyam: [], durMuhurta: [], amritKalam: [], specialYogas: emptySpecial };

  try {
    const res = await fetch(
      `https://www.drikpanchang.com/panchang/day-panchang.html?geoname-id=${GEO_ID}&date=${dateStr}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PanchangApp/1.0)' },
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) return empty;
    const html = await res.text();
    // Guard against blocked/captcha pages that return 200 but lack the panchang table.
    if (!/dpTableKey/.test(html) || !/Inauspicious Timings/i.test(html)) return empty;
    const values = extractAllValues(html);
    const v = (label: string) => values.get(label) ?? [];

    return {
      ok: true,
      baana:      parseBaana(v('Baana'), sunrise, nextSunrise, localMidnight),
      bhadra:     parseRange(v('Bhadra'), sunrise, nextSunrise, localMidnight),
      vidalYoga:  parseRange(v('Vidaal Yoga'), sunrise, nextSunrise, localMidnight),
      varjyam:    parseRange(v('Varjyam'), sunrise, nextSunrise, localMidnight),
      durMuhurta: parseRange(v('Dur Muhurtam'), sunrise, nextSunrise, localMidnight),
      amritKalam: parseRange(v('Amrit Kalam'), sunrise, nextSunrise, localMidnight),
      specialYogas: {
        raviYoga:        parseSpecialYoga(v('Ravi Yoga'),            sunrise, nextSunrise, localMidnight),
        sarvarthaSiddhi: parseSpecialYoga(v('Sarvartha Siddhi Yoga'), sunrise, nextSunrise, localMidnight),
        amritaSiddhi:    parseSpecialYoga(v('Amrita Siddhi Yoga'),   sunrise, nextSunrise, localMidnight),
        dwipushkar:      parseSpecialYoga(v('Dwipushkar Yoga'),      sunrise, nextSunrise, localMidnight),
        tripushkar:      parseSpecialYoga(v('Tripushkar Yoga'),      sunrise, nextSunrise, localMidnight),
        guruPushya:      parseSpecialYoga(v('Guru Pushya Yoga'),     sunrise, nextSunrise, localMidnight),
        raviPushya:      parseSpecialYoga(v('Ravi Pushya Yoga'),     sunrise, nextSunrise, localMidnight),
      },
    };
  } catch {
    return empty;
  }
}
