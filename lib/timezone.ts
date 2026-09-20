// Timezone helpers shared by the API route, the calculations and the client.
// All work from an IANA timezone name (e.g. "Asia/Kolkata") so DST and
// half-hour offsets (India +5:30, Nepal +5:45) are handled by Intl.

export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** UTC offset of `tz` at the instant `date`, in minutes (Kolkata → 330). */
export function getUTCOffsetMinutes(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'shortOffset',
  }).formatToParts(date);
  const tzStr = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT+0';
  const match = tzStr.match(/GMT([+-]?)(\d+)?(?::(\d+))?/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (parseInt(match[2] ?? '0') * 60 + parseInt(match[3] ?? '0'));
}

/** 330 → "UTC+5:30", 240 → "UTC+4", -300 → "UTC-5". */
export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

/**
 * The UTC instant at which the wall clock in `tz` reads dateStr hh:mm.
 * Two passes so the offset is taken at the target instant itself, which keeps
 * midnight correct on the day a DST change happens.
 */
export function zonedTimeToUtcMs(dateStr: string, hour: number, minute: number, tz: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const wall = Date.UTC(y, m - 1, d, hour, minute, 0);
  let utc = wall - getUTCOffsetMinutes(new Date(wall), tz) * 60000;
  const offset2 = getUTCOffsetMinutes(new Date(utc), tz);
  utc = wall - offset2 * 60000;
  return utc;
}

/** UTC instant of local midnight at the START of dateStr in `tz`. */
export function localMidnightMs(dateStr: string, tz: string): number {
  return zonedTimeToUtcMs(dateStr, 0, 0, tz);
}

/** Add whole calendar days to a YYYY-MM-DD string (no timezone involved). */
export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

/** Calendar date (YYYY-MM-DD) at instant `date` in `tz`. */
export function localDateString(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date);
}

/** Weekday index (0 = Sunday) of a calendar date. Independent of any timezone. */
export function weekdayOfDateString(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
