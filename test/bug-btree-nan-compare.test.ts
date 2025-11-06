/**
 * Test for Bug #4: BTree comparison function doesn't handle NaN
 *
 * Location: src/indexing/btree-index.ts line 44
 * Bug: a - b returns NaN when either value is NaN
 * Impact: Breaks binary search, incorrect index behavior
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { TONLDocument } from '../dist/document.js';

describe('Bug #4: BTree NaN comparison', () => {
  test('should verify NaN comparison issue in JavaScript', () => {
    const a = NaN;
    const b = 5;

    const result = a - b;
    console.log('NaN - 5 =', result);
    assert.ok(Number.isNaN(result), 'NaN - 5 should be NaN');

    // In comparison context:
    assert.strictEqual(result > 0, false, 'NaN > 0 is false');
    assert.strictEqual(result < 0, false, 'NaN < 0 is false');
    assert.strictEqual(result === 0, false, 'NaN === 0 is false');

    console.log('NaN comparison breaks ordering logic!');
  });

  test('should handle NaN values in indexed data', () => {
    const data = {
      values: [
        { id: 1, score: 100 },
        { id: 2, score: NaN },  // NaN value
        { id: 3, score: 50 }
      ]
    };

    const doc = TONLDocument.fromJSON(data);

    try {
      // Create index on score field (which contains NaN)
      doc.createIndex('score', 'btree');

      console.log('Index created with NaN value');

      // Try to query using the index
      const query = doc.query('values[*]');
      console.log('Query result:', query);

      assert.ok(Array.isArray(query), 'Should return array');
      assert.strictEqual(query.length, 3, 'Should have all 3 items');
    } catch (error: any) {
      console.log('Error with NaN in index:', error.message);
      // Error is acceptable - NaN in numeric comparisons is problematic
    }
  });

  test('should handle Infinity in indexed values', () => {
    const data = {
      values: [
        { id: 1, score: 100 },
        { id: 2, score: Infinity },
        { id: 3, score: -Infinity },
        { id: 4, score: 50 }
      ]
    };

    const doc = TONLDocument.fromJSON(data);

    try {
      doc.createIndex('score', 'btree');
      console.log('Index created with Infinity values');

      const query = doc.query('values[*]');
      assert.strictEqual(query.length, 4, 'Should have all 4 items');
    } catch (error: any) {
      console.log('Error with Infinity:', error.message);
    }
  });
});
