/**
 * Numeric quantization for precision control
 *
 * Reduces token count by limiting floating-point precision
 * while preserving meaningful digits.
 */

import type { QuantizationOptions } from './types.js';

/**
 * Default quantization options
 */
const DEFAULT_QUANT_OPTIONS: QuantizationOptions = {
  enabled: true,
  defaultPrecision: 2,
  autoDetect: true,
  preserveIntegers: true,
  columnOverrides: new Map()
};

/**
 * Precision analysis result
 */
export interface PrecisionAnalysis {
  suggestedPrecision: number;
  minValue: number;
  maxValue: number;
  range: number;
  hasDecimals: boolean;
  lossEstimate: number; // Percentage of information loss
  tokenSavings: number; // Estimated token reduction
}

/**
 * Numeric quantizer for precision control
 */
export class NumericQuantizer {
  private options: QuantizationOptions;

  constructor(options: Partial<QuantizationOptions> = {}) {
    this.options = {
      ...DEFAULT_QUANT_OPTIONS,
      ...options,
      columnOverrides: options.columnOverrides || new Map()
    };
  }

  /**
   * Analyze numeric column and suggest optimal precision
   *
   * @param values - Array of numeric values
   * @returns Precision analysis with recommendations
   */
  analyzePrecision(values: number[]): PrecisionAnalysis {
    const numericValues = values.filter(v => typeof v === 'number' && Number.isFinite(v));

    if (numericValues.length === 0) {
      return {
        suggestedPrecision: this.options.defaultPrecision,
        minValue: 0,
        maxValue: 0,
        range: 0,
        hasDecimals: false,
        lossEstimate: 0,
        tokenSavings: 0
      };
    }

    const minValue = Math.min(...numericValues);
    const maxValue = Math.max(...numericValues);
    const range = maxValue - minValue;

    // Check if all values are integers
    const hasDecimals = numericValues.some(v => !Number.isInteger(v));

    if (!hasDecimals && this.options.preserveIntegers) {
      return {
        suggestedPrecision: 0,
        minValue,
        maxValue,
        range,
        hasDecimals: false,
        lossEstimate: 0,
        tokenSavings: 0
      };
    }

    // Analyze decimal precision needed
    const suggestedPrecision = this.calculateOptimalPrecision(numericValues, range);

    // Estimate information loss
    const lossEstimate = this.estimateLoss(numericValues, suggestedPrecision);

    // Estimate token savings
    const tokenSavings = this.estimateTokenSavings(numericValues, suggestedPrecision);

    return {
      suggestedPrecision,
      minValue,
      maxValue,
      range,
      hasDecimals,
      lossEstimate,
      tokenSavings
    };
  }

  /**
   * Calculate optimal precision based on value distribution
   *
   * @param values - Numeric values
   * @param range - Value range
   * @returns Suggested decimal places
   */
  private calculateOptimalPrecision(values: number[], range: number): number {
    if (range === 0) {
      return 0; // All values are the same
    }

    // Calculate average number of significant decimal places
    let totalDecimals = 0;
    let count = 0;

    for (const value of values) {
      if (!Number.isFinite(value)) continue;

      const str = value.toString();
      const decimalIndex = str.indexOf('.');

      if (decimalIndex !== -1) {
        const decimals = str.length - decimalIndex - 1;
        totalDecimals += decimals;
        count++;
      }
    }

    if (count === 0) {
      return 0; // No decimal values
    }

    const avgDecimals = totalDecimals / count;

    // Round to practical precision (0, 1, 2, 3, 4, 6, 8)
    if (avgDecimals <= 1) return 1;
    if (avgDecimals <= 2) return 2;
    if (avgDecimals <= 3) return 3;
    if (avgDecimals <= 4) return 4;
    if (avgDecimals <= 6) return 6;
    return 8; // Cap at 8 decimal places
  }

  /**
   * Estimate information loss from quantization
   *
   * @param values - Original values
   * @param precision - Target precision
   * @returns Loss as percentage (0-1)
   */
  private estimateLoss(values: number[], precision: number): number {
    if (values.length === 0 || precision >= 10) {
      return 0; // No significant loss
    }

    let totalError = 0;

    for (const value of values) {
      if (!Number.isFinite(value)) continue;

      const quantized = this.quantize(value, precision);
      const error = Math.abs(value - quantized);
      const relativeError = value !== 0 ? error / Math.abs(value) : error;

      totalError += relativeError;
    }

    const avgError = totalError / values.length;

    // Convert to percentage
    return Math.min(avgError * 100, 100);
  }

  /**
   * Estimate token savings from quantization
   *
   * @param values - Original values
   * @param precision - Target precision
   * @returns Estimated percentage of tokens saved (0-1)
   */
  private estimateTokenSavings(values: number[], precision: number): number {
    if (values.length === 0) {
      return 0;
    }

    let originalTokens = 0;
    let quantizedTokens = 0;

    for (const value of values) {
      if (!Number.isFinite(value)) continue;

      // Estimate tokens: roughly 1 token per 3-4 characters
      const originalStr = value.toString();
      const quantizedStr = this.quantize(value, precision).toString();

      originalTokens += Math.ceil(originalStr.length / 3.5);
      quantizedTokens += Math.ceil(quantizedStr.length / 3.5);
    }

    if (originalTokens === 0) {
      return 0;
    }

    const savings = (originalTokens - quantizedTokens) / originalTokens;
    return Math.max(0, savings);
  }

