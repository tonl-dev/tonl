/**
 * Adaptive Compression - Automatic optimization strategy selection
 *
 * Analyzes data characteristics and selects the best optimization strategies
 * for each column automatically. Combines multiple techniques for maximum
 * compression.
 *
 * Features:
 * - Automatic strategy selection per column
 * - Multi-strategy combination
 * - Performance-aware decision making
 * - Comprehensive analysis and reporting
 */

import type { AdaptiveOptions, OptimizationStrategy, OptimizationAnalysis } from './types.js';
import { DictionaryBuilder } from './dictionary.js';
import { ColumnReorderer } from './column-reorder.js';
import { NumericQuantizer } from './quantizer.js';
import { DeltaEncoder } from './delta.js';
import { RunLengthEncoder } from './rle.js';

/**
 * Default adaptive compression options
 */
const DEFAULT_ADAPTIVE_OPTIONS: AdaptiveOptions = {
  enabled: true,
  perBlockOptimization: false,
  strategies: [
    'dictionary',
    'delta',
    'rle',
    'column-reorder',
    'quantize'
  ]
};

/**
 * Column analysis result with recommended strategies
 */
export interface ColumnAnalysis {
  columnName: string;
  dataType: 'string' | 'number' | 'boolean' | 'mixed';
  uniqueValues: number;
  totalValues: number;
  hasNulls: boolean;
  recommendedStrategies: OptimizationStrategy[];
  estimatedSavings: number; // Percentage
  reasoning: string;
}

/**
 * Adaptive compression optimizer
 *
 * Automatically selects and applies the best optimization strategies
 * for each column based on data characteristics.
 */
export class AdaptiveOptimizer {
  private options: AdaptiveOptions;
  private dictBuilder: DictionaryBuilder;
  private columnReorderer: ColumnReorderer;
  private quantizer: NumericQuantizer;
  private deltaEncoder: DeltaEncoder;
  private rleEncoder: RunLengthEncoder;

  constructor(options: Partial<AdaptiveOptions> = {}) {
    this.options = {
      ...DEFAULT_ADAPTIVE_OPTIONS,
      ...options
    };

    // Initialize optimizers
    this.dictBuilder = new DictionaryBuilder();
    this.columnReorderer = new ColumnReorderer();
    this.quantizer = new NumericQuantizer({ autoDetect: true });
    this.deltaEncoder = new DeltaEncoder();
    this.rleEncoder = new RunLengthEncoder();
  }

  /**
   * Analyze a column and recommend optimization strategies
   *
   * @param values - Column values
   * @param columnName - Column name
   * @returns Analysis with recommendations
   */
  analyzeColumn(values: any[], columnName: string): ColumnAnalysis {
    // Determine data type
    const dataType = this.detectDataType(values);

    // Basic statistics
    const uniqueValues = new Set(values).size;
    const totalValues = values.length;
    const hasNulls = values.some(v => v === null || v === undefined);

    // Guard against empty arrays
    if (totalValues === 0) {
      return {
        columnName,
        dataType,
        uniqueValues: 0,
        totalValues: 0,
        hasNulls: false,
        recommendedStrategies: [],
        estimatedSavings: 0,
        reasoning: 'Empty column'
      };
    }

    const recommendedStrategies: OptimizationStrategy[] = [];
    let estimatedSavings = 0;
    const reasons: string[] = [];

    // Strategy 1: Dictionary Encoding (for categorical data)
    if (this.options.strategies.includes('dictionary')) {
      const uniqueRatio = uniqueValues / totalValues;
      if (uniqueRatio < 0.5 && uniqueValues < 1000) {
        const dict = this.dictBuilder.buildDictionary(values, columnName);
        if (dict && dict.totalSavings > 0) {
          recommendedStrategies.push('dictionary');
          estimatedSavings += 15; // ~15% savings from dictionary
          reasons.push(`Low unique ratio (${(uniqueRatio * 100).toFixed(1)}%)`);
        }
      }
    }

    // Strategy 2: Delta Encoding (for sequential numeric data)
    if (this.options.strategies.includes('delta') && dataType === 'number') {
      const numericValues = values.filter(v => typeof v === 'number') as number[];
      if (numericValues.length > 5) {
        const analysis = this.deltaEncoder.analyzeSequence(numericValues);
        if (analysis.recommended) {
          recommendedStrategies.push('delta');
          estimatedSavings += Math.round(analysis.compressionRatio * 100);
          reasons.push(`Sequential pattern detected (${analysis.isMonotonic ? 'monotonic' : 'non-monotonic'})`);
        }
      }
    }

    // Strategy 3: Run-Length Encoding (for repetitive consecutive values)
    if (this.options.strategies.includes('rle')) {
      const analysis = this.rleEncoder.analyzeSequence(values);
      if (analysis.recommended) {
        recommendedStrategies.push('rle');
        estimatedSavings += Math.round(analysis.compressionRatio * 100);
        reasons.push(`Consecutive repetitions (avg run: ${analysis.avgRunLength.toFixed(1)})`);
      }
    }

    // Strategy 4: Numeric Quantization (for high-precision floats)
    if (this.options.strategies.includes('quantize') && dataType === 'number') {
      const numericValues = values.filter(v => typeof v === 'number') as number[];
      if (numericValues.length > 0) {
        const precisionAnalysis = this.quantizer.analyzePrecision(numericValues);
        if (precisionAnalysis.hasDecimals && precisionAnalysis.tokenSavings > 0.1) {
          recommendedStrategies.push('quantize');
          estimatedSavings += Math.round(precisionAnalysis.tokenSavings * 100);
          reasons.push(`High precision (${precisionAnalysis.suggestedPrecision} decimals suggested)`);
        }
      }
    }

    // Combine reasoning
    const reasoning = reasons.length > 0
      ? reasons.join('; ')
      : 'No optimization recommended';

    return {
      columnName,
      dataType,
      uniqueValues,
      totalValues,
      hasNulls,
      recommendedStrategies,
      estimatedSavings: Math.min(estimatedSavings, 100), // Cap at 100%
      reasoning
    };
  }

