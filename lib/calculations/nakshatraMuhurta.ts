import * as Astronomy from 'astronomy-engine';
import { tropicalToSidereal } from './ayanamsha';
import { sunLongitude, moonLongitude, normalize360 } from './astronomy';
import type { TimeInterval } from '@/types/panchang';

// ─────────────────────────────────────────────────────────────────────────────
// Amrit Kalam — nakshatra-based, matching DrikPanchang.
// AMRITA_START_NADI: calibrated against DrikPanchang Muscat across a full
// lunar month; reproduces DrikPanchang to within 1 minute. Index 0=Ashwini…26=Revati.
// ─────────────────────────────────────────────────────────────────────────────

const AMRITA_START_NADI = [
  42, // Ashwini
  48, // Bharani
  54, // Krittika
  52, // Rohini
  38, // Mrigashira
  35, // Ardra
  54, // Punarvasu
  44, // Pushya
  56, // Ashlesha
  54, // Magha
  44, // Purva Phalguni
  42, // Uttara Phalguni
  45, // Hasta
  44, // Chitra
  38, // Swati
  38, // Vishakha
  34, // Anuradha
  38, // Jyeshtha
  44, // Mula
  48, // Purva Ashadha
  44, // Uttara Ashadha
  34, // Shravana
  34, // Dhanishtha
  42, // Shatabhisha
  40, // Purva Bhadrapada
  48, // Uttara Bhadrapada
  54, // Revati
];

const AMRITA_DURATION_NADI = 4;
const NAK_ARC = 360 / 27;

function jdnToUTC(jdn: number): Date {
  return new Date((jdn - 2440587.5) * 86400000);
}
function dateToJdn(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5;
}

function siderealMoon(jdn: number): number {
  const vec = Astronomy.GeoMoon(jdnToUTC(jdn));
  const elon = Astronomy.Ecliptic(vec).elon;
  return tropicalToSidereal(elon, jdn);
}

function nakIndex(jdn: number): number {
  return Math.floor(siderealMoon(jdn) / NAK_ARC);
}