  /**
   * Quantize a numeric value to specified precision
   *
   * @param value - Number to quantize
   * @param precision - Decimal places (0 for integer)
   * @returns Quantized value
   */
  quantize(value: number, precision: number): number {
    if (!Number.isFinite(value)) {
      return value; // Preserve NaN, Infinity
    }

    if (precision === 0) {
      return Math.round(value);
    }

    const multiplier = Math.pow(10, precision);
    return Math.round(value * multiplier) / multiplier;
  }

  /**
   * Smart quantize - preserve meaningful digits automatically
   *
   * Examples:
   * - 0.00123 → 0.00123 (keep 5 decimals for small values)
   * - 123.456 → 123.46 (keep 2 decimals for large values)
   * - 0.1 → 0.1 (keep 1 decimal if significant)
   *
   * @param value - Number to quantize
   * @returns Quantized value
   */
  smartQuantize(value: number): number {
    if (!Number.isFinite(value) || value === 0) {
      return value;
    }

    const absValue = Math.abs(value);

    // For very small values, preserve more decimals
    if (absValue < 0.01) {
      return this.quantize(value, 6);
    }

    // For small values, preserve moderate decimals
    if (absValue < 1) {
      return this.quantize(value, 4);
    }

    // For moderate values, use standard precision
    if (absValue < 100) {
      return this.quantize(value, 2);
    }

    // For large values, use fewer decimals
    if (absValue < 10000) {
      return this.quantize(value, 1);
    }

    // For very large values, round to integer
    return Math.round(value);
  }

  /**
   * Quantize an array of values with column-specific precision
   *
   * @param values - Array of numbers
   * @param columnName - Column name (for override lookup)
   * @returns Quantized values
   */
  quantizeColumn(values: number[], columnName?: string): number[] {
    if (!this.options.enabled) {
      return values;
    }

    let precision = this.options.defaultPrecision;

    // Priority: column override > auto-detect > default
    if (columnName && this.options.columnOverrides.has(columnName)) {
      // Column-specific override takes precedence
      precision = this.options.columnOverrides.get(columnName)!;
    } else if (this.options.autoDetect && columnName === undefined) {
      // Only auto-detect when no column name is provided
      const analysis = this.analyzePrecision(values);
      precision = analysis.suggestedPrecision;
    } else if (this.options.autoDetect && columnName) {
      // Auto-detect for named column (but no override set)
      const analysis = this.analyzePrecision(values);
      precision = analysis.suggestedPrecision;
    }
    // else: use defaultPrecision

    return values.map(v => this.quantize(v, precision));
  }

  /**
   * Generate precision directive
   *
   * Format: @precision columnName=2
   *
   * @param columnName - Column name
   * @param precision - Decimal places
   * @returns TONL directive string
   */
  generatePrecisionDirective(columnName: string, precision: number): string {
    return `@precision ${columnName}=${precision}`;
  }

  /**
   * Parse precision directive
   *
   * @param directive - TONL directive like "@precision price=2"
   * @returns Object with column name and precision
   */
  parsePrecisionDirective(directive: string): { column: string; precision: number } {
    // Remove @precision prefix and trim
    const content = directive.replace(/^@precision\s+/, '').trim();

    // Split by equals sign
    const parts = content.split('=');
    if (parts.length !== 2) {
      throw new Error(`Invalid precision directive: ${directive}`);
    }

    const column = parts[0].trim();
    const precision = parseInt(parts[1].trim(), 10);

    // Limit precision to 15 decimal places to match JavaScript's Number precision limits
    // (IEEE 754 double precision supports ~15-17 significant decimal digits)
    if (!Number.isFinite(precision) || precision < 0 || precision > 15) {
      throw new Error(`Invalid precision value: ${parts[1]} (must be 0-15)`);
    }

    return { column, precision };
  }

  /**
   * Get precision for a column
   *
   * @param columnName - Column name
   * @returns Configured precision or default
   */
  getPrecision(columnName: string): number {
    return this.options.columnOverrides.get(columnName) || this.options.defaultPrecision;
  }

  /**
   * Set precision for a column
   *
   * @param columnName - Column name
   * @param precision - Decimal places
   */
  setPrecision(columnName: string, precision: number): void {
    this.options.columnOverrides.set(columnName, precision);
  }

  /**
   * Check if quantization would be beneficial
   *
   * @param values - Numeric values
   * @param minSavingsThreshold - Minimum token savings (default: 0.10 = 10%)
   * @returns True if quantization is recommended
   */
  shouldQuantize(values: number[], minSavingsThreshold: number = 0.10): boolean {
    if (!this.options.enabled) {
      return false;
    }

    const analysis = this.analyzePrecision(values);

    // Don't quantize if all integers and preserveIntegers is true
    if (!analysis.hasDecimals && this.options.preserveIntegers) {
      return false;
    }

    // Check if savings exceed threshold
    return analysis.tokenSavings >= minSavingsThreshold;
  }
}
