/**
 * Phase 1 Integration Tests
 *
 * Tests all three Phase 1 optimization features working together:
 * - Dictionary Encoding
 * - Column Reordering
 * - Numeric Quantization
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import {
  DictionaryBuilder,
  DictionaryDecoder,
  ColumnReorderer,
  NumericQuantizer
} from '../../dist/optimization/index.js';

describe('Phase 1 Integration', () => {
  describe('All Three Features Combined', () => {
    it('should optimize a complete dataset with all features', () => {
      // Create realistic e-commerce dataset
      const data = [
        { productId: 1, category: 'Electronics', status: 'active', price: 299.99, rating: 4.567 },
        { productId: 2, category: 'Electronics', status: 'active', price: 199.99, rating: 4.234 },
        { productId: 3, category: 'Books', status: 'active', price: 19.99, rating: 4.890 },
        { productId: 4, category: 'Electronics', status: 'inactive', price: 499.99, rating: 3.456 },
        { productId: 5, category: 'Clothing', status: 'active', price: 49.99, rating: 4.123 },
        { productId: 6, category: 'Books', status: 'active', price: 24.99, rating: 4.678 },
        { productId: 7, category: 'Clothing', status: 'active', price: 79.99, rating: 4.901 },
        { productId: 8, category: 'Electronics', status: 'active', price: 149.99, rating: 4.345 }
      ];

      const originalColumns = ['productId', 'category', 'status', 'price', 'rating'];

      // Step 1: Column Reordering (optimize for tokenizer)
      const reorderer = new ColumnReorderer();
      const reorderResult = reorderer.reorderColumns(data, originalColumns);

      // Should put low-entropy columns (status, category) first
      const statusIndex = reorderResult.reorderedColumns.indexOf('status');
      const categoryIndex = reorderResult.reorderedColumns.indexOf('category');
      const productIdIndex = reorderResult.reorderedColumns.indexOf('productId');

      // Low-entropy columns should be earlier
      assert.ok(statusIndex < productIdIndex);
      assert.ok(categoryIndex < productIdIndex);

      // Generate mapping directive
      const colmapDirective = reorderer.generateMappingDirective(reorderResult.mapping);
      assert.ok(colmapDirective.startsWith('@colmap'));

      // Step 2: Dictionary Encoding (compress repetitive values)
      const dictBuilder = new DictionaryBuilder({ minFrequency: 2, minSavings: 5 });

      // Build dictionaries for categorical columns
      const categoryValues = data.map(d => d.category);
      const statusValues = data.map(d => d.status);

      const categoryDict = dictBuilder.buildDictionary(categoryValues, 'category');
      const statusDict = dictBuilder.buildDictionary(statusValues, 'status');

      assert.ok(categoryDict, 'Category dictionary should be created');
      assert.ok(statusDict, 'Status dictionary should be created');

      // Generate dictionary directives
      const categoryDictDirective = dictBuilder.generateDictionaryDirective(categoryDict!);
      const statusDictDirective = dictBuilder.generateDictionaryDirective(statusDict!);

      assert.ok(categoryDictDirective.startsWith('@dict category:'));
      assert.ok(statusDictDirective.startsWith('@dict status:'));

      // Encode values
      const encodedCategories = dictBuilder.encodeWithDictionary(categoryValues, categoryDict!);
      const encodedStatuses = dictBuilder.encodeWithDictionary(statusValues, statusDict!);

      // Step 3: Numeric Quantization (reduce precision)
      const quantizer = new NumericQuantizer({ defaultPrecision: 2 });

      const prices = data.map(d => d.price);
      const ratings = data.map(d => d.rating);

      // Set column-specific precision
      quantizer.setPrecision('price', 2);  // $19.99 format
      quantizer.setPrecision('rating', 2); // 4.56 stars

      const quantizedPrices = quantizer.quantizeColumn(prices, 'price');
      const quantizedRatings = quantizer.quantizeColumn(ratings, 'rating');

      // Generate precision directives
      const pricePrecisionDirective = quantizer.generatePrecisionDirective('price', 2);
      const ratingPrecisionDirective = quantizer.generatePrecisionDirective('rating', 2);

      assert.strictEqual(pricePrecisionDirective, '@precision price=2');
      assert.strictEqual(ratingPrecisionDirective, '@precision rating=2');

      // Step 4: Verify Round-Trip Fidelity

      // Decode dictionaries
      const dictDecoder = new DictionaryDecoder();
      dictDecoder.parseDictionaryDirective(categoryDictDirective);
      dictDecoder.parseDictionaryDirective(statusDictDirective);

      const decodedCategories = encodedCategories.map(v =>
        dictDecoder.decode('category', v as string)
      );
      const decodedStatuses = encodedStatuses.map(v =>
        dictDecoder.decode('status', v as string)
      );

      // Verify dictionary encoding round-trip
      assert.deepStrictEqual(decodedCategories, categoryValues);
      assert.deepStrictEqual(decodedStatuses, statusValues);

      // Verify quantization is close to original (within precision)
      for (let i = 0; i < prices.length; i++) {
        assert.ok(Math.abs(quantizedPrices[i] - prices[i]) < 0.01);
        assert.ok(Math.abs(quantizedRatings[i] - ratings[i]) < 0.01);
      }

      // Restore original column order
      const restoredColumns = reorderer.restoreOriginalOrder(
        reorderResult.reorderedColumns,
        reorderResult.mapping
      );
      assert.deepStrictEqual(restoredColumns, originalColumns);
    });

    it('should estimate significant combined token savings', () => {
      // Large dataset for realistic savings
      const data = Array(100).fill(null).map((_, i) => ({
        id: i + 1,
        category: ['Electronics', 'Books', 'Clothing'][i % 3],
        status: 'active',
        price: 19.99 + (i * 3.12345678),
        rating: 4.0 + (Math.random() * 0.9999999)
      }));

      const columns = ['id', 'category', 'status', 'price', 'rating'];

      // 1. Column reordering savings
      const reorderer = new ColumnReorderer();
      const reorderResult = reorderer.reorderColumns(data, columns);
      const reorderSavings = reorderer.estimateSavings(
        reorderResult.entropies,
        columns,
        reorderResult.reorderedColumns
      );

      // 2. Dictionary encoding savings
      const dictBuilder = new DictionaryBuilder();
      const categoryValues = data.map(d => d.category);
      const statusValues = data.map(d => d.status);

      const categoryDict = dictBuilder.buildDictionary(categoryValues, 'category');
      const statusDict = dictBuilder.buildDictionary(statusValues, 'status');

      const dictSavings = (categoryDict?.totalSavings || 0) + (statusDict?.totalSavings || 0);

      // 3. Quantization savings
      const quantizer = new NumericQuantizer({ autoDetect: true });
      const prices = data.map(d => d.price);
      const ratings = data.map(d => d.rating);

      const priceAnalysis = quantizer.analyzePrecision(prices);
      const ratingAnalysis = quantizer.analyzePrecision(ratings);

      // Should have positive savings from each feature
      assert.ok(reorderSavings >= 0, 'Column reordering should provide savings');
      assert.ok(dictSavings > 0, 'Dictionary encoding should save bytes');
      assert.ok(priceAnalysis.tokenSavings > 0, 'Price quantization should save tokens');
      assert.ok(ratingAnalysis.tokenSavings > 0, 'Rating quantization should save tokens');

      // Combined savings should be substantial
      const totalTokenSavings = priceAnalysis.tokenSavings + ratingAnalysis.tokenSavings;
      assert.ok(totalTokenSavings > 0.1, 'Should save at least 10% tokens');
    });

    it('should handle all directives in a single TONL header', () => {
      const data = Array(20).fill(null).map((_, i) => ({
        role: ['admin', 'user', 'editor'][i % 3],
        status: i % 2 === 0 ? 'active' : 'inactive',
        score: 85.123456 + i
      }));

      const columns = ['role', 'status', 'score'];

      // Generate all directives
      const directives: string[] = [];

      // 1. Column mapping
      const reorderer = new ColumnReorderer();
      const reorderResult = reorderer.reorderColumns(data, columns);
      directives.push(reorderer.generateMappingDirective(reorderResult.mapping));

      // 2. Dictionaries
      const dictBuilder = new DictionaryBuilder({ minFrequency: 2 });
      const roleDict = dictBuilder.buildDictionary(data.map(d => d.role), 'role');
      const statusDict = dictBuilder.buildDictionary(data.map(d => d.status), 'status');

      if (roleDict) directives.push(dictBuilder.generateDictionaryDirective(roleDict));
      if (statusDict) directives.push(dictBuilder.generateDictionaryDirective(statusDict));

      // 3. Precision
      const quantizer = new NumericQuantizer();
      directives.push(quantizer.generatePrecisionDirective('score', 2));

      // Verify all directives are present
      const hasColmap = directives.some(d => d.startsWith('@colmap'));
      const hasDictRole = directives.some(d => d.startsWith('@dict role:'));
      const hasDictStatus = directives.some(d => d.startsWith('@dict status:'));
      const hasPrecision = directives.some(d => d.startsWith('@precision'));

      assert.ok(hasColmap, 'Should have column mapping directive');
      assert.ok(hasDictRole, 'Should have role dictionary directive');
      assert.ok(hasDictStatus, 'Should have status dictionary directive');
      assert.ok(hasPrecision, 'Should have precision directive');

      // Simulate TONL header
      const tonlHeader = directives.join('\n');
      assert.ok(tonlHeader.length > 0);
      assert.ok(tonlHeader.includes('@colmap'));
      assert.ok(tonlHeader.includes('@dict'));
      assert.ok(tonlHeader.includes('@precision'));
    });
  });

  describe('Real-World Scenarios', () => {
    it('should optimize sensor data with timestamps', () => {
      // Simulate IoT sensor data
      const sensorData = Array(50).fill(null).map((_, i) => ({
        sensorId: `sensor-${Math.floor(i / 10) + 1}`, // 5 sensors
        location: ['warehouse-A', 'warehouse-B'][i % 2],
        temperature: 23.123456789 + (Math.random() * 5),
        humidity: 65.987654321 + (Math.random() * 10),
        status: i % 20 === 0 ? 'maintenance' : 'operational'
      }));

      const columns = ['sensorId', 'location', 'temperature', 'humidity', 'status'];

      // Apply all optimizations
      const reorderer = new ColumnReorderer();
      const reorderResult = reorderer.reorderColumns(sensorData, columns);

      const dictBuilder = new DictionaryBuilder({ minFrequency: 3 });
      const sensorIdDict = dictBuilder.buildDictionary(
        sensorData.map(d => d.sensorId),
        'sensorId'
      );
      const locationDict = dictBuilder.buildDictionary(
        sensorData.map(d => d.location),
        'location'
      );
      const statusDict = dictBuilder.buildDictionary(
        sensorData.map(d => d.status),
        'status'
      );

      const quantizer = new NumericQuantizer();
      quantizer.setPrecision('temperature', 2);
      quantizer.setPrecision('humidity', 1);

      const quantizedTemp = quantizer.quantizeColumn(
        sensorData.map(d => d.temperature),
        'temperature'
      );
      const quantizedHumidity = quantizer.quantizeColumn(
        sensorData.map(d => d.humidity),
        'humidity'
      );

      // Verify optimizations were applied
      assert.ok(sensorIdDict, 'Should create sensor ID dictionary');
      assert.ok(locationDict, 'Should create location dictionary');
      assert.ok(statusDict, 'Should create status dictionary');

      // Verify quantization reduced precision
      const avgOriginalTemp = sensorData.reduce((sum, d) => sum + d.temperature.toString().length, 0) / sensorData.length;
      const avgQuantizedTemp = quantizedTemp.reduce((sum, v) => sum + v.toString().length, 0) / quantizedTemp.length;

      assert.ok(avgQuantizedTemp <= avgOriginalTemp, 'Quantized values should be shorter');
    });

    it('should optimize user activity log data', () => {
      // Simulate user activity logs
      const activities = Array(100).fill(null).map((_, i) => ({
        userId: `user-${Math.floor(i / 5) + 1}`, // 20 users
        action: ['login', 'logout', 'view', 'edit', 'delete'][i % 5],
        timestamp: 1704067200000 + (i * 1000),
        duration: 1.23456789 + (Math.random() * 10),
        success: i % 10 !== 0 // 90% success rate
      }));

      const columns = ['userId', 'action', 'timestamp', 'duration', 'success'];

      // Column reordering should put repetitive fields first
      const reorderer = new ColumnReorderer();
      const reorderResult = reorderer.reorderColumns(activities, columns);

      const successIndex = reorderResult.reorderedColumns.indexOf('success');
      const timestampIndex = reorderResult.reorderedColumns.indexOf('timestamp');

      // 'success' has lower entropy (mostly true) than 'timestamp' (all unique)
      assert.ok(successIndex < timestampIndex, 'Low-entropy success should come before high-entropy timestamp');

      // Dictionary encoding for categorical fields
      const dictBuilder = new DictionaryBuilder();
      const actionDict = dictBuilder.buildDictionary(
        activities.map(a => a.action),
        'action'
      );

      assert.ok(actionDict, 'Should create action dictionary');
      assert.ok(actionDict!.entries.size === 5, 'Should have 5 action types');

      // Quantization for duration
      const quantizer = new NumericQuantizer();
      const durations = activities.map(a => a.duration);
      const analysis = quantizer.analyzePrecision(durations);

      assert.ok(analysis.suggestedPrecision < 9, 'Should suggest fewer than 9 decimals');
      assert.ok(analysis.tokenSavings > 0, 'Should estimate token savings');
    });
  });

  describe('Edge Cases and Compatibility', () => {
    it('should handle dataset with no optimizable columns', () => {
      // All unique values, no optimization possible
      const data = Array(10).fill(null).map((_, i) => ({
        uniqueId: `id-${i}`,
        randomValue: Math.random() * 1000000
      }));

      const columns = ['uniqueId', 'randomValue'];

      // Dictionary should not be created (all unique)
      const dictBuilder = new DictionaryBuilder({ minFrequency: 3 });
      const idDict = dictBuilder.buildDictionary(data.map(d => d.uniqueId), 'uniqueId');

      assert.strictEqual(idDict, null, 'Should not create dictionary for unique values');

      // Column reordering might still work
      const reorderer = new ColumnReorderer();
      const reorderResult = reorderer.reorderColumns(data, columns);

      assert.ok(reorderResult.reorderedColumns.length === 2);

      // Quantization should still work
      const quantizer = new NumericQuantizer();
      const values = data.map(d => d.randomValue);
      const quantized = quantizer.quantizeColumn(values);

      assert.ok(quantized.length === values.length);
    });

    it('should handle mixed optimization applicability', () => {
      const data = Array(20).fill(null).map((_, i) => ({
        id: i,                      // Unique, no dict
        category: 'Electronics',    // Uniform, yes dict
        price: 99.99,               // Uniform, no quantization benefit
        rating: 4.123456789 + i     // Unique, yes quantization (high precision)
      }));

      const columns = ['id', 'category', 'price', 'rating'];

      const dictBuilder = new DictionaryBuilder({ minFrequency: 2 });
      const categoryDict = dictBuilder.buildDictionary(
        data.map(d => d.category),
        'category'
      );

      // Category should have dictionary (all same value)
      assert.ok(categoryDict, 'Uniform category should have dictionary');

      const quantizer = new NumericQuantizer({ preserveIntegers: true });

      // ID should not be quantized (integers)
      const idAnalysis = quantizer.analyzePrecision(data.map(d => d.id));
      assert.strictEqual(idAnalysis.hasDecimals, false);

      // Rating should be quantized (has 9 decimal places, will be reduced)
      const ratingAnalysis = quantizer.analyzePrecision(data.map(d => d.rating));
      assert.ok(ratingAnalysis.hasDecimals);
      assert.ok(ratingAnalysis.suggestedPrecision < 9, 'Should suggest fewer than 9 decimals');
      assert.ok(ratingAnalysis.tokenSavings > 0);
    });
  });
});
