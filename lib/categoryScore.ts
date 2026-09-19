import { NAKSHATRAS, TITHIS, YOGAS, KARANAS, VARAS, MUHURTA_INFO, SPECIAL_YOGA_INFO, type ScoredElement } from '@/lib/data/descriptions';

// ── Category model (from the user's weights / bonus / multiplier tables) ──────
export type CategoryField = 'bid' | 'contract' | 'newVentures' | 'financial';

export interface CategoryDef {
  key: CategoryField;
  label: string;
  w: { nak: number; tit: number; yog: number; kar: number; var: number };
}

export const CATEGORIES: CategoryDef[] = [
  { key: 'bid',         label: 'Bid Submission',       w: { nak: 35, tit: 25, yog: 20, kar: 10, var: 10 } },
  { key: 'contract',    label: 'Contract Execution',   w: { nak: 30, tit: 30, yog: 20, kar: 10, var: 10 } },
  { key: 'newVentures', label: 'New Ventures',         w: { nak: 35, tit: 25, yog: 20, kar: 10, var: 10 } },
  { key: 'financial',   label: 'Financial Activities', w: { nak: 35, tit: 25, yog: 20, kar: 10, var: 10 } },
];

// Auspicious muhurtas + special yogas add their bonus; doshas either hard-exclude
// the window (×0) or multiply it by 0.9 (Baana / Vidal Yoga).
const BONUS_MUHURTA_KEYS = [
  'abhijitMuhurta', 'vijayaMuhurta', 'amritKalam', 'brahmaMuhurta', 'godhuliMuhurta',
  'nishitaMuhurta', 'pratahSandhya', 'madhyahnaSandhya', 'sayahanaSandhya',
];
const SPECIAL_YOGA_KEYS = [
  'amritaSiddhi', 'tripushkar', 'guruPushya', 'raviPushya', 'dwipushkar', 'sarvarthaSiddhi', 'raviYoga',
];
const HARD_EXCLUDE_DOSHAS = ['rahuKalam', 'yamaGanda', 'gulikaKalam', 'varjyam', 'durMuhurta', 'bhadra'];
const SOFT_MULT_DOSHAS = ['baana', 'vidalYoga'];
const SOFT_MULT = 0.9;

export interface ScoreElementRow { label: string; name: string; score: number; weighted: number; description: string }
export interface BonusRow { label: string; points: number; description: string }
export interface DoshaRow { label: string; mult: number; description: string }

export interface CategorySlot {
  start: number;
  end: number;
  finalScore: number;
  baseScore: number;
  bonusTotal: number;
  multiplier: number;
  elements: ScoreElementRow[];
  specialYogaBonuses: BonusRow[];
  muhurtaBonuses: BonusRow[];
  doshas: DoshaRow[];
  starCount: number;
}

interface Slot { start: string | null; end: string | null; name?: string; paksha?: string }

function activeAt<T extends Slot>(slots: T[] | undefined, timeMs: number): T | undefined {
  return slots?.find(s => {
    const lo = s.start ? new Date(s.start).getTime() : -Infinity;
    const hi = s.end ? new Date(s.end).getTime() : Infinity;
    return lo <= timeMs && timeMs <= hi;
  });
}

function intervalTimes(raw: any): { start: string; end: string }[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.filter((iv: any) => iv?.start && iv?.end);
}

function overlapsAt(map: Record<string, any>, key: string, timeMs: number): boolean {
  return intervalTimes(map?.[key]).some(iv => {
    const lo = new Date(iv.start).getTime();
    const hi = new Date(iv.end).getTime();
    return lo <= timeMs && timeMs <= hi;
  });
}

function starCount(score: number): number {
  if (score >= 95) return 5;
  if (score >= 85) return 4.5;
  if (score >= 75) return 4;
  if (score >= 65) return 3;
  if (score >= 50) return 2;
  return 1;
}

const scoreOf = (el: ScoredElement | undefined, field: CategoryField): number => el?.[field]?.score ?? 0;

interface ComputeArgs {
  field: CategoryField;
  weights: CategoryDef['w'];
  transitions: { tithi: Slot[]; nakshatra: Slot[]; yoga: Slot[]; karana: Slot[] };
  muhurta: Record<string, any>;     // includes auspicious + dosha intervals (merge early-morning before calling)
  specialYogas: Record<string, any>;
  varaName: string;
  paksha: string;
  dayEndMs?: number;
}

