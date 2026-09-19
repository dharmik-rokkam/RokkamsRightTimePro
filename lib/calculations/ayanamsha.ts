// Lahiri (Chitrapaksha) ayanamsha — the standard used for Hindu Panchang
export function lahiriAyanamsha(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;
  return 23.8521 + 1.3969 * T;
}

export function tropicalToSidereal(tropicalLng: number, jdn: number): number {
  const ayanamsha = lahiriAyanamsha(jdn);
  return ((tropicalLng - ayanamsha) % 360 + 360) % 360;
}
