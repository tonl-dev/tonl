/**
 * BUG-006: Slice Processing Off-by-One Error Test
 *
 * Severity: HIGH
 *
 * Description: Off-by-one error in reverse slice processing could cause
 * missing elements or infinite loops in certain slice operations.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { TONLDocument } from '../dist/document.js';

describe('BUG-006: Slice Processing Off-by-One Error', () => {
  test('should handle reverse slices correctly with negative step', () => {
    const doc = TONLDocument.fromJSON([1, 2, 3, 4, 5]);

    // Test reverse slice [::-1] - should reverse entire array
    const result1 = doc.query('$[::-1]');
    assert.deepStrictEqual(result1, [5, 4, 3, 2, 1],
      'Reverse slice with step -1 should reverse entire array');
  });

  test('should handle reverse slices with start boundary', () => {
    const doc = TONLDocument.fromJSON([1, 2, 3, 4, 5]);

    // Test reverse slice [3::-1] - should get elements from index 3 to start
    const result1 = doc.query('$[3::-1]');
    assert.deepStrictEqual(result1, [4, 3, 2, 1],
      'Reverse slice [3::-1] should include index 3');

    // Test reverse slice [2::-1] - should get elements from index 2 to start
    const result2 = doc.query('$[2::-1]');
    assert.deepStrictEqual(result2, [3, 2, 1],
      'Reverse slice [2::-1] should include index 2');
  });

  test('should handle reverse slices with start and end boundaries', () => {
    const doc = TONLDocument.fromJSON([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Test reverse slice [7:3:-1] - should get elements from index 7 down to 4 (stop when index > 3)
    const result1 = doc.query('$[7:3:-1]');
    assert.deepStrictEqual(result1, [8, 7, 6, 5],
      'Reverse slice [7:3:-1] should include 8,7,6,5 (indices 7,6,5,4)');

    // Test reverse slice [6:1:-2] - should get every other element from index 6 down to 2
    const result2 = doc.query('$[6:1:-2]');
    assert.deepStrictEqual(result2, [7, 5, 3],
      'Reverse slice [6:1:-2] should include 7,5,3');
  });

  test('should handle edge cases with out-of-bounds indices', () => {
    const doc = TONLDocument.fromJSON([1, 2, 3, 4, 5]);

    // Test reverse slice with start beyond array length
    const result1 = doc.query('$[10::-1]');
    assert.deepStrictEqual(result1, [5, 4, 3, 2, 1],
      'Reverse slice with start beyond length should start from last element');

    // Test reverse slice with negative start
    const result2 = doc.query('$[-1::-1]');
    assert.deepStrictEqual(result2, [5, 4, 3, 2, 1],
      'Reverse slice with negative start should work correctly');

    // Test reverse slice with very negative start
    const result3 = doc.query('$[-10::-1]');
    assert.deepStrictEqual(result3, [5, 4, 3, 2, 1],
      'Reverse slice with very negative start should start from last element');
  });

  test('should handle single element arrays', () => {
    const doc = TONLDocument.fromJSON([42]);

    // Test reverse slice on single element
    const result1 = doc.query('$[::-1]');
    assert.deepStrictEqual(result1, [42],
      'Reverse slice of single element should return that element');

    // Test reverse slice with specific index
    const result2 = doc.query('$[0::-1]');
    assert.deepStrictEqual(result2, [42],
      'Reverse slice [0::-1] of single element should return that element');
  });

  test('should handle empty arrays correctly', () => {
    const doc = TONLDocument.fromJSON([]);

    // Test reverse slice on empty array
    const result1 = doc.query('$[::-1]');
    assert.deepStrictEqual(result1, [],
      'Reverse slice of empty array should return empty array');
  });

  test('should prevent infinite loops with boundary conditions', () => {
    const doc = TONLDocument.fromJSON([1, 2, 3, 4, 5]);

    // These should not cause infinite loops
    const result1 = doc.query('$[-1:-2:-1]');
    assert.deepStrictEqual(result1, [5, 4, 3, 2, 1],
      'Reverse slice [-1:-2:-1] should return full reverse array (indices 4,3,2,1,0)');

    const result2 = doc.query('$[0:-1:-1]');
    assert.deepStrictEqual(result2, [1],
      'Reverse slice [0:-1:-1] should return first element');
  });

  test('should handle complex nested object queries with slices', () => {
    const doc = TONLDocument.fromJSON({
      data: [
        { id: 1, values: [10, 20, 30, 40, 50] },
        { id: 2, values: [100, 200, 300, 400, 500] }
      ]
    });

    // Test reverse slice on nested array
    const result1 = doc.query('$.data[0].values[::-1]');
    assert.deepStrictEqual(result1, [50, 40, 30, 20, 10],
      'Reverse slice on nested array should work correctly');

    // Test reverse slice with filtering
    const result2 = doc.query('$.data[0].values[3::-1]');
    assert.deepStrictEqual(result2, [40, 30, 20, 10],
      'Reverse slice [3::-1] on nested array should work correctly');
  });

  test('should handle step sizes greater than 1', () => {
    const doc = TONLDocument.fromJSON([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Test reverse slice with step -2
    const result1 = doc.query('$[::-2]');
    assert.deepStrictEqual(result1, [10, 8, 6, 4, 2],
      'Reverse slice with step -2 should get every other element');

    // Test reverse slice with step -3
    const result2 = doc.query('$[::-3]');
    assert.deepStrictEqual(result2, [10, 7, 4, 1],
      'Reverse slice with step -3 should get every third element');

    // Test reverse slice [8:1:-3]
    const result3 = doc.query('$[8:1:-3]');
    assert.deepStrictEqual(result3, [9, 6, 3],
      'Reverse slice [8:1:-3] should get 9,6,3');
  });

  test('should handle boundary conditions with string arrays', () => {
    const doc = TONLDocument.fromJSON(['a', 'b', 'c', 'd', 'e']);

    // Test reverse slice on string array
    const result1 = doc.query('$[::-1]');
    assert.deepStrictEqual(result1, ['e', 'd', 'c', 'b', 'a'],
      'Reverse slice on string array should work correctly');

    // Test reverse slice [3::-1] on string array
    const result2 = doc.query('$[3::-1]');
    assert.deepStrictEqual(result2, ['d', 'c', 'b', 'a'],
      'Reverse slice [3::-1] on string array should work correctly');
  });
});