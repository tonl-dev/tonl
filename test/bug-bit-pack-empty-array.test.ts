/**
 * BUG-NEW-012 TEST
 * Test fix for Math.max/min on empty array bug in bit packing module
 *
 * BUG-NEW-012: bit-pack.ts:209 - Math.max/min on empty array returns -Infinity/Infinity
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BitPacker } from '../dist/optimization/bit-pack.js';

describe('BUG-NEW-012: Bit packing empty array handling', () => {
  test('should throw clear error for empty array in packIntegers', () => {
    const packer = new BitPacker({
      enabled: true,
      packBooleans: true,
      packSmallIntegers: true,
      maxIntValue: 1000000
    });

    // Empty array should throw a clear error, not produce -Infinity/Infinity
    assert.throws(
      () => packer.packIntegers([]),
      {
        name: 'Error',
        message: 'Cannot pack empty array'
      },
      'Should throw clear error for empty array'
    );
  });

  test('should not throw for array with single element', () => {
    const packer = new BitPacker({
      enabled: true,
      packBooleans: true,
      packSmallIntegers: true,
      maxIntValue: 1000000
    });

    // Single element should work fine
    const result = packer.packIntegers([5]);
    assert(Array.isArray(result), 'Should return array');
    assert(result.length > 0, 'Result should not be empty');
  });

  test('should handle normal arrays correctly', () => {
    const packer = new BitPacker({
      enabled: true,
      packBooleans: true,
      packSmallIntegers: true,
      maxIntValue: 1000000
    });

    // Normal array should work as before
    const values = [1, 2, 3, 4, 5];
    const packed = packer.packIntegers(values);
    assert(Array.isArray(packed), 'Should return packed array');
    assert(packed.length > 0, 'Packed array should not be empty');
  });

  test('should throw for out-of-range values (not related to empty array)', () => {
    const packer = new BitPacker({
      enabled: true,
      packBooleans: true,
      packSmallIntegers: true,
      maxIntValue: 100
    });

    // Out of range values should still throw appropriate error
    assert.throws(
      () => packer.packIntegers([1, 2, 200]),  // 200 exceeds maxIntValue
      {
        name: 'Error',
        message: /Values out of range/
      },
      'Should throw for out-of-range values'
    );
  });

  test('should analyze empty array without crashing', () => {
    const packer = new BitPacker({
      enabled: true,
      packBooleans: true,
      packSmallIntegers: true,
      maxIntValue: 1000000
    });

    // analyzeValues should handle empty arrays gracefully
    const analysis = packer.analyzeValues([]);

    assert.strictEqual(analysis.valueCount, 0, 'Should report 0 values');
    assert.strictEqual(analysis.recommended, false, 'Should not recommend packing empty array');
    assert(Number.isFinite(analysis.compressionRatio), 'Compression ratio should be finite');
    assert(!Number.isNaN(analysis.compressionRatio), 'Compression ratio should not be NaN');
  });

  test('should not produce Infinity or NaN in any calculations', () => {
    const packer = new BitPacker({
      enabled: true,
      packBooleans: true,
      packSmallIntegers: true,
      maxIntValue: 1000000
    });

    // Test various edge cases
    const testCases = [
      [0],
      [1],
      [0, 1],
      [1, 1, 1],
      Array.from({ length: 100 }, (_, i) => i)
    ];

    for (const testCase of testCases) {
      const analysis = packer.analyzeValues(testCase);

      // Verify no invalid values in analysis
      assert(Number.isFinite(analysis.compressionRatio), `Compression ratio should be finite for ${testCase}`);
      assert(!Number.isNaN(analysis.compressionRatio), `Compression ratio should not be NaN for ${testCase}`);
      assert(Number.isFinite(analysis.packedSize), `Packed size should be finite for ${testCase}`);
      assert(Number.isFinite(analysis.originalSize), `Original size should be finite for ${testCase}`);
    }
  });
});
