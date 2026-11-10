import { Coordinates, Qibla } from 'adhan';

/** The Kaaba, Masjid al-Haram. */
export const KAABA = { lat: 21.4225, lng: 39.8262 };

/** Great-circle bearing to the Kaaba, degrees clockwise from true north. */
export function qiblaBearing(lat: number, lng: number): number {
  return normalize(Qibla(new Coordinates(lat, lng)));
}

/** Great-circle distance to the Kaaba in kilometres. */
export function distanceToKaaba(lat: number, lng: number): number {
  const rad = Math.PI / 180;
  const dLat = (KAABA.lat - lat) * rad;
  const dLng = (KAABA.lng - lng) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat * rad) * Math.cos(KAABA.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const POINT_NAMES: Record<string, string> = {
  N: 'north',
  E: 'east',
  S: 'south',
  W: 'west',
};

/** "ESE" for 112°. */
export function compassPoint(deg: number): string {
  return POINTS[Math.round(normalize(deg) / 22.5) % 16];
}

/** "east-southeast" for screen readers. */
export function compassPointLong(deg: number): string {
  const point = compassPoint(deg);
  if (point.length === 1) return POINT_NAMES[point];
  if (point.length === 2) return `${POINT_NAMES[point[0]]}${POINT_NAMES[point[1]]}`;
  return `${POINT_NAMES[point[0]]}-${POINT_NAMES[point[1]]}${POINT_NAMES[point[2]]}`;
}

export function normalize(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Signed shortest turn from `from` to `to`, in (-180, 180]. Positive = clockwise. */
export function turnBetween(from: number, to: number): number {
  const diff = normalize(to - from);
  return diff > 180 ? diff - 360 : diff;
}
