/**
 * Run-Length Encoding (RLE) for consecutive repetitive values
 *
 * Compresses sequences where the same value appears consecutively.
 * Highly effective for status fields, boolean flags, and categorical data.
 *
 * Example:
 * Original:  ["active", "active", "active", "inactive", "inactive"]
 * RLE:       ["active*3", "inactive*2"]
 * Savings:   ~40% for highly repetitive data
 *
 * Format: value*count
 * - Single occurrences remain as-is
 * - Multiple consecutive occurrences: value*N
 */

import type { RLEOptions } from './types.js';

/**
 * Default RLE options
 */
const DEFAULT_RLE_OPTIONS: RLEOptions = {
  enabled: true,
  minRunLength: 2,        // Minimum consecutive count to encode (default: 2)
  maxRunLength: 10000,    // Maximum run length to prevent overflow
  preserveSingletons: true // Keep single values as-is instead of value*1
};

/**
 * Run-length encoding analysis result
 */
export interface RLEAnalysis {
  totalRuns: number;           // Number of runs found
  avgRunLength: number;        // Average run length
  maxRunLength: number;        // Longest run
  compressionRatio: number;    // Estimated compression (0-1)
  recommended: boolean;        // Whether RLE is beneficial
  savings: number;             // Estimated byte savings
}

/**
 * Run-length encoder for consecutive repetitive values
 */
export class RunLengthEncoder {
  private options: RLEOptions;

  constructor(options: Partial<RLEOptions> = {}) {
    this.options = {
      ...DEFAULT_RLE_OPTIONS,
      ...options
    };
  }

  /**
   * Analyze values for RLE suitability
   *
   * @param values - Array of values (any type)
   * @returns Analysis with recommendations
   */
  analyzeSequence(values: any[]): RLEAnalysis {
    if (values.length === 0) {
      return {
        totalRuns: 0,
        avgRunLength: 0,
        maxRunLength: 0,
        compressionRatio: 0,
        recommended: false,
        savings: 0
      };
    }

    // Find runs
    const runs: { value: any; count: number }[] = [];
    let currentValue = values[0];
    let currentCount = 1;

    for (let i = 1; i < values.length; i++) {
      if (values[i] === currentValue) {
        currentCount++;
      } else {
        runs.push({ value: currentValue, count: currentCount });
        currentValue = values[i];
        currentCount = 1;
      }
    }
    runs.push({ value: currentValue, count: currentCount });

    // Calculate statistics
    const totalRuns = runs.length;
    const runLengths = runs.map(r => r.count);
    const avgRunLength = runLengths.reduce((sum, len) => sum + len, 0) / totalRuns;
    const maxRunLength = Math.max(...runLengths);

    // Calculate compression ratio
    const originalBytes = values.reduce((sum: number, v: any) =>
      sum + String(v).length, 0
    );

    let encodedBytes = 0;
    for (const run of runs) {
      const valueStr = String(run.value);
      if (run.count >= this.options.minRunLength) {
        // Encoded as "value*count"
        encodedBytes += valueStr.length + 1 + String(run.count).length;
      } else if (this.options.preserveSingletons) {
        // Keep as-is
        encodedBytes += valueStr.length * run.count;
      } else {
        // Still encode even if below minRunLength
        encodedBytes += valueStr.length + 1 + String(run.count).length;
      }
    }

    const savings = Math.max(0, originalBytes - encodedBytes);
    const compressionRatio = originalBytes > 0 ? savings / originalBytes : 0;

    // Recommend if:
    // 1. Has at least one run meeting minRunLength
    // 2. Overall compression is positive
    // 3. Average run length >= minRunLength
    const hasLongRuns = runs.some(r => r.count >= this.options.minRunLength);
    const recommended =
      hasLongRuns &&
      savings > 0 &&
      avgRunLength >= this.options.minRunLength;

    return {
      totalRuns,
      avgRunLength,
      maxRunLength,
      compressionRatio,
      recommended,
      savings
    };
  }

  /**
   * Encode values using run-length encoding
   *
   * @param values - Array of values
   * @returns Encoded values with run-length notation
   */
  encode(values: any[]): string[] {
    if (!this.options.enabled || values.length === 0) {
      return values.map(v => String(v));
    }

    const result: string[] = [];
    let currentValue = values[0];
    let currentCount = 1;

    for (let i = 1; i < values.length; i++) {
      if (values[i] === currentValue && currentCount < this.options.maxRunLength) {
        currentCount++;
      } else {
        // Flush current run
        this.encodeRun(currentValue, currentCount, result);
        currentValue = values[i];
        currentCount = 1;
      }
    }
    // Flush final run
    this.encodeRun(currentValue, currentCount, result);

    return result;
  }

  /**
   * Encode a single run and append to result array
   *
   * @param value - The value
   * @param count - Number of consecutive occurrences
   * @param result - Array to append encoded values to
   */
  private encodeRun(value: any, count: number, result: string[]): void {
    const valueStr = String(value);

    if (count >= this.options.minRunLength) {
      // Use run-length notation
      result.push(`${valueStr}*${count}`);
    } else if (this.options.preserveSingletons) {
      // Add individual values to array
      for (let i = 0; i < count; i++) {
        result.push(valueStr);
      }
    } else {
      // Always use run notation even for short runs
      result.push(`${valueStr}*${count}`);
    }
  }

