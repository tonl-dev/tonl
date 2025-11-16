/**
 * Test for BUG-NEW-009: Division by zero in adaptive optimization
 *
 * Bug: src/optimization/adaptive.ts:222
 * When analyzing datasets with empty objects (e.g., [{}, {}, {}]),
 * columnAnalyses array is empty, causing division by zero
 *
 * Impact: Returns NaN for avgSavings, breaking downstream calculations
 * Fix: Add guard to check columnAnalyses.length > 0 before division
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AdaptiveOptimizer } from '../dist/optimization/adaptive.js';

describe('BUG-NEW-009: Division by zero in adaptive optimization', () => {
  test('should handle empty objects without division by zero', () => {
    const compressor = new AdaptiveOptimizer({
      enabled: true,
      strategies: ['dictionary', 'delta', 'rle', 'column-reorder']
    });

    // Dataset with empty objects - no columns to analyze
    const emptyData = [{}, {}, {}];
    const analysis = compressor.analyzeDataset(emptyData);

    // Should not return NaN
    assert(Number.isFinite(analysis.estimatedSavings), 'estimatedSavings should be finite');
    assert(!Number.isNaN(analysis.estimatedSavings), 'estimatedSavings should not be NaN');

    // Should be 0 for empty objects
    assert.strictEqual(analysis.estimatedSavings, 0, 'Should return 0 for empty objects');
  });

  test('should handle mixed empty and non-empty objects', () => {
    const compressor = new AdaptiveOptimizer({
      enabled: true,
      strategies: ['dictionary', 'delta', 'rle']
    });

    // Some objects have properties, some don't
    const mixedData = [
      { name: 'Alice', age: 30 },
      {},
      { name: 'Bob', age: 25 },
      {}
    ];

    const analysis = compressor.analyzeDataset(mixedData);

    // Should handle gracefully without NaN
    assert(Number.isFinite(analysis.estimatedSavings), 'estimatedSavings should be finite');
    assert(!Number.isNaN(analysis.estimatedSavings), 'estimatedSavings should not be NaN');
  });

  test('should return 0 savings for single empty object', () => {
    const compressor = new AdaptiveOptimizer({
      enabled: true,
      strategies: ['dictionary']
    });

    const singleEmpty = [{}];
    const analysis = compressor.analyzeDataset(singleEmpty);

    assert.strictEqual(analysis.estimatedSavings, 0, 'Single empty object should have 0 savings');
    assert(Array.isArray(analysis.recommendedStrategies), 'Should return strategies array');
  });

  test('should handle empty array gracefully', () => {
    const compressor = new AdaptiveOptimizer({
      enabled: true,
      strategies: ['dictionary', 'delta']
    });

    const emptyArray: any[] = [];
    const analysis = compressor.analyzeDataset(emptyArray);

    // Should return early with 0 savings
    assert.strictEqual(analysis.estimatedSavings, 0, 'Empty array should have 0 savings');
    assert(analysis.warnings.length > 0, 'Should have warning about no data');
  });

  test('should calculate avgSavings correctly for normal data', () => {
    const compressor = new AdaptiveOptimizer({
      enabled: true,
      strategies: ['dictionary', 'delta', 'rle']
    });

    const normalData = [
      { category: 'A', value: 10 },
      { category: 'A', value: 11 },
      { category: 'B', value: 12 },
      { category: 'A', value: 13 }
    ];

    const analysis = compressor.analyzeDataset(normalData);

    // Should calculate valid savings
    assert(Number.isFinite(analysis.estimatedSavings), 'estimatedSavings should be finite');
    assert(!Number.isNaN(analysis.estimatedSavings), 'estimatedSavings should not be NaN');
    assert(analysis.estimatedSavings >= 0, 'Savings should be non-negative');
  });

  test('should handle objects with only undefined/null values', () => {
    const compressor = new AdaptiveOptimizer({
      enabled: true,
      strategies: ['dictionary']
    });

    const nullData = [
      { a: null, b: undefined },
      { a: null, b: undefined },
      { a: null, b: undefined }
    ];

    const analysis = compressor.analyzeDataset(nullData);

    assert(Number.isFinite(analysis.estimatedSavings), 'Should handle null/undefined values');
    assert(!Number.isNaN(analysis.estimatedSavings), 'Should not return NaN');
  });

  test('edge case: explicitly pass empty columns array', () => {
    const compressor = new AdaptiveOptimizer({
      enabled: true,
      strategies: ['dictionary', 'delta']
    });

    const data = [{ a: 1, b: 2 }, { a: 3, b: 4 }];
    const emptyColumns: string[] = [];

    // Explicitly pass empty columns - should handle gracefully
    const analysis = compressor.analyzeDataset(data, emptyColumns);

    assert(Number.isFinite(analysis.estimatedSavings), 'Should handle empty columns array');
    assert(!Number.isNaN(analysis.estimatedSavings), 'Should not return NaN');
    assert.strictEqual(analysis.estimatedSavings, 0, 'Should return 0 for no columns');
  });
});
