import type { Priorities } from "../types/domain";

export const PRIORITY_KEYS = ["speed", "cost", "coverage"] as const;
export type PriorityKey = (typeof PRIORITY_KEYS)[number];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Keep speed + cost + coverage visually normalized to 1. */
export function setPriorityValue(current: Priorities, key: PriorityKey, raw: number): Priorities {
  const nextValue = Math.min(0.98, Math.max(0.02, raw));
  const others = PRIORITY_KEYS.filter((k) => k !== key);
  const remainder = 1 - nextValue;
  const otherSum = others.reduce((sum, k) => sum + current[k], 0) || remainder;
  const next: Priorities = { ...current, [key]: nextValue };

  others.forEach((k, index) => {
    if (index === others.length - 1) {
      const used = nextValue + others.slice(0, -1).reduce((sum, ok) => sum + next[ok], 0);
      next[k] = round2(1 - used);
    } else {
      next[k] = round2((current[k] / otherSum) * remainder);
    }
  });

  const total = round2(next.speed + next.cost + next.coverage);
  if (total !== 1) {
    next.coverage = round2(next.coverage + (1 - total));
  }
  return next;
}

export function prioritySum(p: Priorities): number {
  return round2(p.speed + p.cost + p.coverage);
}
