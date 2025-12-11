/**
 * Fuzzy Matching Module for TONL Query API
 *
 * Provides fuzzy string matching capabilities including:
 * - Levenshtein distance
 * - Jaro-Winkler similarity
 * - Soundex/Metaphone phonetic matching
 * - Fuzzy contains/startsWith/endsWith
 *
 * @example
 * ```typescript
 * // In query filters:
 * doc.query("users[?(@.name ~= 'john')]")     // fuzzy match
 * doc.query("users[?(@.name ~contains 'smi')]") // fuzzy contains
 * doc.query("users[?(@.name soundsLike 'Smith')]") // phonetic
 * ```
 */

import { SecurityError } from '../errors/index.js';

// Task 013: Import from centralized security limits
import { MAX_STRING_LENGTH } from '../utils/security-limits.js';

/**
 * Options for fuzzy matching operations
 */
export interface FuzzyOptions {
  /**
   * Similarity threshold (0.0 - 1.0)
   * Higher = stricter matching
   * @default 0.7
   */
  threshold?: number;

  /**
   * Case sensitive matching
   * @default false
   */
  caseSensitive?: boolean;

  /**
   * Maximum Levenshtein distance allowed
   * Used for performance optimization
   * @default Infinity
   */
  maxDistance?: number;

  /**
   * Algorithm to use for similarity
   * @default 'levenshtein'
   */
  algorithm?: 'levenshtein' | 'jaro' | 'jaro-winkler' | 'dice';

  /**
   * Timeout in milliseconds to prevent DoS
   * @default 100
   */
  timeout?: number;
}

/**
 * Default fuzzy matching options
 */
const DEFAULT_OPTIONS: Required<FuzzyOptions> = {
  threshold: 0.7,
  caseSensitive: false,
  maxDistance: Infinity,
  algorithm: 'levenshtein',
  timeout: 100
};

// ========================================
// Core Distance/Similarity Algorithms
// ========================================

/**
 * Calculate Levenshtein (edit) distance between two strings
 *
 * Uses Wagner-Fischer algorithm with O(min(m,n)) space optimization
 *
 * @param a - First string
 * @param b - Second string
 * @param maxDistance - Optional early termination if distance exceeds this
 * @returns Edit distance (number of insertions, deletions, substitutions)
 *
 * @example
 * ```typescript
 * levenshteinDistance("kitten", "sitting")  // 3
 * levenshteinDistance("hello", "hello")     // 0
 * levenshteinDistance("abc", "")            // 3
 * ```
 */
export function levenshteinDistance(
  a: string,
  b: string,
  maxDistance: number = Infinity
): number {
  // Security: Limit string length
  if (a.length > MAX_STRING_LENGTH || b.length > MAX_STRING_LENGTH) {
    throw new SecurityError('String too long for fuzzy matching', {
      maxLength: MAX_STRING_LENGTH,
      actualLength: Math.max(a.length, b.length)
    });
  }

  // Optimization: Early returns
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Optimization: Swap to use shorter string for row
  if (a.length > b.length) {
    [a, b] = [b, a];
  }

  const m = a.length;
  const n = b.length;

  // Early termination: length difference exceeds max
  if (n - m > maxDistance) return maxDistance + 1;

  // Wagner-Fischer with single row optimization
  let prevRow = new Array(m + 1);
  let currRow = new Array(m + 1);

  // Initialize first row
  for (let i = 0; i <= m; i++) {
    prevRow[i] = i;
  }

  for (let j = 1; j <= n; j++) {
    currRow[0] = j;

    let minInRow = j;

    for (let i = 1; i <= m; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      currRow[i] = Math.min(
        prevRow[i] + 1,       // deletion
        currRow[i - 1] + 1,   // insertion
        prevRow[i - 1] + cost // substitution
      );

      minInRow = Math.min(minInRow, currRow[i]);
    }

    // Early termination: all values in row exceed max
    if (minInRow > maxDistance) {
      return maxDistance + 1;
    }

    // Swap rows
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[m];
}

/**
 * Calculate Levenshtein similarity (normalized 0-1)
 *
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score (0 = completely different, 1 = identical)
 */
export function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 && b.length === 0) return 1;

  const maxLen = Math.max(a.length, b.length);
  const distance = levenshteinDistance(a, b);

  return 1 - distance / maxLen;
}

