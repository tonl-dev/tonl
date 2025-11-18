/**
 * Delta encoding for sequential numeric data
 *
 * Stores differences between consecutive values instead of absolute values.
 * Highly effective for time-series, sequential IDs, and monotonic data.
 *
 * Example:
 * Original:  [100, 101, 102, 103, 104]
 * Delta:     [100, +1, +1, +1, +1]
 * Savings:   ~40% for sequential data
 */

import type { DeltaOptions } from './types.js';

/**
 * Default delta encoding options
 */
const DEFAULT_DELTA_OPTIONS: DeltaOptions = {
  enabled: true,
  minSequenceLength: 5,    // Minimum rows to apply delta encoding
  maxDeltaSize: 1000,      // Maximum delta value (prevents large deltas)
  detectMonotonic: true    // Auto-detect monotonic sequences
};

/**
 * Delta encoding analysis result
 */
export interface DeltaAnalysis {
  isMonotonic: boolean;       // Values consistently increase or decrease
  avgDelta: number;           // Average delta between consecutive values
  maxDelta: number;           // Maximum delta magnitude
  minDelta: number;           // Minimum delta magnitude
  compressionRatio: number;   // Estimated compression (0-1)
  recommended: boolean;       // Whether delta encoding is beneficial
}

/**
 * Delta encoder for sequential numeric data
 */
export class DeltaEncoder {
  private options: DeltaOptions;

  constructor(options: Partial<DeltaOptions> = {}) {
    this.options = {
      ...DEFAULT_DELTA_OPTIONS,
      ...options
    };
  }

  /**
   * Analyze values for delta encoding suitability
   *
   * @param values - Array of numeric values
   * @returns Analysis with recommendations
   */
  analyzeSequence(values: number[]): DeltaAnalysis {
    if (values.length < 2) {
      return {
        isMonotonic: false,
        avgDelta: 0,
        maxDelta: 0,
        minDelta: 0,
        compressionRatio: 0,
        recommended: false
      };
    }

    // Calculate deltas
    const deltas: number[] = [];
    for (let i = 1; i < values.length; i++) {
      deltas.push(values[i] - values[i - 1]);
    }

    // Check monotonicity (all deltas same sign)
    const positiveDeltas = deltas.filter(d => d > 0).length;
    const negativeDeltas = deltas.filter(d => d < 0).length;
    const zeroDeltas = deltas.filter(d => d === 0).length;

    const isMonotonic =
      (positiveDeltas + zeroDeltas === deltas.length) ||  // Non-decreasing
      (negativeDeltas + zeroDeltas === deltas.length);     // Non-increasing

    // Calculate statistics
    const avgDelta = deltas.reduce((sum, d) => sum + Math.abs(d), 0) / deltas.length;
    const maxDelta = Math.max(...deltas.map(Math.abs));
    const minDelta = Math.min(...deltas.map(Math.abs));

    // Estimate compression ratio
    const avgOriginalDigits = values.reduce((sum, v) =>
      sum + v.toString().length, 0
    ) / values.length;

    const avgDeltaDigits = deltas.reduce((sum, d) =>
      sum + (d >= 0 ? d.toString().length + 1 : d.toString().length), 0
    ) / deltas.length;

    // BUG-NEW-005 FIX: Defensive check for division by zero
    const compressionRatio = avgOriginalDigits > 0
      ? Math.max(0, 1 - (avgDeltaDigits / avgOriginalDigits))
      : 0;

    // Recommend if:
    // 1. Sequence is long enough
    // 2. Monotonic (optional)
    // 3. Deltas are smaller than original values
    // 4. Deltas don't exceed maxDeltaSize
    const recommended =
      values.length >= this.options.minSequenceLength &&
      (!this.options.detectMonotonic || isMonotonic) &&
      avgDelta < avgOriginalDigits &&
      maxDelta <= this.options.maxDeltaSize;

    return {
      isMonotonic,
      avgDelta,
      maxDelta,
      minDelta,
      compressionRatio,
      recommended
    };
  }

  /**
   * Encode values using delta encoding
   *
   * First value is stored as-is (base value), subsequent values as deltas.
   *
   * @param values - Array of numeric values
   * @returns Encoded values (base + deltas)
   */
  encode(values: number[]): (number | string)[] {
    if (!this.options.enabled || values.length < 2) {
      return values;
    }

    const result: (number | string)[] = [values[0]]; // Base value

    for (let i = 1; i < values.length; i++) {
      const delta = values[i] - values[i - 1];

      // Format delta with explicit sign
      if (delta > 0) {
        result.push(`+${delta}`);
      } else if (delta < 0) {
        result.push(delta.toString());
      } else {
        result.push('+0');
      }
    }

    return result;
  }