  /**
   * Analyze entire dataset and recommend optimization strategies
   *
   * @param data - Array of row objects
   * @param columns - Column names (optional, extracted from data if not provided)
   * @returns Complete analysis with recommendations
   */
  analyzeDataset(data: any[], columns?: string[]): OptimizationAnalysis {
    if (!this.options.enabled || data.length === 0) {
      return {
        recommendedStrategies: [],
        estimatedSavings: 0,
        appliedOptimizations: [],
        warnings: ['Adaptive compression disabled or no data']
      };
    }

    // Extract column names if not provided
    const columnNames = columns || Object.keys(data[0] || {});

    // Analyze each column
    const columnAnalyses: ColumnAnalysis[] = [];
    for (const columnName of columnNames) {
      const values = data.map(row => row[columnName]);
      const analysis = this.analyzeColumn(values, columnName);
      columnAnalyses.push(analysis);
    }

    // Aggregate recommendations
    const allStrategies = new Set<OptimizationStrategy>();
    columnAnalyses.forEach(analysis => {
      analysis.recommendedStrategies.forEach(strategy => allStrategies.add(strategy));
    });

    // Add column reordering if beneficial
    if (this.options.strategies.includes('column-reorder') && columnNames.length > 1) {
      const reorderBeneficial = this.columnReorderer.shouldReorder(data, columnNames);
      if (reorderBeneficial) {
        allStrategies.add('column-reorder');
      }
    }

    // BUG-NEW-009 FIX: Guard against division by zero when columnAnalyses is empty
    // This can happen when data contains empty objects: [{}, {}, {}]
    const avgSavings = columnAnalyses.length > 0
      ? columnAnalyses.reduce((sum, a) => sum + a.estimatedSavings, 0) / columnAnalyses.length
      : 0;

    // Generate warnings
    const warnings: string[] = [];

    // Warn if no strategies recommended
    if (allStrategies.size === 0) {
      warnings.push('No optimization strategies recommended - data may already be optimal');
    }

    // Warn about conflicting strategies
    if (allStrategies.has('delta') && allStrategies.has('rle')) {
      warnings.push('Both delta and RLE recommended - they may conflict on same columns');
    }

    return {
      recommendedStrategies: Array.from(allStrategies),
      estimatedSavings: Math.round(avgSavings),
      appliedOptimizations: columnAnalyses.map(a =>
        `${a.columnName}: ${a.recommendedStrategies.join(', ') || 'none'} (${a.estimatedSavings}%)`
      ),
      warnings
    };
  }

