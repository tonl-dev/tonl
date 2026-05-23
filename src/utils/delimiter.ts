import type { TONLDelimiter } from '../types.js';

const DELIMITERS: TONLDelimiter[] = [',', '|', '\t', ';'];

export function chooseSmartDelimiter(input: unknown): TONLDelimiter {
  const counts: Record<TONLDelimiter, number> = {
    ',': 0,
    '|': 0,
    '\t': 0,
    ';': 0,
  };
  const seen = new WeakSet<object>();

  countDelimiterUsage(input, counts, seen);

  let bestDelimiter: TONLDelimiter = ',';
  let lowestCount = counts[bestDelimiter];

  for (const delimiter of DELIMITERS.slice(1)) {
    if (counts[delimiter] < lowestCount) {
      bestDelimiter = delimiter;
      lowestCount = counts[delimiter];
    }
  }

  return bestDelimiter;
}

function countDelimiterUsage(
  value: unknown,
  counts: Record<TONLDelimiter, number>,
  seen: WeakSet<object>
): void {
  if (typeof value === 'string') {
    countString(value, counts);
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      countDelimiterUsage(item, counts, seen);
    }
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    countString(key, counts);
    countDelimiterUsage(child, counts, seen);
  }
}

function countString(value: string, counts: Record<TONLDelimiter, number>): void {
  for (const char of value) {
    if (char === ',' || char === '|' || char === '\t' || char === ';') {
      counts[char]++;
    }
  }
}