export function computeCategorySlots({
  field, weights, transitions, muhurta, specialYogas, varaName, paksha, dayEndMs,
}: ComputeArgs): CategorySlot[] {
  const varScore = scoreOf(VARAS[varaName], field);

  // Boundaries: element transitions + every muhurta / special-yoga interval edge.
  const boundaries = new Set<number>();
  for (const arr of [transitions.tithi, transitions.nakshatra, transitions.yoga, transitions.karana]) {
    for (const s of arr ?? []) {
      if (s.start) boundaries.add(new Date(s.start).getTime());
      if (s.end) boundaries.add(new Date(s.end).getTime());
    }
  }
  const addEdges = (map: Record<string, any>, keys: string[]) => {
    for (const k of keys) for (const iv of intervalTimes(map?.[k])) {
      boundaries.add(new Date(iv.start).getTime());
      boundaries.add(new Date(iv.end).getTime());
    }
  };
  addEdges(muhurta, [...BONUS_MUHURTA_KEYS, ...HARD_EXCLUDE_DOSHAS, ...SOFT_MULT_DOSHAS]);
  addEdges(specialYogas, SPECIAL_YOGA_KEYS);

  const sorted = Array.from(boundaries).sort((a, b) => a - b);
  const slots: CategorySlot[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i], e = sorted[i + 1];
    if (dayEndMs !== undefined && s >= dayEndMs) continue;
    if (e - s < 60_000) continue;
    const mid = (s + e) / 2;

    // Hard exclusion by ×0 doshas.
    if (HARD_EXCLUDE_DOSHAS.some(k => overlapsAt(muhurta, k, mid))) continue;

    const tSlot = activeAt(transitions.tithi, mid);
    const nSlot = activeAt(transitions.nakshatra, mid);
    const ySlot = activeAt(transitions.yoga, mid);
    const kSlot = activeAt(transitions.karana, mid);
    if (!tSlot || !nSlot || !ySlot || !kSlot) continue;

    const nEl = NAKSHATRAS[nSlot.name!];
    const tEl = TITHIS[`${tSlot.paksha ?? paksha} ${tSlot.name}`] ?? TITHIS[tSlot.name!];
    const yEl = YOGAS[ySlot.name!];
    const kEl = KARANAS[kSlot.name!];
    const vEl = VARAS[varaName];
    const nScore = scoreOf(nEl, field);
    const tScore = scoreOf(tEl, field);
    const yScore = scoreOf(yEl, field);
    const kScore = scoreOf(kEl, field);

    const elements: ScoreElementRow[] = [
      { label: 'Nakshatra', name: nSlot.name!, score: nScore, weighted: nScore * weights.nak / 100, description: nEl?.significance ?? '' },
      { label: 'Tithi',     name: tSlot.name!, score: tScore, weighted: tScore * weights.tit / 100, description: tEl?.significance ?? '' },
      { label: 'Yoga',      name: ySlot.name!, score: yScore, weighted: yScore * weights.yog / 100, description: yEl?.significance ?? '' },
      { label: 'Karana',    name: kSlot.name!, score: kScore, weighted: kScore * weights.kar / 100, description: kEl?.significance ?? '' },
      { label: 'Vara',      name: varaName,    score: varScore, weighted: varScore * weights.var / 100, description: vEl?.significance ?? '' },
    ];
    const baseScore = elements.reduce((a, r) => a + r.weighted, 0);

    // Additive bonuses from overlapping special yogas + auspicious muhurtas (all summed).
    const specialYogaBonuses: BonusRow[] = [];
    for (const k of SPECIAL_YOGA_KEYS) {
      const info = SPECIAL_YOGA_INFO[k];
      if (info?.bonus && overlapsAt(specialYogas, k, mid)) specialYogaBonuses.push({ label: info.name, points: info.bonus, description: info.reason });
    }
    const muhurtaBonuses: BonusRow[] = [];
    for (const k of BONUS_MUHURTA_KEYS) {
      const info = MUHURTA_INFO[k];
      if (info?.bonus && overlapsAt(muhurta, k, mid)) muhurtaBonuses.push({ label: info.name, points: info.bonus, description: info.reason });
    }
    const bonusTotal = [...specialYogaBonuses, ...muhurtaBonuses].reduce((a, b) => a + b.points, 0);

    // Soft multiplier (Baana / Vidal Yoga) — multiplicative per overlap (both → 0.81).
    const doshas: DoshaRow[] = [];
    for (const k of SOFT_MULT_DOSHAS) {
      if (overlapsAt(muhurta, k, mid)) doshas.push({ label: MUHURTA_INFO[k]?.name ?? k, mult: SOFT_MULT, description: MUHURTA_INFO[k]?.reason ?? '' });
    }
    const multiplier = doshas.reduce((m, d) => m * d.mult, 1);

    const finalScore = (baseScore + bonusTotal) * multiplier;

    slots.push({
      start: s, end: e,
      finalScore: Math.round(finalScore * 10) / 10,
      baseScore: Math.round(baseScore * 10) / 10,
      bonusTotal,
      multiplier,
      elements,
      specialYogaBonuses,
      muhurtaBonuses,
      doshas,
      starCount: starCount(finalScore),
    });
  }

  // Merge adjacent windows with identical scoring.
  const merged: CategorySlot[] = [];
  for (const slot of slots) {
    const prev = merged[merged.length - 1];
    if (prev && prev.end === slot.start && prev.finalScore === slot.finalScore &&
        prev.elements[0].name === slot.elements[0].name &&
        prev.elements[1].name === slot.elements[1].name &&
        prev.elements[2].name === slot.elements[2].name &&
        prev.elements[3].name === slot.elements[3].name &&
        prev.bonusTotal === slot.bonusTotal && prev.multiplier === slot.multiplier) {
      prev.end = slot.end;
    } else {
      merged.push({ ...slot });
    }
  }

  return merged.sort((a, b) =>
    b.finalScore - a.finalScore ||
    b.elements[0].score - a.elements[0].score ||
    b.elements[1].score - a.elements[1].score ||
    (b.end - b.start) - (a.end - a.start));
}
