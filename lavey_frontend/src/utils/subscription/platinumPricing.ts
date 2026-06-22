/** Parse a display price like "$14.99" and apply a percentage discount. */
export function applyPriceDiscount(displayPrice: string, percentOff: number): string {
  const match = displayPrice.match(/(\$?)([\d,]+(?:\.\d{1,2})?)/);
  if (!match || percentOff <= 0) return displayPrice;

  const prefix = match[1] || '$';
  const amount = Number.parseFloat(match[2].replace(/,/g, ''));
  if (!Number.isFinite(amount)) return displayPrice;

  const discounted = amount * (1 - percentOff / 100);
  return `${prefix}${discounted.toFixed(2)}`;
}