/**
 * Calculate Jaro similarity between two strings
 *
 * @param a - First string
 * @param b - Second string
 * @returns Jaro similarity (0-1)
 */
export function jaroSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  // Security: Limit string length
  if (a.length > MAX_STRING_LENGTH || b.length > MAX_STRING_LENGTH) {
    throw new SecurityError('String too long for fuzzy matching', {
      maxLength: MAX_STRING_LENGTH
    });
  }

  const matchWindow = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);

    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;

      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  // BUG-NEW-018 FIX: Add bounds checking to prevent out-of-bounds access
  // The original code could exceed b.length if bMatches has fewer true values
  // than expected due to edge cases in the matching algorithm
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;

    // Advance k to next matched position, with bounds checking
    while (k < b.length && !bMatches[k]) k++;

    // Safety check: ensure k is within bounds before comparison
    if (k >= b.length) break;

    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  return (
    matches / a.length +
    matches / b.length +
    (matches - transpositions / 2) / matches
  ) / 3;
}

/**
 * Calculate Jaro-Winkler similarity
 *
 * Extends Jaro with prefix bonus for strings that match from the start
 *
 * @param a - First string
 * @param b - Second string
 * @param prefixScale - Prefix scale factor (default 0.1, max 0.25)
 * @returns Jaro-Winkler similarity (0-1)
 */
export function jaroWinklerSimilarity(
  a: string,
  b: string,
  prefixScale: number = 0.1
): number {
  const jaroSim = jaroSimilarity(a, b);

  // Find common prefix (up to 4 characters)
  const maxPrefix = Math.min(4, Math.min(a.length, b.length));
  let prefixLen = 0;

  for (let i = 0; i < maxPrefix; i++) {
    if (a[i] === b[i]) {
      prefixLen++;
    } else {
      break;
    }
  }

  // Clamp prefix scale
  prefixScale = Math.min(0.25, prefixScale);

  return jaroSim + prefixLen * prefixScale * (1 - jaroSim);
}

/**
 * Calculate Dice coefficient (bigram similarity)
 *
 * @param a - First string
 * @param b - Second string
 * @returns Dice coefficient (0-1)
 */
export function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  // Security check
  if (a.length > MAX_STRING_LENGTH || b.length > MAX_STRING_LENGTH) {
    throw new SecurityError('String too long for fuzzy matching', {
      maxLength: MAX_STRING_LENGTH
    });
  }

  // Generate bigrams
  const getBigrams = (str: string): Set<string> => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const aBigrams = getBigrams(a);
  const bBigrams = getBigrams(b);

  // Count intersection
  let intersection = 0;
  for (const bigram of aBigrams) {
    if (bBigrams.has(bigram)) intersection++;
  }

  return (2 * intersection) / (aBigrams.size + bBigrams.size);
}

// ========================================
// Phonetic Algorithms
// ========================================

/**
 * Generate Soundex code for a string
 *
 * Classic American Soundex algorithm for phonetic matching
 *
 * @param str - Input string
 * @returns 4-character Soundex code
 *
 * @example
 * ```typescript
 * soundex("Robert")    // "R163"
 * soundex("Rupert")    // "R163"
 * soundex("Smith")     // "S530"
 * soundex("Smythe")    // "S530"
 * ```
 */
export function soundex(str: string): string {
  if (!str || str.length === 0) return '';

  // Convert to uppercase and remove non-alphabetic
  str = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (str.length === 0) return '';

  // Soundex mapping
  const map: Record<string, string> = {
    'B': '1', 'F': '1', 'P': '1', 'V': '1',
    'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
    'D': '3', 'T': '3',
    'L': '4',
    'M': '5', 'N': '5',
    'R': '6'
  };

  // Keep first letter
  let result = str[0];
  let prevCode = map[str[0]] || '';

  // Encode remaining characters
  for (let i = 1; i < str.length && result.length < 4; i++) {
    const code = map[str[i]];

    if (code && code !== prevCode) {
      result += code;
      prevCode = code;
    } else if (!code) {
      // Vowels and H, W reset the previous code
      prevCode = '';
    }
  }

  // Pad with zeros
  return (result + '000').substring(0, 4);
}

