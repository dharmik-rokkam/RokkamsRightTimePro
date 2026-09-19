import * as Astronomy from 'astronomy-engine';
import { dateObjectToJDN } from './jdn';
import { sunLongitude, moonLongitude } from './astronomy';
import { tropicalToSidereal } from './ayanamsha';
import { calculateTithi } from './tithi';
import { calculateNakshatra, suryaNakshatra } from './nakshatra';
import { calculateYoga } from './yoga';
import { calculateKarana } from './karana';
import { calculateVara } from './vara';
import { calculateSamvat } from './samvat';
import { calculateMasaName, getMoonSign } from './masa';
import { calculateMuhurta } from './muhurta';
import {
  computeAmritKalam,
  computeVarjyam,
  computeBaana,
  computeBhadra,
  computeVidalYoga,
} from './nakshatraMuhurta';
import type { PanchangData, Location } from '@/types/panchang';


function getRiseSetTimes(date: Date, location: Location) {
  const elevation = location.elevation ?? 0;
  const observer = new Astronomy.Observer(location.lat, location.lng, elevation);

  const sunSearchStart = new Date(date.getTime() - 18 * 60 * 60 * 1000);

  const sunriseResult = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, sunSearchStart, 1);
  const sunsetResult = sunriseResult
    ? Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, sunriseResult.date, 1)
    : null;
  const solarNoonResult = Astronomy.SearchHourAngle(Astronomy.Body.Sun, observer, 0, sunSearchStart, +1);

  const sunrise = sunriseResult ? sunriseResult.date : new Date(date.getTime() - 6 * 3600000);
  const sunset = sunsetResult ? sunsetResult.date : new Date(date.getTime() + 6 * 3600000);
  const solarNoon = solarNoonResult ? solarNoonResult.time.date : new Date((sunrise.getTime() + sunset.getTime()) / 2);

  // Use SearchAltitude(0°) for Moon — matches DrikPanchang within 1 min.
  // SearchRiseSet has 3–5 min Moon error due to ignoring lunar parallax.
  const moonriseResult = Astronomy.SearchAltitude(Astronomy.Body.Moon, observer, +1, sunrise, 1, 0.0);
  const moonsetResult  = Astronomy.SearchAltitude(Astronomy.Body.Moon, observer, -1, sunrise, 1, 0.0);

  return {
    sunrise,
    sunset,
    solarNoon,
    moonrise: moonriseResult ? moonriseResult.date : null,
    moonset: moonsetResult  ? moonsetResult.date  : null,
  };
}

export function computePanchang(date: Date, location: Location): PanchangData {
  const jdn = dateObjectToJDN(date);

  const sunLng = sunLongitude(jdn);
  const moonLng = moonLongitude(jdn);
  const siderealSunLng = tropicalToSidereal(sunLng, jdn);
  const siderealMoonLng = tropicalToSidereal(moonLng, jdn);

  const tithi = calculateTithi(sunLng, moonLng);
  const nakshatra = calculateNakshatra(siderealMoonLng);
  const yoga = calculateYoga(siderealSunLng, siderealMoonLng);
  const karana = calculateKarana(sunLng, moonLng);
  const vara = calculateVara(date);
  const samvat = calculateSamvat(date);
  const masaName = calculateMasaName(siderealSunLng);
  const moonSign = getMoonSign(siderealMoonLng);
  const surya = suryaNakshatra(siderealSunLng);

  const { sunrise, sunset, solarNoon, moonrise, moonset } = getRiseSetTimes(date, location);

  // Get previous sunset for accurate Brahma Muhurta calculation
  const yesterday = new Date(date.getTime() - 24 * 60 * 60 * 1000);
  const prevRiseSet = getRiseSetTimes(yesterday, location);
  const prevSunset = prevRiseSet.sunset;

  // Get next sunrise for nakshatra-based muhurtas (they span sunrise→nextSunrise)
  const tomorrow = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  const nextRiseSet = getRiseSetTimes(tomorrow, location);
  const nextSunrise = nextRiseSet.sunrise;

  // Compute all nakshatra-based timings from first principles — no web scraping
  const amritKalam = computeAmritKalam(sunrise, nextSunrise);
  const varjyam = computeVarjyam(sunrise, nextSunrise);
  const baana = computeBaana(sunrise, nextSunrise);
  const bhadra = computeBhadra(sunrise, nextSunrise);
  const vidalYoga = computeVidalYoga(sunrise, nextSunrise);

  const muhurta = calculateMuhurta(
    sunrise,
    sunset,
    solarNoon,
    date.getDay(),
    prevSunset,
    amritKalam,
    varjyam,
    baana,
    vidalYoga,
    bhadra,
  );

  return {
    date,
    location,
    tithi,
    nakshatra,
    yoga,
    karana,
    vara,
    sunMoonTimes: { sunrise, sunset, solarNoon, moonrise, moonset },
    muhurta,
    samvat,
    masaName,
    paksha: tithi.paksha,
    moonSign: moonSign.name,
    moonSignIndex: moonSign.index,
    suryaNakshatra: surya.name,
    suryaNakshatraIndex: surya.index,
    suryaPada: surya.pada,
    nakshatraPada: nakshatra.pada,
    sunLongitude: sunLng,
    moonLongitude: moonLng,
    siderealSunLng,
    siderealMoonLng,
  };
}