  /**
   * Decode delta-encoded values back to original
   *
   * @param encoded - Delta-encoded values
   * @returns Original values
   */
  decode(encoded: (number | string)[]): number[] {
    if (encoded.length === 0) {
      return [];
    }

    const result: number[] = [];
    const baseValue = typeof encoded[0] === 'number' ? encoded[0] : parseFloat(String(encoded[0]));
    let current = baseValue;
    result.push(current);

    for (let i = 1; i < encoded.length; i++) {
      const deltaStr = String(encoded[i]);
      const delta = parseFloat(deltaStr);

      if (!Number.isFinite(delta)) {
        throw new Error(`Invalid delta value at index ${i}: ${deltaStr}`);
      }

      current = current + delta;
      result.push(current);
    }

    return result;
  }

  /**
   * Generate delta encoding directive
   *
   * Format: @delta columnName
   *
   * @param columnName - Column name
   * @returns TONL directive string
   */
  generateDirective(columnName: string): string {
    return `@delta ${columnName}`;
  }

  /**
   * Parse delta encoding directive
   *
   * @param directive - TONL directive like "@delta timestamp"
   * @returns Column name
   */
  parseDirective(directive: string): string {
    const match = directive.match(/^@delta\s+(.+)$/);
    if (!match) {
      throw new Error(`Invalid delta directive: ${directive}`);
    }

    return match[1].trim();
  }

  /**
   * Check if delta encoding would be beneficial
   *
   * @param values - Numeric values
   * @param minCompressionRatio - Minimum compression ratio (default: 0.15 = 15%)
   * @returns True if delta encoding is recommended
   */
  shouldEncode(values: number[], minCompressionRatio: number = 0.15): boolean {
    if (!this.options.enabled) {
      return false;
    }

    const analysis = this.analyzeSequence(values);
    return analysis.recommended && analysis.compressionRatio >= minCompressionRatio;
  }

  /**
   * Encode with automatic analysis
   *
   * Only applies delta encoding if beneficial
   *
   * @param values - Array of numeric values
   * @returns Encoded values or original if not beneficial
   */
  smartEncode(values: number[]): (number | string)[] {
    if (this.shouldEncode(values)) {
      return this.encode(values);
    }
    return values;
  }

  /**
   * Estimate byte savings from delta encoding
   *
   * @param values - Original values
   * @returns Estimated bytes saved
   */
  estimateSavings(values: number[]): number {
    if (values.length < 2) {
      return 0;
    }

    const originalBytes = values.reduce((sum: number, v: number) =>
      sum + v.toString().length, 0
    );

    const encoded = this.encode(values);
    const encodedBytes = encoded.reduce((sum: number, v: number | string) =>
      sum + String(v).length, 0
    );

    return Math.max(0, originalBytes - encodedBytes);
  }
}

/**
 * Delta decoder for restoring original values
 */
export class DeltaDecoder {
  private deltaColumns: Set<string> = new Set();

  /**
   * Parse and register delta directive
   *
   * @param directive - TONL directive like "@delta timestamp"
   */
  parseDirective(directive: string): void {
    const match = directive.match(/^@delta\s+(.+)$/);
    if (!match) {
      throw new Error(`Invalid delta directive: ${directive}`);
    }

    const columnName = match[1].trim();
    this.deltaColumns.add(columnName);
  }

  /**
   * Check if a column uses delta encoding
   *
   * @param columnName - Column name
   * @returns True if column is delta-encoded
   */
  isDeltaEncoded(columnName: string): boolean {
    return this.deltaColumns.has(columnName);
  }

  /**
   * Decode delta-encoded values
   *
   * @param columnName - Column name
   * @param values - Encoded values
   * @returns Decoded values
   */
  decode(columnName: string, values: (number | string)[]): number[] {
    if (!this.isDeltaEncoded(columnName)) {
      // Not delta-encoded, return as-is
      return values.map(v => typeof v === 'number' ? v : parseFloat(v));
    }

    if (values.length === 0) {
      return [];
    }

    const result: number[] = [];
    const baseValue = typeof values[0] === 'number' ? values[0] : parseFloat(String(values[0]));
    let current = baseValue;
    result.push(current);

    for (let i = 1; i < values.length; i++) {
      const deltaStr = String(values[i]);
      const delta = parseFloat(deltaStr);

      if (!Number.isFinite(delta)) {
        throw new Error(`Invalid delta value at index ${i}: ${deltaStr}`);
      }

      current = current + delta;
      result.push(current);
    }

    return result;
  }

  /**
   * Get all delta-encoded column names
   *
   * @returns Array of column names
   */
  getDeltaColumns(): string[] {
    return Array.from(this.deltaColumns);
  }

  /**
   * Clear all delta directives
   */
  clear(): void {
    this.deltaColumns.clear();
  }
}