  /**
   * Decode run-length encoded values
   *
   * @param encoded - RLE-encoded values
   * @returns Original values
   */
  decode(encoded: string[]): string[] {
    const result: string[] = [];

    for (const item of encoded) {
      // Check if item contains asterisk (might be RLE notation)
      if (item.includes('*')) {
        const match = item.match(/^(.+?)\*(\d+)$/);

        if (match) {
          // Valid RLE notation: value*count
          const value = match[1];
          const count = parseInt(match[2], 10);

          if (!Number.isFinite(count) || count < 1 || count > this.options.maxRunLength) {
            throw new Error(`Invalid run length: ${count} in "${item}"`);
          }

          for (let i = 0; i < count; i++) {
            result.push(value);
          }
        } else {
          // Contains *, but invalid format - check for common errors
          const asteriskMatch = item.match(/^(.+?)\*(.+)$/);
          if (asteriskMatch && asteriskMatch[2]) {
            // Has * but second part is not a valid number
            throw new Error(`Invalid run length format: "${item}"`);
          }
          // Otherwise, treat as literal value (e.g., value itself contains *)
          result.push(item);
        }
      } else {
        // No asterisk, regular single value
        result.push(item);
      }
    }

    return result;
  }

  /**
   * Generate RLE directive
   *
   * Format: @rle columnName
   *
   * @param columnName - Column name
   * @returns TONL directive string
   */
  generateDirective(columnName: string): string {
    return `@rle ${columnName}`;
  }

  /**
   * Parse RLE directive
   *
   * @param directive - TONL directive like "@rle status"
   * @returns Column name
   */
  parseDirective(directive: string): string {
    const match = directive.match(/^@rle\s+(.+)$/);
    if (!match) {
      throw new Error(`Invalid RLE directive: ${directive}`);
    }

    return match[1].trim();
  }

  /**
   * Check if RLE would be beneficial
   *
   * @param values - Values to analyze
   * @param minCompressionRatio - Minimum compression ratio (default: 0.15 = 15%)
   * @returns True if RLE is recommended
   */
  shouldEncode(values: any[], minCompressionRatio: number = 0.15): boolean {
    if (!this.options.enabled) {
      return false;
    }

    const analysis = this.analyzeSequence(values);
    return analysis.recommended && analysis.compressionRatio >= minCompressionRatio;
  }

  /**
   * Encode with automatic analysis
   *
   * Only applies RLE if beneficial
   *
   * @param values - Array of values
   * @returns Encoded values or original if not beneficial
   */
  smartEncode(values: any[]): string[] {
    if (this.shouldEncode(values)) {
      return this.encode(values);
    }
    return values.map(v => String(v));
  }

  /**
   * Estimate byte savings from RLE
   *
   * @param values - Original values
   * @returns Estimated bytes saved
   */
  estimateSavings(values: any[]): number {
    const analysis = this.analyzeSequence(values);
    return analysis.savings;
  }
}

/**
 * Run-length decoder for restoring original values
 */
export class RunLengthDecoder {
  private rleColumns: Set<string> = new Set();

  /**
   * Parse and register RLE directive
   *
   * @param directive - TONL directive like "@rle status"
   */
  parseDirective(directive: string): void {
    const match = directive.match(/^@rle\s+(.+)$/);
    if (!match) {
      throw new Error(`Invalid RLE directive: ${directive}`);
    }

    const columnName = match[1].trim();
    this.rleColumns.add(columnName);
  }

  /**
   * Check if a column uses RLE
   *
   * @param columnName - Column name
   * @returns True if column is RLE-encoded
   */
  isRLEEncoded(columnName: string): boolean {
    return this.rleColumns.has(columnName);
  }

  /**
   * Decode RLE-encoded values
   *
   * @param columnName - Column name
   * @param values - Encoded values
   * @returns Decoded values
   */
  decode(columnName: string, values: string[]): string[] {
    if (!this.isRLEEncoded(columnName)) {
      // Not RLE-encoded, return as-is
      return values;
    }

    const result: string[] = [];

    for (const item of values) {
      const match = String(item).match(/^(.+?)\*(\d+)$/);

      if (match) {
        // Run-length encoded: value*count
        const value = match[1];
        const count = parseInt(match[2], 10);

        if (!Number.isFinite(count) || count < 1) {
          throw new Error(`Invalid run length: ${count} in "${item}"`);
        }

        for (let i = 0; i < count; i++) {
          result.push(value);
        }
      } else {
        // Not encoded, single value
        result.push(String(item));
      }
    }

    return result;
  }

  /**
   * Get all RLE-encoded column names
   *
   * @returns Array of column names
   */
  getRLEColumns(): string[] {
    return Array.from(this.rleColumns);
  }

  /**
   * Clear all RLE directives
   */
  clear(): void {
    this.rleColumns.clear();
  }
}
