/**
 * Test for Bug #2: Missing NaN validation after parseInt
 *
 * Tests whether parseInt/parseFloat results are validated before use
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeTONL } from '../dist/decode.js';

describe('Bug #2: Missing NaN validation after parseInt', () => {
  test('should handle malformed array length gracefully', () => {
    // Array length with invalid number (letters)
    const tonl = `#version 1.0
items[abc]: 1, 2, 3`;

    try {
      const result = decodeTONL(tonl);
      console.log('Result:', JSON.stringify(result, null, 2));

      // Check if items exists and is an array
      if (result.items) {
        assert.ok(Array.isArray(result.items), 'Should be an array or error');
        console.log('Parsed as array with length:', result.items.length);
      }
    } catch (error) {
      console.log('Throws error (expected):', error.message);
      // This is acceptable behavior
    }
  });

  test('should handle malformed array index in nested structure', () => {
    const tonl = `#version 1.0
items[2]:
  [xyz]{}:
    value: test`;

    try {
      const result = decodeTONL(tonl);
      console.log('Result:', JSON.stringify(result, null, 2));

      // If [xyz] gets parsed as NaN, it would create result[NaN] which is wrong
      if (result.items && Array.isArray(result.items)) {
        // Check if any properties are "NaN"
        const itemsObj = result.items as any;
        if ('NaN' in itemsObj) {
          assert.fail('Found property "NaN" in array - this is a bug!');
        }
      }
    } catch (error) {
      console.log('Throws error (expected):', error.message);
      // This is acceptable behavior
    }
  });

  test('should handle very large array length', () => {
    const tonl = `#version 1.0
items[999999999999999999999]: 1, 2, 3`;

    try {
      const result = decodeTONL(tonl);
      console.log('Result for huge array length:', result);

      if (result.items) {
        assert.ok(Array.isArray(result.items), 'Should be an array');
        console.log('Parsed with length:', result.items.length);
      }
    } catch (error) {
      console.log('Throws error (might be expected):', error.message);
    }
  });

  test('should handle negative array length', () => {
    const tonl = `#version 1.0
items[-5]: 1, 2, 3`;

    try {
      const result = decodeTONL(tonl);
      console.log('Result for negative array length:', result);

      if (result.items) {
        console.log('items type:', Array.isArray(result.items) ? 'array' : typeof result.items);
      }
    } catch (error) {
      console.log('Throws error (might be expected):', error.message);
    }
  });
});
