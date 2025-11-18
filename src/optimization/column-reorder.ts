/**
 * Column reordering based on entropy analysis
 *
 * Reorders columns to optimize tokenizer performance by placing
 * low-entropy (repetitive) columns first, which provides better
 * context for BPE tokenizers.
 */

import type { ColumnReorderResult } from './types.js';

/**
 * Column reorderer with entropy-based optimization
 */
export class ColumnReorderer {
  /**
   * Calculate Shannon entropy for column values
   *
   * H(X) = -Σ p(x) * log₂(p(x))
   *
   * Lower entropy = more repetitive = better for left context
   * Higher entropy = more unique = worse for left context
   *
   * @param values - Array of values in the column
   * @returns Entropy value (0 = all same, higher = more diverse)
   */
  calculateEntropy(values: any[]): number {
    if (values.length === 0) {
      return 0;
    }

    // Count frequency of each unique value
    const frequencyMap = new Map<string, number>();
    for (const value of values) {
      const key = String(value);
      frequencyMap.set(key, (frequencyMap.get(key) || 0) + 1);
    }

    // Calculate entropy: H(X) = -Σ p(x) * log₂(p(x))
    let entropy = 0;
    const total = values.length;

    for (const frequency of frequencyMap.values()) {
      const probability = frequency / total;
      if (probability > 0) {
        // Use natural log and convert to base 2: log₂(x) = ln(x) / ln(2)
        entropy -= probability * Math.log(probability) / Math.LN2;
      }
    }

    return entropy;
  }

  /**
   * Analyze all columns and calculate their entropies
   *
   * @param data - Array of objects
   * @param columns - Column names to analyze
   * @returns Map of column name to entropy value
   */
  analyzeColumns(data: any[], columns: string[]): Map<string, number> {
    const entropies = new Map<string, number>();

    for (const column of columns) {
      const values = data.map(item => item[column]);
      const entropy = this.calculateEntropy(values);
      entropies.set(column, entropy);
    }

    return entropies;
  }

  /**
   * Reorder columns by ascending entropy (low to high)
   *
   * Low entropy columns (repetitive) come first to provide
   * better context for tokenizers.
   *
   * @param data - Array of objects
   * @param columns - Original column order
   * @returns Reordering result with new order and mapping
   */
  reorderColumns(data: any[], columns: string[]): ColumnReorderResult {
    // Calculate entropies
    const entropies = this.analyzeColumns(data, columns);

    // Sort columns by entropy (ascending)
    const sortedColumns = [...columns].sort((a, b) => {
      const entropyA = entropies.get(a) || 0;
      const entropyB = entropies.get(b) || 0;
      return entropyA - entropyB;
    });

    // Create mapping: original index in new order
    const mapping = sortedColumns.map(col => columns.indexOf(col));

    return {
      reorderedColumns: sortedColumns,
      mapping,
      entropies
    };
  }

  /**
   * Generate column mapping directive
   *
   * Format: @colmap 2,0,1,3,4
   * Represents original indices in optimized order
   *
   * @param mapping - Array of original indices
   * @returns TONL directive string
   */
  generateMappingDirective(mapping: number[]): string {
    return `@colmap ${mapping.join(',')}`;
  }

  /**
   * Parse column mapping directive
   *
   * @param directive - TONL directive like "@colmap 2,0,1"
   * @returns Array of original indices
   */
  parseMappingDirective(directive: string): number[] {
    // Remove @colmap prefix and trim
    const content = directive.replace(/^@colmap\s+/, '').trim();

    // Split by comma and parse integers
    const indices = content.split(',').map(s => {
      const num = parseInt(s.trim(), 10);
      if (!Number.isFinite(num) || num < 0) {
        throw new Error(`Invalid column mapping: ${s}`);
      }
      return num;
    });

    // BUG-NEW-008 FIX: Check for duplicate indices to prevent data corruption
    const uniqueIndices = new Set(indices);
    if (uniqueIndices.size !== indices.length) {
      throw new Error('Column mapping contains duplicate indices');
    }

    return indices;
  }

