/**
 * Test for potential bug in negative step slice handling
 * evaluator.ts:426-429
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TONLDocument } from '../dist/document.js';

describe('Negative Step Slice Bug Test', () => {
  it('should handle negative step correctly', () => {
    const data = { items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] };
    const doc = TONLDocument.fromJSON(data);

    // Test negative step (reverse iteration)
    // In Python: items[9:0:-1] returns [9, 8, 7, 6, 5, 4, 3, 2, 1]
    const result1 = doc.query('items[9:0:-1]');
    console.log('items[9:0:-1]:', result1);

    // Test reverse with no start/end
    const result2 = doc.query('items[::-1]');
    console.log('items[::-1]:', result2);
    assert.deepStrictEqual(result2, [9, 8, 7, 6, 5, 4, 3, 2, 1, 0], 'Full reverse should work');

    // Test negative step with positive indices
    const result3 = doc.query('items[5:2:-1]');
    console.log('items[5:2:-1]:', result3);
  });

  it('should handle edge cases with negative step', () => {
    const data = { items: [1, 2, 3, 4, 5] };
    const doc = TONLDocument.fromJSON(data);

    // Edge case: negative step with start < end (should return empty or reverse)
    try {
      const result = doc.query('items[1:4:-1]');
      console.log('items[1:4:-1]:', result);
      // In Python, this returns [] because you can't go from 1 to 4 with negative step
    } catch (error) {
      console.log('Error with items[1:4:-1]:', error);
    }
  });
});
