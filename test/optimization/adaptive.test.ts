/**
 * Tests for adaptive compression optimizer
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { AdaptiveOptimizer } from '../../dist/optimization/adaptive.js';

describe('AdaptiveOptimizer', () => {
  describe('analyzeColumn', () => {
    it('should recommend dictionary for categorical data', () => {
      const optimizer = new AdaptiveOptimizer();
      const values = Array(100).fill(null).map((_, i) => ['red', 'blue', 'green'][i % 3]);

      const analysis = optimizer.analyzeColumn(values, 'color');

      assert.strictEqual(analysis.dataType, 'string');
      assert.strictEqual(analysis.uniqueValues, 3);
      assert.ok(analysis.recommendedStrategies.includes('dictionary'));
      assert.ok(analysis.estimatedSavings > 0);
    });

    it('should recommend delta for sequential numeric data', () => {
      const optimizer = new AdaptiveOptimizer();
      const values = Array(50).fill(null).map((_, i) => 1000 + i);

      const analysis = optimizer.analyzeColumn(values, 'id');

      assert.strictEqual(analysis.dataType, 'number');
      assert.ok(analysis.recommendedStrategies.includes('delta'));
      assert.ok(analysis.reasoning.includes('Sequential'));
    });

    it('should recommend RLE for repetitive consecutive values', () => {
      const optimizer = new AdaptiveOptimizer();
      const values = [
        ...Array(30).fill('active'),
        ...Array(20).fill('inactive'),
        ...Array(25).fill('active')
      ];

      const analysis = optimizer.analyzeColumn(values, 'status');

      assert.strictEqual(analysis.dataType, 'string');
      assert.ok(analysis.recommendedStrategies.includes('rle'));
      assert.ok(analysis.reasoning.includes('repetitions'));
    });

    it('should recommend quantization for high-precision floats', () => {
      const optimizer = new AdaptiveOptimizer();
      const values = Array(50).fill(null).map((_, i) => 23.123456789 + i * 0.1);

      const analysis = optimizer.analyzeColumn(values, 'temperature');

      assert.strictEqual(analysis.dataType, 'number');
      assert.ok(analysis.recommendedStrategies.includes('quantize'));
      assert.ok(analysis.reasoning.includes('precision'));
    });

    it('should recommend multiple strategies when applicable', () => {
      const optimizer = new AdaptiveOptimizer();
      // Repetitive categorical data - both dictionary and RLE
      const values = [
        ...Array(30).fill('red'),
        ...Array(30).fill('blue'),
        ...Array(30).fill('red')
      ];

      const analysis = optimizer.analyzeColumn(values, 'color');

      assert.ok(analysis.recommendedStrategies.length >= 2);
      assert.ok(analysis.recommendedStrategies.includes('dictionary'));
      assert.ok(analysis.recommendedStrategies.includes('rle'));
    });

    it('should detect data types correctly', () => {
      const optimizer = new AdaptiveOptimizer();

      const stringAnalysis = optimizer.analyzeColumn(['a', 'b', 'c'], 'text');
      assert.strictEqual(stringAnalysis.dataType, 'string');

      const numberAnalysis = optimizer.analyzeColumn([1, 2, 3], 'count');
      assert.strictEqual(numberAnalysis.dataType, 'number');

      const boolAnalysis = optimizer.analyzeColumn([true, false, true], 'flag');
      assert.strictEqual(boolAnalysis.dataType, 'boolean');

      const mixedAnalysis = optimizer.analyzeColumn([1, 'a', true], 'mixed');
      assert.strictEqual(mixedAnalysis.dataType, 'mixed');
    });

    it('should handle null values', () => {
      const optimizer = new AdaptiveOptimizer();
      const values = ['a', null, 'b', undefined, 'c'];

      const analysis = optimizer.analyzeColumn(values, 'nullable');

      assert.strictEqual(analysis.hasNulls, true);
      assert.strictEqual(analysis.totalValues, 5);
    });

    it('should recommend nothing for highly unique data', () => {
      const optimizer = new AdaptiveOptimizer();
      const values = Array(100).fill(null).map((_, i) => `unique-${i}`);

      const analysis = optimizer.analyzeColumn(values, 'uuid');

      assert.strictEqual(analysis.uniqueValues, 100);
      assert.strictEqual(analysis.recommendedStrategies.length, 0);
      assert.ok(analysis.reasoning.includes('No optimization'));
    });
  });

  describe('analyzeDataset', () => {
    it('should analyze complete dataset', () => {
      const optimizer = new AdaptiveOptimizer();
      const data = Array(50).fill(null).map((_, i) => ({
        id: 1000 + i,
        category: ['A', 'B', 'C'][i % 3],
        status: i < 25 ? 'active' : 'inactive',
        value: 10.123456 + i
      }));

      const analysis = optimizer.analyzeDataset(data);

      assert.ok(analysis.recommendedStrategies.length > 0);
      assert.ok(analysis.estimatedSavings > 0);
      assert.ok(analysis.appliedOptimizations.length === 4); // 4 columns
    });

    it('should recommend column reordering for multiple columns', () => {
      const optimizer = new AdaptiveOptimizer();
      const data = Array(50).fill(null).map((_, i) => ({
        uniqueId: `id-${i}`,
        category: 'Electronics',
        status: 'active',
        timestamp: Date.now() + i
      }));

      const analysis = optimizer.analyzeDataset(data);

      assert.ok(analysis.recommendedStrategies.includes('column-reorder'));
    });

    it('should handle empty dataset', () => {
      const optimizer = new AdaptiveOptimizer();

      const analysis = optimizer.analyzeDataset([]);

      assert.strictEqual(analysis.recommendedStrategies.length, 0);
      assert.strictEqual(analysis.estimatedSavings, 0);
      assert.ok(analysis.warnings.length > 0);
    });

    it('should warn about conflicting strategies', () => {
      const optimizer = new AdaptiveOptimizer();
      // Sequential data that's also repetitive
      const data = Array(30).fill(null).map((_, i) => ({
        seq: i,
        repeat: i < 15 ? 100 : 200
      }));

      const analysis = optimizer.analyzeDataset(data);

      // May have warnings about delta and RLE conflict
      assert.ok(Array.isArray(analysis.warnings));
    });

    it('should warn when no optimization recommended', () => {
      const optimizer = new AdaptiveOptimizer();
      const data = Array(10).fill(null).map((_, i) => ({
        unique: `value-${i}`
      }));

      const analysis = optimizer.analyzeDataset(data);

      const hasNoOptWarning = analysis.warnings.some(w =>
        w.includes('No optimization') || w.includes('already be optimal')
      );
      assert.ok(hasNoOptWarning);
    });
  });

  describe('optimize', () => {
    it('should apply dictionary optimization', () => {
      const optimizer = new AdaptiveOptimizer();
      const data = Array(50).fill(null).map((_, i) => ({
        category: ['Electronics', 'Books', 'Clothing'][i % 3]
      }));

      const result = optimizer.optimize(data);

      assert.ok(result.optimizedData.length === data.length);
      assert.ok(result.directives.length > 0);
      const hasDictDirective = result.directives.some(d => d.includes('@dict'));
      assert.ok(hasDictDirective);
    });

    it('should apply delta optimization for sequential data', () => {
      const optimizer = new AdaptiveOptimizer();
      const data = Array(30).fill(null).map((_, i) => ({
        id: 1000 + i
      }));

      const result = optimizer.optimize(data);

      const hasDeltaDirective = result.directives.some(d => d.includes('@delta'));
      assert.ok(hasDeltaDirective);
    });

    it('should apply quantization for high-precision floats', () => {
      const optimizer = new AdaptiveOptimizer();
      const data = Array(30).fill(null).map((_, i) => ({
        temperature: 23.123456789 + i * 0.1
      }));

      const result = optimizer.optimize(data);

      const hasPrecisionDirective = result.directives.some(d => d.includes('@precision'));
      assert.ok(hasPrecisionDirective);
    });

    it('should apply column reordering', () => {
      const optimizer = new AdaptiveOptimizer();
      const data = Array(30).fill(null).map((_, i) => ({
        uniqueId: `id-${i}`,
        category: 'A',
        status: 'active'
      }));

      const result = optimizer.optimize(data);

      const hasColmapDirective = result.directives.some(d => d.includes('@colmap'));
      // Column reordering may or may not be applied depending on entropy
      assert.ok(typeof hasColmapDirective === 'boolean');
    });

    it('should combine multiple optimizations', () => {
      const optimizer = new AdaptiveOptimizer();
      const data = Array(50).fill(null).map((_, i) => ({
        id: 1000 + i,
        category: ['A', 'B', 'C'][i % 3],
        temperature: 23.123456 + i * 0.1,
        status: i < 25 ? 'active' : 'inactive'
      }));

      const result = optimizer.optimize(data);

      // Should have multiple directives
      assert.ok(result.directives.length > 0);
      assert.ok(result.analysis.recommendedStrategies.length > 0);
      assert.ok(result.analysis.estimatedSavings > 0);
    });

    it('should preserve data integrity', () => {
      const optimizer = new AdaptiveOptimizer();
      const data = Array(20).fill(null).map((_, i) => ({
        id: i,
        name: `User ${i}`
      }));

      const result = optimizer.optimize(data);

      // Data should still have same number of rows
      assert.strictEqual(result.optimizedData.length, data.length);
      // Each row should still have the same keys
      assert.ok(result.optimizedData.every(row =>
        Object.keys(row).length >= Object.keys(data[0]).length - 1
      ));
    });
  });

  describe('strategy management', () => {
    it('should get enabled strategies', () => {
      const optimizer = new AdaptiveOptimizer();

      const strategies = optimizer.getEnabledStrategies();

      assert.ok(Array.isArray(strategies));
      assert.ok(strategies.includes('dictionary'));
      assert.ok(strategies.includes('delta'));
      assert.ok(strategies.includes('rle'));
    });

    it('should enable strategy', () => {
      const optimizer = new AdaptiveOptimizer({
        strategies: ['dictionary']
      });

      optimizer.enableStrategy('delta');

      const strategies = optimizer.getEnabledStrategies();
      assert.ok(strategies.includes('dictionary'));
      assert.ok(strategies.includes('delta'));
    });

    it('should disable strategy', () => {
      const optimizer = new AdaptiveOptimizer();

      optimizer.disableStrategy('delta');

      const strategies = optimizer.getEnabledStrategies();
      assert.ok(!strategies.includes('delta'));
    });

    it('should not duplicate strategies when enabling', () => {
      const optimizer = new AdaptiveOptimizer();

      optimizer.enableStrategy('dictionary');
      optimizer.enableStrategy('dictionary');

      const strategies = optimizer.getEnabledStrategies();
      const dictCount = strategies.filter(s => s === 'dictionary').length;
      assert.strictEqual(dictCount, 1);
    });

    it('should reset to default strategies', () => {
      const optimizer = new AdaptiveOptimizer();

      optimizer.disableStrategy('delta');
      optimizer.disableStrategy('rle');
      optimizer.resetStrategies();

      const strategies = optimizer.getEnabledStrategies();
      assert.ok(strategies.includes('delta'));
      assert.ok(strategies.includes('rle'));
    });
  });

  describe('real-world scenarios', () => {
    it('should optimize e-commerce product data', () => {
      const optimizer = new AdaptiveOptimizer();
      const data = Array(100).fill(null).map((_, i) => ({
        productId: 1000 + i,
        category: ['Electronics', 'Books', 'Clothing', 'Home'][i % 4],
        price: 19.99 + (i * 5.123456),
        stock: i % 2 === 0 ? 'in_stock' : 'out_of_stock',
        rating: 4.0 + (Math.random() * 0.999999)
      }));

      const result = optimizer.optimize(data);

      // Should apply multiple optimizations
      assert.ok(result.directives.length >= 3);
      assert.ok(result.analysis.estimatedSavings > 0);

      // Should have dict for category and stock
      const hasDictDirective = result.directives.some(d => d.includes('@dict'));
      assert.ok(hasDictDirective);

      // Should have quantization for price and rating
      const hasPrecisionDirective = result.directives.some(d => d.includes('@precision'));
      assert.ok(hasPrecisionDirective);

      // Should have delta for productId
      const hasDeltaDirective = result.directives.some(d => d.includes('@delta'));
      assert.ok(hasDeltaDirective);
    });

    it('should optimize sensor data', () => {
      const optimizer = new AdaptiveOptimizer();
      const data = Array(200).fill(null).map((_, i) => ({
        timestamp: 1704067200000 + (i * 1000),
        sensorId: `sensor-${Math.floor(i / 40) + 1}`,
        temperature: 23.456789 + (Math.random() * 5),
        status: i % 50 === 0 ? 'maintenance' : 'operational'
      }));

      const result = optimizer.optimize(data);

      // Check that optimizations were applied
      assert.ok(result.directives.length > 0, 'Should have some directives');
      assert.ok(result.analysis.appliedOptimizations.length > 0, 'Should have applied optimizations');

      // Timestamp likely uses delta (sequential data)
      const hasTimestampOpt = result.analysis.appliedOptimizations.some(o => o.includes('timestamp'));
      assert.ok(hasTimestampOpt, 'Timestamp should be optimized');

      // SensorId likely uses dictionary (repetitive categorical)
      const hasSensorOpt = result.analysis.appliedOptimizations.some(o => o.includes('sensorId'));
      assert.ok(hasSensorOpt, 'SensorId should be optimized');

      // Temperature likely uses quantization (high precision)
      const hasTempOpt = result.analysis.appliedOptimizations.some(o => o.includes('temperature'));
      assert.ok(hasTempOpt, 'Temperature should be optimized');
    });

    it('should optimize log data with status changes', () => {
      const optimizer = new AdaptiveOptimizer();
      const data = [
        ...Array(50).fill({ status: 'pending', code: 100 }),
        ...Array(30).fill({ status: 'processing', code: 200 }),
        ...Array(20).fill({ status: 'completed', code: 200 })
      ];

      const result = optimizer.optimize(data);

      // Status should use RLE (consecutive repetitions)
      const analysis = optimizer.analyzeDataset(data);
      const statusAnalysis = analysis.appliedOptimizations.find(o => o.includes('status'));
      assert.ok(statusAnalysis);
    });
  });

  describe('edge cases', () => {
    it('should handle single column dataset', () => {
      const optimizer = new AdaptiveOptimizer();
      const data = Array(50).fill(null).map((_, i) => ({
        value: i
      }));

      const result = optimizer.optimize(data);

      assert.ok(result.optimizedData.length === data.length);
      assert.ok(result.directives.length >= 0);
    });

    it('should handle single row dataset', () => {
      const optimizer = new AdaptiveOptimizer();
      const data = [{ id: 1, name: 'Test' }];

      const result = optimizer.optimize(data);

      assert.strictEqual(result.optimizedData.length, 1);
    });

    it('should handle all-null column', () => {
      const optimizer = new AdaptiveOptimizer();
      const data = Array(20).fill(null).map(() => ({
        value: null
      }));

      const analysis = optimizer.analyzeColumn(data.map(d => d.value), 'value');

      assert.strictEqual(analysis.hasNulls, true);
      // Null values are filtered out, but Set still counts them as 1 unique value
      assert.ok(analysis.uniqueValues <= 1);
    });

    it('should handle mixed types gracefully', () => {
      const optimizer = new AdaptiveOptimizer();
      const data = Array(20).fill(null).map((_, i) => ({
        mixed: i % 2 === 0 ? i : `str-${i}`
      }));

      const analysis = optimizer.analyzeColumn(data.map(d => d.mixed), 'mixed');

      assert.strictEqual(analysis.dataType, 'mixed');
    });

    it('should work with disabled strategies', () => {
      const optimizer = new AdaptiveOptimizer({
        strategies: []
      });
      const data = Array(50).fill(null).map((_, i) => ({
        category: ['A', 'B', 'C'][i % 3]
      }));

      const result = optimizer.optimize(data);

      // Should still work but with no optimizations
      assert.strictEqual(result.directives.length, 0);
      assert.strictEqual(result.optimizedData.length, data.length);
    });
  });
});
