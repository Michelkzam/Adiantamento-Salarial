export function toCents(value: number): number {
  return Math.round((Number(value) || 0) * 100);
}

export function fromCents(cents: number): number {
  return (Number(cents) || 0) / 100;
}

export function percentToBasisPoints(percent: number): number {
  return Math.round((Number(percent) || 0) * 100);
}

export function basisPointsToPercent(bp: number): number {
  return (Number(bp) || 0) / 100;
}
