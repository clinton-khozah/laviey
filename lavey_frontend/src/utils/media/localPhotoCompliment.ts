const LOCAL_COMPLIMENTS = [
  (name: string) => `${name}, this photo has such great energy — you look amazing!`,
  (name: string) => `${name}, seriously stunning shot. Keep sharing moments like this!`,
  (name: string) => `${name}, the vibe here is immaculate — love this for you.`,
  (name: string) => `${name}, camera loves you in this one. Gorgeous pic!`,
];

function firstName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return 'Hey';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function localPhotoCompliment(displayName: string, seed = Date.now()): string {
  const name = firstName(displayName);
  const idx = Math.abs(seed) % LOCAL_COMPLIMENTS.length;
  return LOCAL_COMPLIMENTS[idx](name);
}