/**
 * Generate Double Metaphone codes for a string
 *
 * More sophisticated phonetic algorithm that handles
 * many languages and produces two codes (primary and alternate)
 *
 * @param str - Input string
 * @returns Primary and alternate Metaphone codes
 */
export function metaphone(str: string): { primary: string; alternate: string } {
  if (!str || str.length === 0) {
    return { primary: '', alternate: '' };
  }

  // Simplified Metaphone implementation
  str = str.toUpperCase();

  let primary = '';
  let alternate = '';
  let current = 0;
  const length = str.length;

  // Skip initial silent letters
  if (str.match(/^(GN|KN|PN|WR|PS)/)) {
    current = 1;
  }

  // Handle initial X (sounds like Z)
  if (str[0] === 'X') {
    primary += 'S';
    alternate += 'S';
    current = 1;
  }

  while (current < length && primary.length < 4) {
    const char = str[current];
    const next = str[current + 1] || '';
    const prev = str[current - 1] || '';

    switch (char) {
      case 'A':
      case 'E':
      case 'I':
      case 'O':
      case 'U':
        // Vowels only at the beginning
        if (current === 0) {
          primary += char;
          alternate += char;
        }
        current++;
        break;

      case 'B':
        // B silent after M at end
        if (prev !== 'M' || current !== length - 1) {
          primary += 'P';
          alternate += 'P';
        }
        current++;
        break;

      case 'C':
        if (next === 'H') {
          primary += 'X';
          alternate += 'X';
          current += 2;
        } else if (next === 'I' || next === 'E' || next === 'Y') {
          primary += 'S';
          alternate += 'S';
          current++;
        } else {
          primary += 'K';
          alternate += 'K';
          current++;
        }
        break;

      case 'D':
        if (next === 'G' && 'IEY'.includes(str[current + 2] || '')) {
          primary += 'J';
          alternate += 'J';
          current += 2;
        } else {
          primary += 'T';
          alternate += 'T';
          current++;
        }
        break;

      case 'F':
      case 'J':
      case 'L':
      case 'M':
      case 'N':
      case 'R':
        primary += char;
        alternate += char;
        current++;
        break;

      case 'G':
        if (next === 'H') {
          current += 2;
        } else if (next === 'N') {
          current += 2;
        } else if (next === 'I' || next === 'E' || next === 'Y') {
          primary += 'J';
          alternate += 'K';
          current++;
        } else {
          primary += 'K';
          alternate += 'K';
          current++;
        }
        break;

      case 'H':
        // H silent between vowels
        if ('AEIOU'.includes(prev) && 'AEIOU'.includes(next)) {
          current++;
        } else if (!'CSPTG'.includes(prev)) {
          primary += 'H';
          alternate += 'H';
          current++;
        } else {
          current++;
        }
        break;

      case 'K':
        primary += 'K';
        alternate += 'K';
        current++;
        break;

      case 'P':
        if (next === 'H') {
          primary += 'F';
          alternate += 'F';
          current += 2;
        } else {
          primary += 'P';
          alternate += 'P';
          current++;
        }
        break;

      case 'Q':
        primary += 'K';
        alternate += 'K';
        current++;
        break;

      case 'S':
        if (next === 'H') {
          primary += 'X';
          alternate += 'X';
          current += 2;
        } else if (next === 'I' && (str[current + 2] === 'O' || str[current + 2] === 'A')) {
          primary += 'X';
          alternate += 'S';
          current++;
        } else {
          primary += 'S';
          alternate += 'S';
          current++;
        }
        break;

      case 'T':
        if (next === 'H') {
          primary += '0'; // TH sound
          alternate += 'T';
          current += 2;
        } else if (next === 'I' && (str[current + 2] === 'O' || str[current + 2] === 'A')) {
          primary += 'X';
          alternate += 'X';
          current++;
        } else {
          primary += 'T';
          alternate += 'T';
          current++;
        }
        break;

      case 'V':
        primary += 'F';
        alternate += 'F';
        current++;
        break;

      case 'W':
        if ('AEIOU'.includes(next)) {
          primary += 'W';
          alternate += 'W';
        }
        current++;
        break;

      case 'X':
        primary += 'KS';
        alternate += 'KS';
        current++;
        break;

      case 'Y':
        if ('AEIOU'.includes(next)) {
          primary += 'Y';
          alternate += 'Y';
        }
        current++;
        break;

      case 'Z':
        primary += 'S';
        alternate += 'S';
        current++;
        break;

      default:
        current++;
    }
  }

  return { primary, alternate };
}