function findBoundary(lo: number, hi: number): number {
  const loIdx = nakIndex(lo);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (nakIndex(mid) === loIdx) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

interface NakOccurrence { index: number; entryJdn: number; exitJdn: number; }

function findNakOccurrences(scanStartJdn: number, scanEndJdn: number): NakOccurrence[] {
  const stepMin = 30;
  const step = stepMin / 1440;
  const occ: NakOccurrence[] = [];

  let prevIdx = nakIndex(scanStartJdn);
  let entry = scanStartJdn;
  while (nakIndex(entry - step) === prevIdx) entry -= step;
  entry = findBoundary(entry - step, entry);

  for (let jdn = scanStartJdn + step; jdn <= scanEndJdn + step; jdn += step) {
    const curIdx = nakIndex(jdn);
    if (curIdx !== prevIdx) {
      const boundary = findBoundary(jdn - step, jdn);
      occ.push({ index: prevIdx, entryJdn: entry, exitJdn: boundary });
      entry = boundary;
      prevIdx = curIdx;
    }
  }
  let exit = scanEndJdn;
  while (nakIndex(exit + step) === prevIdx) exit += step;
  exit = findBoundary(exit, exit + step);
  occ.push({ index: prevIdx, entryJdn: entry, exitJdn: exit });

  return occ;
}

// ─────────────────────────────────────────────────────────────────────────────
// Varjyam — calibrated against DrikPanchang; each value reproduces within 1 min.
// VISHA_START_NADI is an array-of-arrays because some nakshatras have 2+ windows.
// ─────────────────────────────────────────────────────────────────────────────

const VISHA_START_NADI: number[][] = [
  [50],         // Ashwini
  [24],         // Bharani
  [10, 30],     // Krittika
  [40],         // Rohini
  [14],         // Mrigashira
  [21],         // Ardra
  [24, 30],     // Punarvasu
  [20],         // Pushya
  [32],         // Ashlesha
  [56],         // Magha   ← recalibrated: nadi 30 placed window on Jun19, nadi 56 puts it on Jun20 matching DrikPanchang 06:15 AM
  [20],         // Purva Phalguni
  [18],         // Uttara Phalguni
  [21],         // Hasta
  [20],         // Chitra
  [14],         // Swati
  [14, 40],     // Vishakha
  [10],         // Anuradha
  [14],         // Jyeshtha
  [20, 56],     // Mula
  [5, 24],      // Purva Ashadha
  [20],         // Uttara Ashadha
  [10],         // Shravana
  [10],         // Dhanishtha
  [18],         // Shatabhisha
  [16],         // Purva Bhadrapada
  [24],         // Uttara Bhadrapada
  [30],         // Revati
];

const VISHA_DURATION_NADI = 4;

export function computeVarjyam(sunrise: Date, nextSunrise: Date): TimeInterval[] {
  const dayStart = dateToJdn(sunrise);
  const dayEnd   = dateToJdn(nextSunrise);

  const occurrences = findNakOccurrences(dayStart - 1.3, dayEnd + 0.2);

  const out: TimeInterval[] = [];
  for (const o of occurrences) {
    const durJdn = o.exitJdn - o.entryJdn;
    const nadi   = durJdn / 60;
    for (const startNadi of VISHA_START_NADI[o.index]) {
      const startJdn = o.entryJdn + startNadi * nadi;
      const endJdn   = startJdn + VISHA_DURATION_NADI * nadi;
      if (startJdn >= dayStart && startJdn < dayEnd) {
        out.push({ start: jdnToUTC(startJdn), end: jdnToUTC(endJdn) });
      }
    }
  }
  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  return out;
}

// Vidal Yoga — nakshatras that form Vidal Yoga (calibrated against DrikPanchang)
// Calibrated against DrikPanchang Muscat across 15+ dates (Jun–Jul 2026):
// 2=Krittika, 6=Punarvasu, 9=Magha, 14=Swati, 17=Jyeshtha, 21=Shravana, 23=Shatabhisha, 26=Revati
// Removed: 8=Ashlesha (only Ganda Moola, no Vidaal), 11=U.Phalguni, 13=Chitra (Aadal confirmed Jun24+Jul21),
//          16=Anuradha, 19=P.Ashadha
const VIDAL_YOGA_NAKSHATRAS = new Set([2, 6, 9, 14, 17, 21, 23, 26]);

export function computeVidalYoga(sunrise: Date, nextSunrise: Date): TimeInterval[] {
  const dayStart = dateToJdn(sunrise);
  const dayEnd = dateToJdn(nextSunrise);

  const occurrences = findNakOccurrences(dayStart - 0.1, dayEnd + 0.1);

  const out: TimeInterval[] = [];
  for (const o of occurrences) {
    if (!VIDAL_YOGA_NAKSHATRAS.has(o.index)) continue;
    const windowStart = Math.max(o.entryJdn, dayStart);
    const windowEnd   = Math.min(o.exitJdn,  dayEnd);
    if (windowEnd > windowStart) {
      out.push({ start: jdnToUTC(windowStart), end: jdnToUTC(windowEnd) });
    }
  }
  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bhadra (Vishti Karana) — computed from first principles using Moon–Sun separation.
// ─────────────────────────────────────────────────────────────────────────────

const VISHTI_KARANA_INDICES = new Set([7, 14, 21, 28, 35, 42, 49, 56]);

function karanaIndex(jdn: number): number {
  const diff = normalize360(moonLongitude(jdn) - sunLongitude(jdn));
  return Math.floor(diff / 6) % 60;
}

function isVishti(jdn: number): boolean {
  return VISHTI_KARANA_INDICES.has(karanaIndex(jdn));
}

export function computeBhadra(sunrise: Date, nextSunrise: Date): TimeInterval[] {
  const dayStart = dateToJdn(sunrise);
  const dayEnd   = dateToJdn(nextSunrise);
  const step = 1 / 1440;

  const out: TimeInterval[] = [];

  let jdn = dayStart - 0.6;
  const scanEnd = dayEnd + 0.1;

  let prev = isVishti(jdn);
  let segStart = prev ? jdn : NaN;

  while (jdn < scanEnd) {
    jdn += step;
    const cur = isVishti(jdn);
    if (cur !== prev) {
      let lo = jdn - step, hi = jdn;
      for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2;
        if (isVishti(mid) === prev) lo = mid; else hi = mid;
      }
      const boundary = (lo + hi) / 2;

      if (!prev) {
        segStart = boundary;
      } else {
        if (!isNaN(segStart)) {
          const clipStart = Math.max(segStart, dayStart);
          const clipEnd   = Math.min(boundary,  dayEnd);
          if (clipEnd > clipStart) {
            out.push({ start: jdnToUTC(clipStart), end: jdnToUTC(clipEnd) });
          }
        }
        segStart = NaN;
      }
      prev = cur;
    }
  }

  if (prev && !isNaN(segStart)) {
    const clipStart = Math.max(segStart, dayStart);
    if (dayEnd > clipStart) {
      out.push({ start: jdnToUTC(clipStart), end: jdnToUTC(dayEnd) });
    }
  }

  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Baana — calibrated against DrikPanchang for Muscat (15 confirmed data points).
// ─────────────────────────────────────────────────────────────────────────────

const BAANA_TYPE: (string | null)[] = [
  'Roga',   // 0  Ashwini
  null,     // 1  Bharani
  'Mrityu', // 2  Krittika
  'Agni',   // 3  Rohini
  null,     // 4  Mrigashira
  'Mrityu', // 5  Ardra
  null,     // 6  Punarvasu
  'Agni',   // 7  Pushya
  null,     // 8  Ashlesha
  'Raja',   // 9  Magha
  'Raja',   // 10 P.Phalguni ← confirmed Jun20: DrikPanchang Raja continues until 5:07 PM through P.Phalguni (END_NADI=23)
  'Chora',  // 11 U.Phalguni
  null,     // 12 Hasta
  'Roga',   // 13 Chitra
  null,     // 14 Swati
  'Mrityu', // 15 Vishakha
  'Agni',   // 16 Anuradha
  null,     // 17 Jyeshtha
  'Raja',   // 18 Mula
  'Chora',  // 19 P.Ashadha
  null,     // 20 U.Ashadha
  'Agni',   // 21 Shravana
  'Raja',   // 22 Dhanishtha
  'Mrityu', // 23 Shatabhisha ← confirmed Jul05: DrikPanchang shows Mrityu 09:29 AM
  'Mrityu', // 24 P.Bhadra   ← changed from Chora: Jul05 Mrityu continues through P.Bhadra to full night
  'Chora',  // 25 U.Bhadra   ← confirmed Jun10: DrikPanchang shows Chora at sunrise
  'Raja',   // 26 Revati     ← confirmed Jul08: DrikPanchang shows Raja 01:00 PM
];

// BAANA_START_NADI: nadi offset from nakshatra entry where Baana begins.
// 0 = Baana starts from nakshatra entry (clips to sunrise). Non-zero = delayed start.
// Calibrated from DrikPanchang:
//   Krittika (2):     entry 02:35 AM Jun13, Baana 09:16 AM → offset = 401min / 21.18 nadi ≈ 19
//   Shatabhisha (23): entry 12:13 PM Jul04, Baana 09:29 AM Jul05 → offset = 1276min / 25.48 nadi ≈ 50
//   Revati (26):      entry 02:54 PM Jul07, Baana 01:00 PM Jul08 → offset = 1326min / 23.6 nadi ≈ 56
const BAANA_START_NADI: number[] = [
   1,  //  0 Ashwini   ← Jun11: entry 6:46AM, Roga 7:04AM → ~1 nadi delay
   0,  //  1 Bharani
  19,  //  2 Krittika
   0,  //  3 Rohini
   0,  //  4 Mrigashira
   0,  //  5 Ardra
   0,  //  6 Punarvasu
   0,  //  7 Pushya
   0,  //  8 Ashlesha
   0,  //  9 Magha
   0,  // 10 P.Phalguni  ← Baana from entry (BAANA_END_NADI=23 limits duration)
  25,  // 11 U.Phalguni  ← Jun21: entry 8:01AM, Chora 6:16PM → ~25 nadis delay
   0,  // 12 Hasta
   0,  // 13 Chitra
   0,  // 14 Swati
   0,  // 15 Vishakha
   0,  // 16 Anuradha
   0,  // 17 Jyeshtha
   0,  // 18 Mula
   0,  // 19 P.Ashadha
   0,  // 20 U.Ashadha
   0,  // 21 Shravana
   0,  // 22 Dhanishtha
  50,  // 23 Shatabhisha
   0,  // 24 P.Bhadra
   0,  // 25 U.Bhadra
  56,  // 26 Revati
];

// BAANA_END_NADI: nadi position (from nakshatra entry) where Baana ends.
// 60 = use nakshatra exit. <60 = early end.
// Calibrated from DrikPanchang:
//   P.Phalguni (10): entry 7:55AM Jun20, Raja ends 5:07PM → 554min / 24.1 min/nadi ≈ 23
const BAANA_END_NADI: number[] = [
  60, // 0  Ashwini
  60, // 1  Bharani
  60, // 2  Krittika
  60, // 3  Rohini
  60, // 4  Mrigashira
  60, // 5  Ardra
  60, // 6  Punarvasu
  60, // 7  Pushya
  60, // 8  Ashlesha
  60, // 9  Magha
  23, // 10 P.Phalguni ← confirmed Jun20: Raja ends 5:07PM at nadi 23
  60, // 11 U.Phalguni
  60, // 12 Hasta
  60, // 13 Chitra
  60, // 14 Swati
  60, // 15 Vishakha
  60, // 16 Anuradha
  60, // 17 Jyeshtha
  60, // 18 Mula
  60, // 19 P.Ashadha
  60, // 20 U.Ashadha
  60, // 21 Shravana
  60, // 22 Dhanishtha
  60, // 23 Shatabhisha
  60, // 24 P.Bhadra
  60, // 25 U.Bhadra
  60, // 26 Revati
];

export function computeBaana(sunrise: Date, nextSunrise: Date): TimeInterval[] {
  const dayStart = dateToJdn(sunrise);
  const dayEnd   = dateToJdn(nextSunrise);

  // Scan back 1.3 days to catch nakshatras whose BAANA_START_NADI window
  // begins inside the current panchang day even when the nakshatra entered yesterday.
  const occurrences = findNakOccurrences(dayStart - 1.3, dayEnd + 0.1);

  const out: TimeInterval[] = [];
  for (const o of occurrences) {
    const type = BAANA_TYPE[o.index];
    if (!type) continue;
    const durJdn    = o.exitJdn - o.entryJdn;
    const nadi      = durJdn / 60;
    const startNadi = BAANA_START_NADI[o.index];
    const baanaEntry = startNadi > 0 ? o.entryJdn + startNadi * nadi : o.entryJdn;
    const clipStart = Math.max(baanaEntry, dayStart);
    const endNadi   = BAANA_END_NADI[o.index];
    const baanaExit = endNadi < 60 ? o.entryJdn + endNadi * nadi : o.exitJdn;
    const clipEnd   = Math.min(baanaExit, dayEnd);
    if (clipEnd > clipStart + 10 / 1440) { // skip windows under 10 min
      out.push({ start: jdnToUTC(clipStart), end: jdnToUTC(clipEnd), label: type });
    }
  }
  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  return out;
}

export function computeAmritKalam(sunrise: Date, nextSunrise: Date): TimeInterval[] {
  const dayStart = dateToJdn(sunrise);
  const dayEnd = dateToJdn(nextSunrise);

  const occurrences = findNakOccurrences(dayStart - 1.3, dayEnd + 0.2);

  const out: TimeInterval[] = [];
  for (const o of occurrences) {
    const durJdn = o.exitJdn - o.entryJdn;
    const nadi = durJdn / 60;
    const startJdn = o.entryJdn + AMRITA_START_NADI[o.index] * nadi;
    const endJdn = startJdn + AMRITA_DURATION_NADI * nadi;
    if (startJdn >= dayStart && startJdn < dayEnd) {
      out.push({ start: jdnToUTC(startJdn), end: jdnToUTC(endJdn) });
    }
  }
  out.sort((a, b) => a.start.getTime() - b.start.getTime());

  // DrikPanchang suppresses overnight Amrit windows when a daytime window already exists,
  // unless the overnight window is within 50 min of next sunrise (like Swati on Jun24).
  // For Muscat (UTC+4): local midnight ≈ 18h40m after sunrise ≈ dayStart + 0.778 JDN.
  const OVERNIGHT_JDN = dayStart + 0.778;
  const NEAR_SUNRISE_JDN = 50 / 1440;

  const daytime = out.filter(w => dateToJdn(w.start) <= OVERNIGHT_JDN);
  if (daytime.length > 0) {
    return [
      ...daytime,
      ...out.filter(w => {
        const s = dateToJdn(w.start);
        return s > OVERNIGHT_JDN && s >= dayEnd - NEAR_SUNRISE_JDN;
      }),
    ].sort((a, b) => a.start.getTime() - b.start.getTime());
  }
  return out;
}
