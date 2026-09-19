import { dateObjectToJDN } from './jdn';
import { sunLongitude, moonLongitude } from './astronomy';
import { tropicalToSidereal } from './ayanamsha';
import { NAKSHATRA_NAMES } from './nakshatra';

export interface TithiPeriod {
  name: string;
  paksha: 'Shukla' | 'Krishna';
  tithiInPaksha: number;
  endTime: Date | null;
}

export interface NakshatraPeriod {
  name: string;
  pada: number;
  endTime: Date | null;
}

export interface YogaPeriod {
  name: string;
  isAuspicious: boolean;
  endTime: Date | null;
}

export interface KaranaPeriod {
  name: string;
  endTime: Date | null;
}

const SHUKLA_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
];
const KRISHNA_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya',
];
const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarman', 'Dhriti', 'Shula', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
  'Mahendra', 'Vaidhriti',
];
const AUSPICIOUS_YOGA = new Set([1,2,3,4,7,10,11,13,15,19,20,21,22,23,24,25]);
const FIXED_KARANAS = ['Kimstughna', 'Shakuni', 'Chatushpada', 'Naga'];
const REPEATING_KARANAS = ['Bava', 'Balava', 'Kaulava', 'Taitula', 'Garaja', 'Vanija', 'Vishti'];

const NAKSHATRA_ARC = 360 / 27;
const YOGA_ARC = 360 / 27;

function jdnToUTCDate(jdn: number): Date {
  const J2000_JDN = 2451545.0;
  const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
  return new Date(J2000_MS + (jdn - J2000_JDN) * 86400000);
}

function getTithiIndex(jdn: number): number {
  const sunLng = sunLongitude(jdn);
  const moonLng = moonLongitude(jdn);
  let diff = moonLng - sunLng;
  if (diff < 0) diff += 360;
  return Math.floor(diff / 12);
}

function getNakshatraIndex(jdn: number): number {
  const moonLng = moonLongitude(jdn);
  const sidereal = tropicalToSidereal(moonLng, jdn);
  return Math.floor(((sidereal % 360) + 360) % 360 / NAKSHATRA_ARC);
}

function getNakshatraPada(jdn: number): number {
  const moonLng = moonLongitude(jdn);
  const sidereal = tropicalToSidereal(moonLng, jdn);
  const posInNak = ((sidereal % NAKSHATRA_ARC) + NAKSHATRA_ARC) % NAKSHATRA_ARC;
  return Math.floor(posInNak / (NAKSHATRA_ARC / 4)) + 1;
}

function getYogaIndex(jdn: number): number {
  const sunLng = sunLongitude(jdn);
  const moonLng = moonLongitude(jdn);
  const siderealSun = tropicalToSidereal(sunLng, jdn);
  const siderealMoon = tropicalToSidereal(moonLng, jdn);
  const sum = (siderealSun + siderealMoon) % 360;
  return Math.floor(sum / YOGA_ARC);
}

function getKaranaIndex(jdn: number): number {
  const sunLng = sunLongitude(jdn);
  const moonLng = moonLongitude(jdn);
  let diff = moonLng - sunLng;
  if (diff < 0) diff += 360;
  return Math.floor(diff / 6);
}

function karanaName(idx: number): string {
  if (idx === 0) return FIXED_KARANAS[0];
  if (idx >= 57) return FIXED_KARANAS[idx - 56];
  return REPEATING_KARANAS[(idx - 1) % 7];
}

function findChangeTime(loJDN: number, hiJDN: number, getValue: (j: number) => number): number {
  let lo = loJDN, hi = hiJDN;
  const startVal = getValue(lo);
  while (hi - lo > 1 / 1440) {
    const mid = (lo + hi) / 2;
    if (getValue(mid) === startVal) lo = mid; else hi = mid;
  }
  return hi;
}

function findPeriods(
  sunriseJDN: number,
  nextSunriseJDN: number,
  getIndex: (jdn: number) => number,
  getExtra: (jdn: number) => number,
): Array<{ index: number; extra: number; endJDN: number | null }> {
  const STEP = 1 / 72;
  const periods: Array<{ index: number; extra: number; endJDN: number | null }> = [];

  let curJDN = sunriseJDN;
  let curIndex = getIndex(curJDN);
  let curExtra = getExtra(curJDN);

  let scanJDN = curJDN + STEP;

  while (scanJDN <= nextSunriseJDN + STEP / 2) {
    const checkJDN = Math.min(scanJDN, nextSunriseJDN);
    const checkIndex = getIndex(checkJDN);
    const checkExtra = getExtra(checkJDN);

    const changed = checkIndex !== curIndex || checkExtra !== curExtra;

    if (changed) {
      const changeJDN = findChangeTime(Math.max(curJDN, checkJDN - STEP), checkJDN, j => getIndex(j) * 100 + getExtra(j));
      periods.push({ index: curIndex, extra: curExtra, endJDN: changeJDN });
      curIndex = checkIndex;
      curExtra = checkExtra;
      curJDN = changeJDN;
    }

    if (scanJDN >= nextSunriseJDN) break;
    scanJDN += STEP;
  }

  periods.push({ index: curIndex, extra: curExtra, endJDN: null });
  return periods;
}

export interface ElementPeriods {
  tithi: TithiPeriod[];
  nakshatra: NakshatraPeriod[];
  yoga: YogaPeriod[];
  karana: KaranaPeriod[];
}

export function computeElementPeriods(sunrise: Date, nextSunrise: Date): ElementPeriods {
  const srJDN = dateObjectToJDN(sunrise);
  const nsrJDN = dateObjectToJDN(nextSunrise);

  const tithiRaw = findPeriods(srJDN, nsrJDN, getTithiIndex, () => 0);
  const tithi: TithiPeriod[] = tithiRaw.map(p => {
    const paksha = p.index < 15 ? 'Shukla' : 'Krishna';
    const tithiInPaksha = (p.index % 15) + 1;
    const name = (paksha === 'Shukla' ? SHUKLA_NAMES : KRISHNA_NAMES)[tithiInPaksha - 1];
    return { name, paksha, tithiInPaksha, endTime: p.endJDN ? jdnToUTCDate(p.endJDN) : null };
  });

  const nakRaw = findPeriods(srJDN, nsrJDN, getNakshatraIndex, getNakshatraPada);
  const nakshatra: NakshatraPeriod[] = nakRaw.map(p => ({
    name: NAKSHATRA_NAMES[p.index] ?? 'Unknown',
    pada: p.extra,
    endTime: p.endJDN ? jdnToUTCDate(p.endJDN) : null,
  }));

  const yogaRaw = findPeriods(srJDN, nsrJDN, getYogaIndex, () => 0);
  const yoga: YogaPeriod[] = yogaRaw.map(p => ({
    name: YOGA_NAMES[p.index] ?? 'Unknown',
    isAuspicious: AUSPICIOUS_YOGA.has(p.index),
    endTime: p.endJDN ? jdnToUTCDate(p.endJDN) : null,
  }));

  const karanaRaw = findPeriods(srJDN, nsrJDN, getKaranaIndex, () => 0);
  const karana: KaranaPeriod[] = karanaRaw.map(p => ({
    name: karanaName(p.index),
    endTime: p.endJDN ? jdnToUTCDate(p.endJDN) : null,
  }));

  return { tithi, nakshatra, yoga, karana };
}
