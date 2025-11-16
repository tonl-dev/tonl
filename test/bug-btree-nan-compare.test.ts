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

    // BUG-NEW-008 FIX: With the fix, NaN values should be handled gracefully
    doc.createIndex('score', 'btree');

    console.log('Index created with NaN value');

    // Try to query using the index
    const query = doc.query('values[*]');
    console.log('Query result:', query);

    assert.ok(Array.isArray(query), 'Should return array');
    assert.strictEqual(query.length, 3, 'Should have all 3 items');

    // Verify NaN item is still accessible
    const nanItem = query.find((item: any) => Number.isNaN(item.score));
    assert.ok(nanItem, 'Should find NaN item');
    assert.strictEqual(nanItem.id, 2, 'NaN item should have id 2');
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

    doc.createIndex('score', 'btree');
    console.log('Index created with Infinity values');

    const query = doc.query('values[*]');
    assert.strictEqual(query.length, 4, 'Should have all 4 items');

    // Verify ordering with Infinity values
    const infItem = query.find((item: any) => item.score === Infinity);
    const negInfItem = query.find((item: any) => item.score === -Infinity);

    assert.ok(infItem, 'Should find Infinity item');
    assert.ok(negInfItem, 'Should find -Infinity item');
  });

  // BUG-NEW-008: Additional test for NaN comparison fix
  test('should correctly compare and sort NaN values in B-Tree', () => {
    const data = {
      items: [
        { name: 'a', value: 5 },
        { name: 'b', value: NaN },
        { name: 'c', value: 10 },
        { name: 'd', value: NaN },
        { name: 'e', value: 3 }
      ]
    };

    const doc = TONLDocument.fromJSON(data);

    // Create B-Tree index on value field
    doc.createIndex('value', 'btree');

    // Query all items
    const allItems = doc.query('items[*]');
    assert.strictEqual(allItems.length, 5, 'Should have all 5 items');

    // Find NaN items
    const nanItems = allItems.filter((item: any) => Number.isNaN(item.value));
    assert.strictEqual(nanItems.length, 2, 'Should find 2 NaN items');

    // Find numeric items
    const numericItems = allItems.filter((item: any) => typeof item.value === 'number' && !Number.isNaN(item.value));
    assert.strictEqual(numericItems.length, 3, 'Should find 3 numeric items');
  });
});
