/**
 * Convert an array of fractional shares (should sum ~1.0) to integer percentages
 * that sum to exactly 100. Uses the largest-remainder method so display numbers
 * never look off-by-one from what the user expects.
 *
 * @example
 * toDisplayPercents([0.333, 0.333, 0.334]) // [33, 33, 34]
 * toDisplayPercents([0.1, 0.2, 0.3, 0.4])  // [10, 20, 30, 40]
 */
export function toDisplayPercents(shares: number[]): number[] {
  if (shares.length === 0) return [];
  const total = shares.reduce((s, v) => s + v, 0) || 1;
  // Normalize to 100 and compute floor + remainder for each
  const scaled = shares.map((s) => (s / total) * 100);
  const floors = scaled.map((v) => Math.floor(v));
  const remainders = scaled.map((v, i) => ({ i, r: v - floors[i] }));

  let leftover = 100 - floors.reduce((s, v) => s + v, 0);
  // Distribute leftover % to rows with the largest fractional remainders
  remainders.sort((a, b) => b.r - a.r);
  for (let k = 0; k < leftover && k < remainders.length; k++) {
    floors[remainders[k].i] += 1;
  }
  // If shares summed > 1 (shouldn't happen post-normalize, but defensive)
  leftover = 100 - floors.reduce((s, v) => s + v, 0);
  if (leftover < 0) {
    // Trim from smallest first
    remainders.reverse();
    for (let k = 0; k < -leftover && k < remainders.length; k++) {
      floors[remainders[k].i] = Math.max(0, floors[remainders[k].i] - 1);
    }
  }
  return floors;
}
