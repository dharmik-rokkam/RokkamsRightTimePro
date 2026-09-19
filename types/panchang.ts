export interface Location {
  lat: number;
  lng: number;
  name: string;
  timezone: string;
  elevation?: number;
}

export type Region = 'telugu' | 'tamil' | 'north';
export type Paksha = 'Shukla' | 'Krishna';

export interface TithiResult {
  index: number;
  paksha: Paksha;
  tithiInPaksha: number;
  completion: number;
  name: string;
}

export interface NakshatraResult {
  index: number;
  pada: number;
  completion: number;
  name: string;
}

export interface YogaResult {
  index: number;
  completion: number;
  name: string;
  isAuspicious: boolean;
}

export interface KaranaResult {
  index: number;
  completion: number;
  name: string;
}

export interface VaraResult {
  index: number;
  name: string;
  shortName: string;
}

export interface TimeInterval {
  start: Date;
  end: Date;
  label?: string;
}

export interface SunMoonTimes {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  moonrise: Date | null;
  moonset: Date | null;
}

export interface MuhurtaResult {
  rahuKalam: TimeInterval;
  gulikaKalam: TimeInterval;
  yamaGanda: TimeInterval;
  abhijitMuhurta: TimeInterval | null;
  brahmaMuhurta: TimeInterval;
  godhuliMuhurta: TimeInterval;
  vijayaMuhurta: TimeInterval;
  amritKalam: TimeInterval[];
  pratahSandhya: TimeInterval;
  durMuhurta: TimeInterval[];
  varjyam: TimeInterval[];
  sayahanaSandhya: TimeInterval;
  nishitaMuhurta: TimeInterval;
  madhyahnaSandhya: TimeInterval;
  baana: TimeInterval[];
  vidalYoga: TimeInterval[];
  bhadra: TimeInterval[];
}

export interface SamvatResult {
  vikrama: number;
  shaka: number;
  gujarati: number;
}

export interface PanchangData {
  date: Date;
  location: Location;
  tithi: TithiResult;
  nakshatra: NakshatraResult;
  yoga: YogaResult;
  karana: KaranaResult;
  vara: VaraResult;
  sunMoonTimes: SunMoonTimes;
  muhurta: MuhurtaResult;
  samvat: SamvatResult;
  masaName: string;
  paksha: Paksha;
  moonSign: string;
  moonSignIndex: number;
  suryaNakshatra: string;
  suryaNakshatraIndex: number;
  suryaPada: number;
  nakshatraPada: number;
  sunLongitude: number;
  moonLongitude: number;
  siderealSunLng: number;
  siderealMoonLng: number;
}

export interface CalendarDayData {
  date: Date;
  tithiIndex: number;
  tithiName: string;
  paksha: Paksha;
  isToday: boolean;
  isFestival?: boolean;
  festivalName?: string;
}
