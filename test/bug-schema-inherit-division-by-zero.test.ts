/**
 * BUG-NEW-010 & BUG-NEW-011 TEST
 * Test fixes for division by zero bugs in schema inheritance module
 *
 * BUG-NEW-010: schema-inherit.ts:216 - Division by zero when totalColumns = 0
 * BUG-NEW-011: schema-inherit.ts:447 - Division by zero when union.size = 0
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { SchemaInheritance } from '../dist/optimization/schema-inherit.js';

describe('BUG-NEW-010: Schema inheritance division by zero (totalColumns = 0)', () => {
  test('should handle empty objects without division by zero in compareSchemas', () => {
    const inheritance = new SchemaInheritance({ enabled: true });

    // Both data arrays contain only empty objects
    const data1 = [{}];
    const data2 = [{}];

    // This should not throw and should handle the edge case gracefully
    const result = inheritance.analyzeSimilarity(data1, data2);

    // Verify no NaN or Infinity values
    assert(Number.isFinite(result.similarity), 'Similarity should be finite');
    assert(!Number.isNaN(result.similarity), 'Similarity should not be NaN');
    assert.strictEqual(result.similarity, 0, 'Similarity should be 0 for empty objects');
    assert.strictEqual(result.commonColumns.length, 0, 'Should have no common columns');
    assert.strictEqual(result.uniqueColumns.length, 0, 'Should have no unique columns');
    assert.strictEqual(result.recommended, false, 'Should not recommend schema for empty objects');
  });

  test('should handle one empty and one non-empty object', () => {
    const inheritance = new SchemaInheritance({ enabled: true });

    const data1 = [{}];
    const data2 = [{ name: 'test', age: 25 }];

    const result = inheritance.analyzeSimilarity(data1, data2);

    assert(Number.isFinite(result.similarity), 'Similarity should be finite');
    assert(!Number.isNaN(result.similarity), 'Similarity should not be NaN');
    assert.strictEqual(result.similarity, 0, 'Similarity should be 0 when one is empty');
    assert.strictEqual(result.commonColumns.length, 0, 'Should have no common columns');
    assert.strictEqual(result.uniqueColumns.length, 2, 'Should have 2 unique columns from data2');
  });

  test('should still work correctly with normal objects', () => {
    const inheritance = new SchemaInheritance({ enabled: true });

    const data1 = [{ name: 'Alice', age: 30 }];
    const data2 = [{ name: 'Bob', age: 25, email: 'bob@example.com' }];

    const result = inheritance.analyzeSimilarity(data1, data2);

    assert(Number.isFinite(result.similarity), 'Similarity should be finite');
    assert(!Number.isNaN(result.similarity), 'Similarity should not be NaN');
    assert(result.similarity > 0, 'Similarity should be greater than 0');
    assert(result.similarity < 1, 'Similarity should be less than 1');
    assert.strictEqual(result.commonColumns.length, 2, 'Should have 2 common columns (name, age)');
  });
});

describe('BUG-NEW-011: Find matching schema division by zero (union.size = 0)', () => {
  test('should handle empty data objects without division by zero in findMatchingSchema', () => {
    const inheritance = new SchemaInheritance({ enabled: true });

    // Create a schema from empty data
    const emptySchema = inheritance.inferSchema([], 'empty-schema');
    inheritance.schemas.set('empty-schema', emptySchema);

    // Try to find matching schema for empty data
    const data = [{}];
    const match = inheritance.findMatchingSchema(data);

    // Should not throw - empty objects have 0 columns so union.size = 0
    // The fix ensures we don't divide by zero
    assert(match === null || typeof match === 'string', 'Should return null or string without throwing');
  });

  test('should still work correctly with normal data', () => {
    const inheritance = new SchemaInheritance({ enabled: true });

    // Create a normal schema
    const normalData = [{ name: 'Alice', age: 30, email: 'alice@example.com' }];
    const schema = inheritance.inferSchema(normalData, 'user-schema');
    inheritance.schemas.set('user-schema', schema);

    // Find matching schema for similar data
    const testData = [{ name: 'Bob', age: 25, email: 'bob@example.com' }];
    const match = inheritance.findMatchingSchema(testData);

    // Should find the matching schema
    assert.strictEqual(match, 'user-schema', 'Should find matching schema');
  });
});
