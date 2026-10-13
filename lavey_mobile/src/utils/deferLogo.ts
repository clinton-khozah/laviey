import { useEffect, useState } from "react";

const SHOW_AFTER_MS = 3000;
const openedAt = Date.now();
let shown = false;
const listeners = new Set<() => void>();

setTimeout(() => {
  shown = true;
  listeners.forEach((listener) => listener());
  listeners.clear();
}, SHOW_AFTER_MS);

/** The launch logo stays hidden until it can render sharp. */
export function useLogoReady(): boolean {
  const [ready, setReady] = useState(shown || Date.now() - openedAt >= SHOW_AFTER_MS);

  useEffect(() => {
    if (ready) return;
    const show = () => setReady(true);
    listeners.add(show);
    return () => listeners.delete(show);
  }, [ready]);

  return ready;
}
