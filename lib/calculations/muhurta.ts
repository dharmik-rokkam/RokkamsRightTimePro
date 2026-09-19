import type { MuhurtaResult, TimeInterval } from '@/types/panchang';

const RAHU_PART = [8, 2, 7, 5, 6, 4, 3];
const GULIKA_PART = [7, 6, 5, 4, 3, 2, 1];
const YAMA_GANDA_PART = [5, 4, 3, 2, 1, 7, 6];

const DUR_MUHURTA_POS: number[][] = [
  [14],    // Sun
  [9],     // Mon
  [4],     // Tue
  [8],     // Wed
  [6],     // Thu
  [4, 9],  // Fri
  [1],     // Sat
];

function getPart(sunrise: Date, sunset: Date, partIndex: number): TimeInterval {
  const dayMs = sunset.getTime() - sunrise.getTime();
  const partMs = dayMs / 8;
  const start = new Date(sunrise.getTime() + (partIndex - 1) * partMs);
  const end = new Date(start.getTime() + partMs);
  return { start, end };
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

export function subtractIntervals(auspicious: TimeInterval, inauspicious: TimeInterval[]): TimeInterval[] {
  let remaining: TimeInterval[] = [{ ...auspicious }];
  for (const bad of inauspicious) {
    const next: TimeInterval[] = [];
    for (const seg of remaining) {
      if (bad.end.getTime() <= seg.start.getTime() || bad.start.getTime() >= seg.end.getTime()) {
        next.push(seg);
      } else {
        if (bad.start.getTime() > seg.start.getTime()) {
          next.push({ start: seg.start, end: bad.start });
        }
        if (bad.end.getTime() < seg.end.getTime()) {
          next.push({ start: bad.end, end: seg.end });
        }
      }
    }
    remaining = next;
  }
  return remaining.filter(s => s.end.getTime() - s.start.getTime() > 60000);
}

export function calculateMuhurta(
  sunrise: Date,
  sunset: Date,
  solarNoon: Date,
  dayOfWeek: number,
  prevSunset?: Date,
  // These are passed from the orchestrator — computed from nakshatraMuhurta
  amritKalam: TimeInterval[] = [],
  varjyam: TimeInterval[] = [],
  baana: TimeInterval[] = [],
  vidalYoga: TimeInterval[] = [],
  bhadra: TimeInterval[] = [],
): MuhurtaResult {
  const dayMs = sunset.getTime() - sunrise.getTime();
  const muhurtaDurationMs = dayMs / 15;

  const rahuKalam = getPart(sunrise, sunset, RAHU_PART[dayOfWeek]);
  const gulikaKalam = getPart(sunrise, sunset, GULIKA_PART[dayOfWeek]);
  const yamaGanda = getPart(sunrise, sunset, YAMA_GANDA_PART[dayOfWeek]);

  const durMuhurta: TimeInterval[] = DUR_MUHURTA_POS[dayOfWeek].map(d1 => ({
    start: new Date(sunrise.getTime() + (d1 - 1) * muhurtaDurationMs),
    end:   new Date(sunrise.getTime() + d1 * muhurtaDurationMs),
  }));

  let brahmaMuhurta: TimeInterval;
  if (prevSunset) {
    const nightMs = sunrise.getTime() - prevSunset.getTime();
    const nightMuhurtaMs = nightMs / 15;
    brahmaMuhurta = {
      start: new Date(sunrise.getTime() - 2 * nightMuhurtaMs),
      end: new Date(sunrise.getTime() - nightMuhurtaMs),
    };
  } else {
    brahmaMuhurta = {
      start: addMinutes(sunrise, -96),
      end: addMinutes(sunrise, -48),
    };
  }

  const abhijitMuhurta: TimeInterval | null = dayOfWeek === 3 ? null : {
    start: new Date(sunrise.getTime() + 7 * muhurtaDurationMs),
    end: new Date(sunrise.getTime() + 8 * muhurtaDurationMs),
  };

  const godhuliMuhurta: TimeInterval = {
    start: addMinutes(sunset, -1),
    end: addMinutes(sunset, 20),
  };

  const pratahSandhya: TimeInterval = {
    start: addMinutes(sunrise, -63),
    end: sunrise,
  };

  const vijayaMuhurta: TimeInterval = {
    start: new Date(sunrise.getTime() + 10 * muhurtaDurationMs),
    end: new Date(sunrise.getTime() + 11 * muhurtaDurationMs),
  };

  const sayahanaSandhya: TimeInterval = {
    start: sunset,
    end: addMinutes(sunset, 63),
  };

  const nextSunriseApprox = addMinutes(sunrise, 24 * 60);
  const nightMs2 = nextSunriseApprox.getTime() - sunset.getTime();
  const nightMuhurtaMs2 = nightMs2 / 15;
  const nishitaMuhurta: TimeInterval = {
    start: new Date(sunset.getTime() + 7 * nightMuhurtaMs2),
    end: new Date(sunset.getTime() + 8 * nightMuhurtaMs2),
  };

  const madhyahnaSandhya: TimeInterval = {
    start: addMinutes(solarNoon, -12),
    end: addMinutes(solarNoon, 12),
  };

  return {
    rahuKalam,
    gulikaKalam,
    yamaGanda,
    abhijitMuhurta,
    brahmaMuhurta,
    godhuliMuhurta,
    vijayaMuhurta,
    amritKalam,
    pratahSandhya,
    durMuhurta,
    varjyam,
    sayahanaSandhya,
    nishitaMuhurta,
    madhyahnaSandhya,
    baana,
    vidalYoga,
    bhadra,
  };
}