  /**
   * Apply recommended optimizations to a dataset
   *
   * @param data - Array of row objects
   * @param columns - Column names
   * @returns Optimized data and directives
   */
  optimize(data: any[], columns?: string[]): {
    optimizedData: any[];
    directives: string[];
    analysis: OptimizationAnalysis;
  } {
    const analysis = this.analyzeDataset(data, columns);
    const columnNames = columns || Object.keys(data[0] || {});
    const directives: string[] = [];
    let optimizedData = [...data];

    // Apply column reordering first (affects all subsequent operations)
    if (analysis.recommendedStrategies.includes('column-reorder')) {
      const reorderResult = this.columnReorderer.reorderColumns(optimizedData, columnNames);
      directives.push(this.columnReorderer.generateMappingDirective(reorderResult.mapping));

      // Reorder data
      optimizedData = optimizedData.map(row => {
        const reorderedRow: any = {};
        reorderResult.reorderedColumns.forEach(col => {
          reorderedRow[col] = row[col];
        });
        return reorderedRow;
      });
    }

    // Apply column-specific optimizations
    for (const columnName of columnNames) {
      const values = optimizedData.map(row => row[columnName]);
      const columnAnalysis = this.analyzeColumn(values, columnName);

      // Apply dictionary encoding
      if (columnAnalysis.recommendedStrategies.includes('dictionary')) {
        const dict = this.dictBuilder.buildDictionary(values, columnName);
        if (dict) {
          directives.push(this.dictBuilder.generateDictionaryDirective(dict));
          const encoded = this.dictBuilder.encodeWithDictionary(values, dict);
          optimizedData.forEach((row, i) => {
            row[columnName] = encoded[i];
          });
        }
      }

      // Apply delta encoding (for numeric columns)
      if (columnAnalysis.recommendedStrategies.includes('delta')) {
        directives.push(this.deltaEncoder.generateDirective(columnName));
        const numericValues = values.filter(v => typeof v === 'number') as number[];
        if (numericValues.length > 0) {
          const encoded = this.deltaEncoder.encode(numericValues);
          let encIndex = 0;
          optimizedData.forEach((row, i) => {
            if (typeof values[i] === 'number') {
              row[columnName] = encoded[encIndex++];
            }
          });
        }
      }

      // Apply RLE encoding
      if (columnAnalysis.recommendedStrategies.includes('rle')) {
        directives.push(this.rleEncoder.generateDirective(columnName));
        const encoded = this.rleEncoder.encode(values);

        // RLE changes array structure (N values → M runs where M ≤ N)
        // We need to store the RLE representation in a special way
        // Strategy: Store RLE-encoded data as a single array in first row,
        // and mark other rows with a special sentinel value
        if (encoded.length > 0) {
          // Store encoded array in metadata or first row
          optimizedData[0][`__rle_${columnName}`] = encoded;

          // Remove original column to avoid duplication
          optimizedData.forEach(row => {
            delete row[columnName];
          });
        }
      }

      // Apply quantization (for numeric columns)
      if (columnAnalysis.recommendedStrategies.includes('quantize')) {
        const numericValues = values.filter(v => typeof v === 'number') as number[];
        if (numericValues.length > 0) {
          const precisionAnalysis = this.quantizer.analyzePrecision(numericValues);
          directives.push(
            this.quantizer.generatePrecisionDirective(columnName, precisionAnalysis.suggestedPrecision)
          );
          this.quantizer.setPrecision(columnName, precisionAnalysis.suggestedPrecision);
          const quantized = this.quantizer.quantizeColumn(numericValues, columnName);
          let quantIndex = 0;
          optimizedData.forEach((row, i) => {
            if (typeof values[i] === 'number') {
              row[columnName] = quantized[quantIndex++];
            }
          });
        }
      }
    }

    return {
      optimizedData,
      directives,
      analysis
    };
  }

  /**
   * Detect data type of a column
   *
   * @param values - Column values
   * @returns Detected type
   */
  private detectDataType(values: any[]): 'string' | 'number' | 'boolean' | 'mixed' {
    const types = new Set(
      values
        .filter(v => v !== null && v !== undefined)
        .map(v => typeof v)
    );

    if (types.size === 0) return 'string';
    if (types.size === 1) {
      const type = Array.from(types)[0];
      if (type === 'number') return 'number';
      if (type === 'boolean') return 'boolean';
      if (type === 'string') return 'string';
    }

    return 'mixed';
  }

  /**
   * Get enabled strategies
   *
   * @returns Array of enabled strategy names
   */
  getEnabledStrategies(): OptimizationStrategy[] {
    return this.options.strategies;
  }

  /**
   * Enable a strategy
   *
   * @param strategy - Strategy to enable
   */
  enableStrategy(strategy: OptimizationStrategy): void {
    if (!this.options.strategies.includes(strategy)) {
      this.options.strategies.push(strategy);
    }
  }

  /**
   * Disable a strategy
   *
   * @param strategy - Strategy to disable
   */
  disableStrategy(strategy: OptimizationStrategy): void {
    this.options.strategies = this.options.strategies.filter(s => s !== strategy);
  }

  /**
   * Reset to default strategies
   */
  resetStrategies(): void {
    this.options.strategies = [...DEFAULT_ADAPTIVE_OPTIONS.strategies];
  }
}