/**
 * Check if two strings sound alike using Soundex
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if they have the same Soundex code
 */
export function soundsLike(a: string, b: string): boolean {
  return soundex(a) === soundex(b);
}

/**
 * Check if two strings sound alike using Metaphone
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if they have matching Metaphone codes
 */
export function soundsLikeMetaphone(a: string, b: string): boolean {
  const metaA = metaphone(a);
  const metaB = metaphone(b);

  return (
    metaA.primary === metaB.primary ||
    metaA.primary === metaB.alternate ||
    metaA.alternate === metaB.primary ||
    metaA.alternate === metaB.alternate
  );
}

// ========================================
// High-Level Fuzzy Matching Functions
// ========================================

/**
 * Check if two strings are a fuzzy match
 *
 * @param query - Query string
 * @param target - Target string to match against
 * @param options - Fuzzy matching options
 * @returns True if strings match within threshold
 *
 * @example
 * ```typescript
 * fuzzyMatch("john", "John")           // true (case insensitive)
 * fuzzyMatch("john", "jon")            // true (edit distance 1)
 * fuzzyMatch("john", "jane")           // false
 * fuzzyMatch("john", "joohn", { threshold: 0.8 })  // true
 * ```
 */
export function fuzzyMatch(
  query: string,
  target: string,
  options: FuzzyOptions = {}
): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Normalize case
  if (!opts.caseSensitive) {
    query = query.toLowerCase();
    target = target.toLowerCase();
  }

  // Exact match
  if (query === target) return true;

  // Calculate similarity based on algorithm
  let similarity: number;

  switch (opts.algorithm) {
    case 'jaro':
      similarity = jaroSimilarity(query, target);
      break;
    case 'jaro-winkler':
      similarity = jaroWinklerSimilarity(query, target);
      break;
    case 'dice':
      similarity = diceSimilarity(query, target);
      break;
    case 'levenshtein':
    default:
      similarity = levenshteinSimilarity(query, target);
  }

  return similarity >= opts.threshold;
}

/**
 * Calculate similarity score between two strings
 *
 * @param a - First string
 * @param b - Second string
 * @param options - Fuzzy options
 * @returns Similarity score (0-1)
 */
export function similarity(
  a: string,
  b: string,
  options: FuzzyOptions = {}
): number {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!opts.caseSensitive) {
    a = a.toLowerCase();
    b = b.toLowerCase();
  }

  switch (opts.algorithm) {
    case 'jaro':
      return jaroSimilarity(a, b);
    case 'jaro-winkler':
      return jaroWinklerSimilarity(a, b);
    case 'dice':
      return diceSimilarity(a, b);
    case 'levenshtein':
    default:
      return levenshteinSimilarity(a, b);
  }
}

/**
 * Fuzzy string contains check
 *
 * @param haystack - String to search in
 * @param needle - String to search for
 * @param options - Fuzzy options
 * @returns True if haystack fuzzy-contains needle
 */
export function fuzzyContains(
  haystack: string,
  needle: string,
  options: FuzzyOptions = {}
): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!opts.caseSensitive) {
    haystack = haystack.toLowerCase();
    needle = needle.toLowerCase();
  }

  // Exact contains
  if (haystack.includes(needle)) return true;

  // Sliding window fuzzy match
  const needleLen = needle.length;
  if (needleLen === 0) return true;
  if (haystack.length < needleLen) return fuzzyMatch(haystack, needle, opts);

  // Check each substring of same length
  for (let i = 0; i <= haystack.length - needleLen; i++) {
    const substring = haystack.substring(i, i + needleLen);
    if (fuzzyMatch(needle, substring, opts)) {
      return true;
    }
  }

  // Also check slightly longer substrings
  for (let i = 0; i <= haystack.length - needleLen - 1; i++) {
    const substring = haystack.substring(i, i + needleLen + 1);
    if (fuzzyMatch(needle, substring, opts)) {
      return true;
    }
  }

  return false;
}

