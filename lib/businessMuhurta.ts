import type { DayTransitions } from '@/lib/calculations/transitions';
import { TITHIS, NAKSHATRAS, YOGAS, KARANAS, VARAS } from '@/lib/data/descriptions';

export interface BusinessSlot {
  start: number;
  end: number;
  finalScore: number;
  baseScore: number;
  multiplier: number;
  multiplierLabel: string;
  penaltyLabel: string;
  tithiName: string;
  tithiScore: number;
  nakshatraName: string;
  nakshatraScore: number;
  varaName: string;
  varaScore: number;
  yogaName: string;
  yogaScore: number;
  karanaName: string;
  karanaScore: number;
  paksha: string;
  pakshaScore: number;
  starCount: number;
}

export interface ExcludedPeriod {
  label: string;
  start: string;
  end: string;
}

// Per-element scores now come from the Excel "Business / Finance / Contracts"
// values stored on each ElementScore.businessScore in descriptions.ts.
// Paksha has no Excel score, so keep a fixed scale (waxing favoured).
const VARA_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PAKSHA_SCORES: Record<string, number> = { Shukla: 100, Krishna: 60 };

const bizScore = (rec: Record<string, { businessScore: number }>, name: string): number =>
  rec[name]?.businessScore ?? 60;

const AUSPICIOUS_KEYS = [
  'brahmaMuhurta', 'abhijitMuhurta', 'godhuliMuhurta', 'amritKalam',
  'pratahSandhya', 'vijayaMuhurta', 'madhyahnaSandhya', 'sayahanaSandhya',
  'nishitaMuhurta',
];

const MULTIPLIERS: Record<string, number> = {
  abhijitMuhurta: 1.25, vijayaMuhurta: 1.25, amritKalam: 1.20,
  brahmaMuhurta: 1.10, godhuliMuhurta: 1.05,
};

const MULTIPLIER_LABELS: Record<string, string> = {
  abhijitMuhurta: 'Abhijit Muhurta', vijayaMuhurta: 'Vijaya Muhurta',
  amritKalam: 'Amrit Kalam', brahmaMuhurta: 'Brahma Muhurta',
  godhuliMuhurta: 'Godhuli Muhurta',
};

const ALL_INAUSPICIOUS_KEYS = [
  'rahuKalam', 'yamaGanda', 'gulikaKalam', 'durMuhurta',
  'varjyam', 'bhadra', 'baana', 'vidalYoga',
];

export const EXCLUDED_PERIOD_LABELS: Record<string, string> = {
  rahuKalam: 'Rahu Kalam', yamaGanda: 'Yama Ganda', gulikaKalam: 'Gulika Kalam',
  durMuhurta: 'Dur Muhurta', varjyam: 'Varjyam', bhadra: 'Bhadra',
  baana: 'Baana', vidalYoga: 'Vidal Yoga',
};

function starCount(score: number): number {
  if (score >= 95) return 5;
  if (score >= 85) return 4.5;
  if (score >= 75) return 4;
  if (score >= 65) return 3;
  if (score >= 50) return 2;
  return 1;
}

interface Slot { start: string | null; end: string | null; }

function activeAt<T extends Slot>(slots: T[], timeMs: number): T | undefined {
  return slots.find(s => {
    const lo = s.start ? new Date(s.start).getTime() : -Infinity;
    const hi = s.end   ? new Date(s.end).getTime()   :  Infinity;
    return lo <= timeMs && timeMs <= hi;
  });
}

function intervalTimes(raw: any): { start: string; end: string }[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.filter((iv: any) => iv?.start && iv?.end);
}

function overlapsAt(muhurta: Record<string, any>, key: string, timeMs: number): boolean {
  return intervalTimes(muhurta[key]).some(iv => {
    const lo = new Date(iv.start).getTime();
    const hi = new Date(iv.end).getTime();
    return lo <= timeMs && timeMs <= hi;
  });
}

