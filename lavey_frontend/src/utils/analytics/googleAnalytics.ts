declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackMarketingEvent(name: string, parameters: Record<string, string | number | boolean> = {}): void {
  window.gtag?.('event', name, parameters);
}

