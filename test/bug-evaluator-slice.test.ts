/**
 * Test to verify the slice evaluator bug
 * Bug: evaluator.ts:435 has unnecessary and illogical safety check
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TONLDocument } from '../dist/document.js';

describe('Slice Evaluator Bug', () => {
  it('BUG: Line 435 safety check is illogical (result.length > length)', () => {
    // The check on line 435: if (result.length > length) break;
    // This is meant to prevent infinite loops, but it's illogical
    // because result.length can NEVER exceed the source array length
    // in a normal slice operation with positive step

    const data = { items: Array.from({ length: 100 }, (_, i) => i) };
    const doc = TONLDocument.fromJSON(data);

    // Test normal slice
    const result1 = doc.query('items[0:50:2]');
    // Should return 25 elements: 0, 2, 4, ..., 48
    assert.strictEqual(result1.length, 25, 'Normal slice with step should work');

    // Test slice with large step
    const result2 = doc.query('items[0:100:10]');
    // Should return 10 elements: 0, 10, 20, ..., 90
    assert.strictEqual(result2.length, 10, 'Large step slice should work');

    // The bug is that the safety check `result.length > length` will never trigger
    // because the loop already has correct bounds checking with `i < actualEnd && i < length`
    // This makes the safety check redundant and illogical

    // If the safety check were meant to limit the number of iterations,
    // it should compare iteration count, not result.length vs source array length
  });

  it('Demonstrates that result.length never exceeds source array length', () => {
    const data = { items: [1, 2, 3, 4, 5] };
    const doc = TONLDocument.fromJSON(data);

    // Even with step=1 covering the entire array
    const result = doc.query('items[0:1000:1]');  // End way beyond array
    assert.strictEqual(result.length, 5, 'Result length equals source array length');
    assert.ok(result.length <= data.items.length, 'Result never exceeds source');
  });
});