export function computeBusinessSlots(
  transitions: DayTransitions,
  muhurta: Record<string, any>,
  varaIndex: number,
  paksha: 'Shukla' | 'Krishna',
  dayEndMs?: number,
): BusinessSlot[] {
  const varaName = VARA_NAMES[varaIndex] ?? 'Unknown';
  const varaScoreVal = bizScore(VARAS, varaName);
  const pakshaScoreVal = PAKSHA_SCORES[paksha] ?? 60;

  const boundaries = new Set<number>();

  for (const arr of [transitions.tithi, transitions.nakshatra, transitions.yoga, transitions.karana]) {
    for (const slot of arr) {
      if (slot.start) boundaries.add(new Date(slot.start).getTime());
      if (slot.end)   boundaries.add(new Date(slot.end).getTime());
    }
  }

  for (const key of [...AUSPICIOUS_KEYS, ...ALL_INAUSPICIOUS_KEYS]) {
    for (const iv of intervalTimes(muhurta[key])) {
      boundaries.add(new Date(iv.start).getTime());
      boundaries.add(new Date(iv.end).getTime());
    }
  }

  const sorted = Array.from(boundaries).sort((a, b) => a - b);
  const slots: BusinessSlot[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i], e = sorted[i + 1];
    if (dayEndMs !== undefined && s > dayEndMs) continue;
    if (e - s < 60000) continue;

    const mid = (s + e) / 2;

    const tSlot = activeAt(transitions.tithi, mid);
    const nSlot = activeAt(transitions.nakshatra, mid);
    const ySlot = activeAt(transitions.yoga, mid);
    const kSlot = activeAt(transitions.karana, mid);
    if (!tSlot || !nSlot || !ySlot || !kSlot) continue;

    const ns = bizScore(NAKSHATRAS, nSlot.name);
    const ts = (TITHIS[`${tSlot.paksha ?? paksha} ${tSlot.name}`] ?? TITHIS[tSlot.name])?.businessScore ?? 60;
    const ys = bizScore(YOGAS, ySlot.name);
    const ks = bizScore(KARANAS, kSlot.name);
    const baseScore = ns * 0.35 + ts * 0.25 + ys * 0.15 + ks * 0.10 + pakshaScoreVal * 0.10 + varaScoreVal * 0.05;

    // Highest auspicious multiplier wins (others have no multiplier → 1.0).
    let multiplier = 1.0;
    let multiplierLabel = '';
    for (const key of AUSPICIOUS_KEYS) {
      if (overlapsAt(muhurta, key, mid)) {
        const m = MULTIPLIERS[key] ?? 1.0;
        if (m > multiplier) { multiplier = m; multiplierLabel = MULTIPLIER_LABELS[key]; }
      }
    }

    // Only auspicious-for-business windows: exclude any segment overlapping an
    // inauspicious period (Rahu/Yama/Gulika/Dur/Varjyam/Bhadra/Baana/Vidal).
    // Remaining windows are scored on business merit only — no penalty.
    if (ALL_INAUSPICIOUS_KEYS.some(k => overlapsAt(muhurta, k, mid))) continue;
    const finalScore = baseScore * multiplier;
    const penaltyLabel = '';

    slots.push({
      start: s, end: e,
      finalScore: Math.round(finalScore * 10) / 10,
      baseScore: Math.round(baseScore * 10) / 10,
      multiplier, multiplierLabel, penaltyLabel,
      tithiName: tSlot.name, tithiScore: ts,
      nakshatraName: nSlot.name, nakshatraScore: ns,
      varaName, varaScore: varaScoreVal,
      yogaName: ySlot.name, yogaScore: ys,
      karanaName: kSlot.name, karanaScore: ks,
      paksha, pakshaScore: pakshaScoreVal,
      starCount: starCount(finalScore),
    });
  }

  const merged: BusinessSlot[] = [];
  for (const slot of slots) {
    const prev = merged[merged.length - 1];
    if (
      prev && prev.end === slot.start &&
      prev.tithiName === slot.tithiName &&
      prev.nakshatraName === slot.nakshatraName &&
      prev.yogaName === slot.yogaName &&
      prev.karanaName === slot.karanaName &&
      prev.multiplierLabel === slot.multiplierLabel &&
      prev.penaltyLabel === slot.penaltyLabel
    ) {
      prev.end = slot.end;
    } else {
      merged.push({ ...slot });
    }
  }

  const PREMIUM = new Set(['Abhijit Muhurta', 'Vijaya Muhurta', 'Amrit Kalam']);

  return merged.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    if (b.nakshatraScore !== a.nakshatraScore) return b.nakshatraScore - a.nakshatraScore;
    if (b.tithiScore !== a.tithiScore) return b.tithiScore - a.tithiScore;
    if (b.yogaScore !== a.yogaScore) return b.yogaScore - a.yogaScore;
    const aP = PREMIUM.has(a.multiplierLabel) ? 1 : 0;
    const bP = PREMIUM.has(b.multiplierLabel) ? 1 : 0;
    if (bP !== aP) return bP - aP;
    return (b.end - b.start) - (a.end - a.start);
  });
}

export function getExcludedPeriods(muhurta: Record<string, any>): ExcludedPeriod[] {
  const result: ExcludedPeriod[] = [];
  for (const key of ALL_INAUSPICIOUS_KEYS) {
    for (const iv of intervalTimes(muhurta[key])) {
      result.push({ label: EXCLUDED_PERIOD_LABELS[key], start: iv.start, end: iv.end });
    }
  }
  return result;
}
