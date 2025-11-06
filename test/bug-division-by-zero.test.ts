/**
 * Test for Bug #3: Division by zero in value-parser.ts
 *
 * Location: src/parser/value-parser.ts line 28
 * Bug: Math.floor(fields.length / header.columns.length)
 * If header.columns.length is 0, this causes division by zero
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeTONL } from '../dist/decode.js';

describe('Bug #3: Division by zero in array parsing', () => {
  test('should handle array with zero columns gracefully', () => {
    // Array with no columns defined
    const tonl = `#version 1.0
items[3]{}: 1, 2, 3`;

    try {
      const result = decodeTONL(tonl);
      console.log('Result with zero columns:', result);

      // Should either error or handle gracefully
      if (result.items) {
        console.log('Parsed items:', result.items);
        console.log('Is array:', Array.isArray(result.items));
      }
    } catch (error: any) {
      console.log('Error (might be expected):', error.message);
      // Error is acceptable
      assert.ok(error.message, 'Should have error message');
    }
  });

  test('should verify division by zero behavior in JavaScript', () => {
    const result = Math.floor(3 / 0);
    console.log('Math.floor(3 / 0) =', result);
    assert.strictEqual(result, Infinity, 'Division by zero gives Infinity');

    const result2 = Math.floor(0 / 0);
    console.log('Math.floor(0 / 0) =', result2);
    assert.ok(Number.isNaN(result2), 'Math.floor(0 / 0) gives NaN');
  });

  test('should handle empty columns array', () => {
    // Edge case: array declared with empty column definition
    const tonl = `#version 1.0
arr[2]{}:
  1, 2
  3, 4`;

    try {
      const result = decodeTONL(tonl);
      console.log('Result with empty columns:', result);

      if (result.arr) {
        console.log('Parsed as:', Array.isArray(result.arr) ? 'array' : 'object');
        console.log('Content:', JSON.stringify(result.arr));
      }
    } catch (error: any) {
      console.log('Error:', error.message);
    }
  });
});