  /**
   * Restore original column order using mapping
   *
   * @param reorderedColumns - Columns in optimized order
   * @param mapping - Original indices in optimized order
   * @returns Columns in original order
   */
  restoreOriginalOrder(reorderedColumns: string[], mapping: number[]): string[] {
    if (reorderedColumns.length !== mapping.length) {
      throw new Error('Column count and mapping length mismatch');
    }

    const original = new Array(reorderedColumns.length);

    // BUG-NEW-001 FIX: Validate mapping indices are within bounds
    for (let i = 0; i < reorderedColumns.length; i++) {
      const originalIndex = mapping[i];
      if (originalIndex < 0 || originalIndex >= reorderedColumns.length) {
        throw new Error(`Invalid mapping index: ${originalIndex} (must be 0-${reorderedColumns.length - 1})`);
      }
      original[originalIndex] = reorderedColumns[i];
    }

    return original;
  }

  /**
   * Reorder row data according to column mapping
   *
   * @param row - Object with data
   * @param originalColumns - Original column order
   * @param reorderedColumns - New column order
   * @returns Object with reordered fields
   */
  reorderRow(row: any, originalColumns: string[], reorderedColumns: string[]): any {
    const reordered: any = {};

    for (const column of reorderedColumns) {
      if (column in row) {
        reordered[column] = row[column];
      }
    }

    return reordered;
  }

  /**
   * Calculate potential token savings from reordering
   *
   * This is an estimate based on entropy reduction in left-context.
   * Lower entropy first = better compression in BPE tokenizers.
   *
   * @param entropies - Map of column to entropy
   * @param originalOrder - Original column order
   * @param optimizedOrder - Optimized column order
   * @returns Estimated token savings percentage (0-1)
   */
  estimateSavings(
    entropies: Map<string, number>,
    originalOrder: string[],
    optimizedOrder: string[]
  ): number {
    if (originalOrder.length === 0) {
      return 0;
    }

    // Calculate weighted entropy for original order
    // Early columns have more weight (provide more context)
    let originalWeightedEntropy = 0;
    let optimizedWeightedEntropy = 0;

    for (let i = 0; i < originalOrder.length; i++) {
      // Weight decreases exponentially: 1.0, 0.5, 0.25, 0.125...
      const weight = Math.pow(0.5, i);

      const originalCol = originalOrder[i];
      const optimizedCol = optimizedOrder[i];

      originalWeightedEntropy += (entropies.get(originalCol) || 0) * weight;
      optimizedWeightedEntropy += (entropies.get(optimizedCol) || 0) * weight;
    }

    // Calculate improvement
    if (originalWeightedEntropy === 0) {
      return 0;
    }

    const improvement = (originalWeightedEntropy - optimizedWeightedEntropy) / originalWeightedEntropy;

    // Token savings is roughly 8-12% of entropy improvement
    // This is a conservative estimate based on BPE tokenizer behavior
    return Math.max(0, improvement * 0.10);
  }

  /**
   * Check if reordering would be beneficial
   *
   * @param data - Array of objects
   * @param columns - Column names
   * @param minSavingsThreshold - Minimum savings to apply reordering (default: 0.05 = 5%)
   * @returns True if reordering is recommended
   */
  shouldReorder(data: any[], columns: string[], minSavingsThreshold: number = 0.05): boolean {
    if (columns.length <= 1) {
      return false; // Nothing to reorder
    }

    const result = this.reorderColumns(data, columns);

    // Check if order actually changed
    const orderChanged = !columns.every((col, i) => col === result.reorderedColumns[i]);
    if (!orderChanged) {
      return false; // Already optimal
    }

    // Calculate potential savings
    const savings = this.estimateSavings(result.entropies, columns, result.reorderedColumns);

    return savings >= minSavingsThreshold;
  }
}
