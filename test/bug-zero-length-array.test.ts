/**
 * Test for parser/value-parser.ts:25 bug
 * Bug: arrayLength || fallback causes issues when arrayLength is 0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { encodeTONL, decodeTONL } from '../dist/index.js';

describe('Zero-Length Array Bug Test', () => {
  it('should handle zero-length array correctly', () => {
    const data = { emptyArray: [] };

    // Encode to TONL
    const tonl = encodeTONL(data);
    console.log('Encoded TONL:', tonl);

    // Decode back
    const decoded = decodeTONL(tonl);
    console.log('Decoded:', decoded);

    assert.deepStrictEqual(decoded.emptyArray, [], 'Empty array should remain empty');
  });

  it('should handle zero-length object array correctly', () => {
    const data = { users: [] };

    const tonl = encodeTONL(data, { includeTypes: true });
    console.log('Encoded TONL with types:', tonl);

    const decoded = decodeTONL(tonl);
    console.log('Decoded:', decoded);

    assert.deepStrictEqual(decoded.users, [], 'Empty object array should remain empty');
  });

  it('should test the specific bug scenario - single-line array with length 0', () => {
    // Manually craft TONL with arrayLength=0 but with field data (edge case)
    const tonlWithBug = `#version 1.0
items[0]{id,name}: `;

    const decoded = decodeTONL(tonlWithBug);
    console.log('Decoded from manual TONL:', decoded);

    // Should be empty array, not try to parse non-existent fields
    assert.ok(Array.isArray(decoded.items), 'Should be an array');
    assert.strictEqual(decoded.items.length, 0, 'Should be empty array');
  });
});
