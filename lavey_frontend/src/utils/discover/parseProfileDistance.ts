/** Parse display strings like "2 mi away" into kilometers */
export function parseProfileDistanceKm(distance: string): number {
  const mi = distance.match(/([\d.]+)\s*mi/i);
  if (mi) return Math.round(parseFloat(mi[1]) * 1.609 * 10) / 10;

  const km = distance.match(/([\d.]+)\s*km/i);
  if (km) return parseFloat(km[1]);

  return 50;
}
