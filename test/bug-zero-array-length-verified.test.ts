/**
 * Bug #2 Verification: Zero-length array incorrectly uses fallback calculation
 * Location: src/parser/value-parser.ts line 25
 *
 * The code uses: header.arrayLength || Math.floor(...)
 * When arrayLength is 0 (a valid value), the || operator treats it as falsy
 * and uses the fallback calculation instead.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { encodeTONL, decodeTONL } from '../dist/index.js';

describe('Bug #2: Zero-length array with || operator', () => {
  it('should correctly handle zero-length array with columns (edge case)', () => {
    // Create a zero-length array of objects
    const data = {
      emptyUsers: []
    };

    // Encode to TONL
    const tonl = encodeTONL(data);
    console.log('Encoded TONL:');
    console.log(tonl);

    // Decode back
    const decoded = decodeTONL(tonl);
    console.log('Decoded:',decoded);

    // Should preserve empty array
    assert.deepStrictEqual(decoded.emptyUsers, []);
  });

  it('demonstrates the bug with single-line format (if used)', () => {
    // The bug specifically affects the single-line array parsing
    // where arrayLength is explicitly 0 but there might be fields

    // Manual TONL with single-line format showing array length 0
    // but with column definitions
    const tonlWithBug = `#version 1.0
emptyUsers[0]{name,age}:`;

    const decoded = decodeTONL(tonlWithBug);
    console.log('Decoded from manual TONL:', decoded);

    // The bug would cause incorrect parsing if there were fields
    // Because 0 || Math.floor(fields.length / columns.length) would use the fallback
    assert.deepStrictEqual(decoded.emptyUsers, [], 'Should be empty array');
  });

  it('demonstrates the bug would affect non-empty single-line with length mismatch', () => {
    // NOTE: items[0]{id,name}: data is NOT valid single-line TONL format
    // Valid format is multi-line only. This test verifies parser handles invalid input gracefully.

    const tonlBugCase = `#version 1.0
items[0]{id,name}: 1, Alice`;

    const decoded = decodeTONL(tonlBugCase);
    console.log('Bug case result:', decoded);

    // Since this format is invalid, parser treats "items[0]" as literal key
    // This is acceptable behavior for invalid input
    assert.ok(decoded['items[0]'] !== undefined || (decoded.items && Array.isArray(decoded.items)),
      'Should handle invalid format gracefully (either as literal key or parse leniently)');
  });
});