/**
 * Fuzzy string starts with check
 *
 * @param str - String to check
 * @param prefix - Prefix to look for
 * @param options - Fuzzy options
 * @returns True if str fuzzy-starts with prefix
 */
export function fuzzyStartsWith(
  str: string,
  prefix: string,
  options: FuzzyOptions = {}
): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!opts.caseSensitive) {
    str = str.toLowerCase();
    prefix = prefix.toLowerCase();
  }

  // Exact starts with
  if (str.startsWith(prefix)) return true;

  // Check beginning of string with some tolerance
  const checkLen = Math.min(str.length, prefix.length + 2);
  const beginning = str.substring(0, checkLen);

  return fuzzyMatch(prefix, beginning, opts);
}

/**
 * Fuzzy string ends with check
 *
 * @param str - String to check
 * @param suffix - Suffix to look for
 * @param options - Fuzzy options
 * @returns True if str fuzzy-ends with suffix
 */
export function fuzzyEndsWith(
  str: string,
  suffix: string,
  options: FuzzyOptions = {}
): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!opts.caseSensitive) {
    str = str.toLowerCase();
    suffix = suffix.toLowerCase();
  }

  // Exact ends with
  if (str.endsWith(suffix)) return true;

  // Check end of string with some tolerance
  const checkLen = Math.min(str.length, suffix.length + 2);
  const ending = str.substring(str.length - checkLen);

  return fuzzyMatch(suffix, ending, opts);
}

/**
 * Find best matches for a query in a list of strings
 *
 * @param query - Query string
 * @param candidates - Array of candidate strings
 * @param options - Fuzzy options + limit
 * @returns Array of matches sorted by similarity
 */
export function fuzzySearch(
  query: string,
  candidates: string[],
  options: FuzzyOptions & { limit?: number } = {}
): Array<{ value: string; similarity: number; index: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const limit = options.limit || 10;

  const results = candidates
    .map((value, index) => ({
      value,
      similarity: similarity(query, value, opts),
      index
    }))
    .filter(r => r.similarity >= opts.threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return results;
}

// ========================================
// Query Integration Functions
// ========================================

/**
 * Evaluate fuzzy operator in filter expression
 *
 * Used internally by filter-evaluator.ts
 *
 * @param operator - Fuzzy operator type
 * @param left - Left operand (target string)
 * @param right - Right operand (query string or options)
 * @returns Boolean result
 */
export function evaluateFuzzyOperator(
  operator: string,
  left: any,
  right: any
): boolean {
  const leftStr = String(left);
  const rightStr = typeof right === 'string' ? right : String(right);

  switch (operator) {
    case '~=':
    case 'fuzzyMatch':
      return fuzzyMatch(rightStr, leftStr);

    case '~contains':
    case 'fuzzyContains':
      return fuzzyContains(leftStr, rightStr);

    case '~startsWith':
    case 'fuzzyStartsWith':
      return fuzzyStartsWith(leftStr, rightStr);

    case '~endsWith':
    case 'fuzzyEndsWith':
      return fuzzyEndsWith(leftStr, rightStr);

    case 'soundsLike':
      return soundsLike(leftStr, rightStr);

    case 'soundsLikeMetaphone':
      return soundsLikeMetaphone(leftStr, rightStr);

    case 'similar':
      // similar operator expects threshold as third argument
      // handled specially in filter-evaluator
      return fuzzyMatch(rightStr, leftStr, { threshold: 0.7 });

    default:
      return false;
  }
}

/**
 * Check if an operator is a fuzzy operator
 */
export function isFuzzyOperator(operator: string): boolean {
  const fuzzyOperators = [
    '~=',
    '~contains',
    '~startsWith',
    '~endsWith',
    'fuzzyMatch',
    'fuzzyContains',
    'fuzzyStartsWith',
    'fuzzyEndsWith',
    'soundsLike',
    'soundsLikeMetaphone',
    'similar'
  ];

  return fuzzyOperators.includes(operator);
}
