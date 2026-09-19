interface Interval { start: string; end: string; }

const AUSPICIOUS_KEYS = [
  'brahmaMuhurta','abhijitMuhurta','godhuliMuhurta','amritKalam',
  'pratahSandhya','vijayaMuhurta','madhyahnaSandhya','sayahanaSandhya','nishitaMuhurta',
];
const INAUSPICIOUS_KEYS = [
  'rahuKalam','gulikaKalam','varjyam','baana','yamaGanda','vidalYoga','durMuhurta','bhadra',
];

export const KEY_TO_LABEL: Record<string, string> = {
  brahmaMuhurta:    'Brahma Muhurta',
  abhijitMuhurta:   'Abhijit Muhurta',
  godhuliMuhurta:   'Godhuli Muhurta',
  amritKalam:       'Amrit Kalam',
  pratahSandhya:    'Pratah Sandhya',
  vijayaMuhurta:    'Vijaya Muhurta',
  madhyahnaSandhya: 'Madhyahna Sandhya',
  sayahanaSandhya:  'Sayahana Sandhya',
  nishitaMuhurta:   'Nishita Muhurta',
};

export interface RankedSlot {
  start: number;
  end: number;
  score: number;
  labels: string[];
}

export function computeRankedSlots(muhurta: Record<string, any>, dayEndMs?: number): RankedSlot[] {
  const boundaries = new Set<number>();
  const allAus: { iv: Interval; label: string }[] = [];
  const allBad: Interval[] = [];

  for (const k of AUSPICIOUS_KEYS) {
    const raw = muhurta[k];
    if (raw == null) continue;
    const arr: Interval[] = Array.isArray(raw) ? raw : [raw];
    for (const iv of arr) {
      if (!iv?.start || !iv?.end) continue;
      allAus.push({ iv, label: KEY_TO_LABEL[k] ?? k });
      boundaries.add(new Date(iv.start).getTime());
      boundaries.add(new Date(iv.end).getTime());
    }
  }
  for (const k of INAUSPICIOUS_KEYS) {
    const raw = muhurta[k];
    if (raw == null) continue;
    const arr: Interval[] = Array.isArray(raw) ? raw : [raw];
    for (const iv of arr) {
      if (!iv?.start || !iv?.end) continue;
      allBad.push(iv);
      boundaries.add(new Date(iv.start).getTime());
      boundaries.add(new Date(iv.end).getTime());
    }
  }

  const sorted = Array.from(boundaries).sort((a, b) => a - b);
  const slots: RankedSlot[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i], e = sorted[i + 1];
    if (dayEndMs !== undefined && s > dayEndMs) continue;
    if (e - s < 60000) continue;
    const mid = (s + e) / 2;
    const isBad = allBad.some(iv =>
      new Date(iv.start).getTime() <= s && new Date(iv.end).getTime() >= e
    );
    if (isBad) continue;
    const contributing = allAus.filter(({ iv }) =>
      new Date(iv.start).getTime() <= mid && new Date(iv.end).getTime() >= mid
    );
    if (contributing.length === 0) continue;
    slots.push({ start: s, end: e, score: contributing.length, labels: contributing.map(c => c.label) });
  }

  const merged: RankedSlot[] = [];
  for (const slot of slots) {
    const prev = merged[merged.length - 1];
    if (prev && prev.end === slot.start && prev.score === slot.score &&
        JSON.stringify(prev.labels) === JSON.stringify(slot.labels)) {
      prev.end = slot.end;
    } else {
      merged.push({ ...slot });
    }
  }

  return merged.sort((a, b) => b.score - a.score || a.start - b.start);
}
