const EARNINGS_KEY = 'lavey_gift_earnings';
const BASE_EARNINGS = 86.5;

function readMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(EARNINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, number>) {
  try {
    localStorage.setItem(EARNINGS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function getGiftEarnings(userId: string): number {
  const map = readMap();
  return (map[userId] ?? 0) + BASE_EARNINGS;
}

export function addGiftEarnings(userId: string, amount: number): number {
  const map = readMap();
  const next = (map[userId] ?? 0) + amount;
  map[userId] = next;
  writeMap(map);
  return getGiftEarnings(userId);
}
