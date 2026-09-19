function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function normalize360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function sunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;

  const L0 = normalize360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = normalize360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mrad = toRad(M);

  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);

  const sunTrue = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const apparent = sunTrue - 0.00569 - 0.00478 * Math.sin(toRad(omega));

  return normalize360(apparent);
}

export function moonLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;

  const L0 = normalize360(218.3165 + 481267.8813 * T);
  const D = normalize360(297.8501 + 445267.1115 * T);
  const M = normalize360(357.5291 + 35999.0503 * T);
  const Mp = normalize360(134.9634 + 477198.8676 * T);
  const F = normalize360(93.2721 + 483202.0175 * T);
  const Om = normalize360(125.0445 - 1934.1363 * T);

  const lng =
    L0 +
    6.2886 * Math.sin(toRad(Mp)) +
    1.2740 * Math.sin(toRad(2 * D - Mp)) +
    0.6583 * Math.sin(toRad(2 * D)) +
    0.2136 * Math.sin(toRad(2 * Mp)) -
    0.1851 * Math.sin(toRad(M)) -
    0.1143 * Math.sin(toRad(2 * F)) +
    0.0588 * Math.sin(toRad(2 * D - 2 * Mp)) +
    0.0572 * Math.sin(toRad(2 * D - M - Mp)) +
    0.0533 * Math.sin(toRad(2 * D + Mp)) +
    0.0458 * Math.sin(toRad(2 * D - M)) +
    0.0409 * Math.sin(toRad(2 * (D - F))) +
    0.0347 * Math.sin(toRad(Om)) -
    0.0306 * Math.sin(toRad(2 * (D - Mp))) -
    0.0304 * Math.sin(toRad(2 * F - Mp));

  return normalize360(lng);
}

export function moonSpeed(jdn: number): number {
  return moonLongitude(jdn + 0.5) - moonLongitude(jdn - 0.5);
}
