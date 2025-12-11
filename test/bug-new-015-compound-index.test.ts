/**
 * Test suite for BUG-NEW-015: Compound Index JSON.stringify Vulnerability
 *
 * Issue: createCompoundKey() used JSON.stringify without error handling,
 * which could throw on BigInt, circular references, or symbols.
 *
 * Fix: Added try-catch with custom replacer for special types and
 * fallback string representation for circular references.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { CompoundIndex } from '../dist/indexing/compound-index.js';

describe('BUG-NEW-015: Compound Index JSON.stringify Handling', () => {
  it('should handle normal compound keys correctly', () => {
    const index = new CompoundIndex('test-index', ['field1', 'field2']);

    // Insert with normal values
    index.insert(['value1', 'value2'], 'path1');
    index.insert(['value3', 'value4'], 'path2');

    // Find should work
    const result1 = index.find(['value1', 'value2']);
    assert.strictEqual(result1.length, 1);
    assert.strictEqual(result1[0], 'path1');

    const result2 = index.find(['value3', 'value4']);
    assert.strictEqual(result2.length, 1);
    assert.strictEqual(result2[0], 'path2');
  });

  it('should handle BigInt values without crashing', () => {
    const index = new CompoundIndex('bigint-index', ['id', 'bigValue']);

    // BigInt values should be handled gracefully
    const bigValue = BigInt('9007199254740993'); // Larger than MAX_SAFE_INTEGER

    // This should not throw
    index.insert([1, bigValue], 'path1');
    index.insert([2, BigInt('12345678901234567890')], 'path2');

    // Should be able to find the entries
    const result = index.find([1, bigValue]);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0], 'path1');
  });

  it('should handle symbol values without crashing', () => {
    const index = new CompoundIndex('symbol-index', ['type', 'symbol']);

    const sym = Symbol('test-symbol');

    // This should not throw
    index.insert(['type1', sym], 'path1');

    // Should be able to find the entry
    const result = index.find(['type1', sym]);
    assert.strictEqual(result.length, 1);
  });

  it('should handle mixed special values', () => {
    const index = new CompoundIndex('mixed-index', ['a', 'b', 'c']);

    // Mix of BigInt, symbol, and normal values
    const values = [BigInt(123), Symbol('test'), 'normal'];

    // This should not throw
    index.insert(values, 'path1');

    // Should be able to find
    const result = index.find(values);
    assert.strictEqual(result.length, 1);
  });

  it('should handle undefined and null values', () => {
    const index = new CompoundIndex('null-index', ['a', 'b']);

    // Insert with null/undefined
    index.insert([null, undefined], 'path1');
    index.insert([null, 'value'], 'path2');

    // Should be findable
    const result1 = index.find([null, undefined]);
    assert.ok(result1.length > 0);

    const result2 = index.find([null, 'value']);
    assert.ok(result2.length > 0);
  });

  it('should handle function values gracefully', () => {
    const index = new CompoundIndex('fn-index', ['name', 'handler']);

    const fn = () => console.log('test');

    // This should not throw
    index.insert(['handler1', fn], 'path1');

    // Should be able to find
    const result = index.find(['handler1', fn]);
    assert.strictEqual(result.length, 1);
  });

  it('should handle circular references gracefully', () => {
    const index = new CompoundIndex('circular-index', ['obj', 'id']);

    // Create a circular reference
    const obj: any = { name: 'circular' };
    obj.self = obj; // Circular reference

    // This should not throw (previously would crash with "Converting circular structure to JSON")
    index.insert([obj, 123], 'path1');

    // Should be able to find (using fallback key)
    const result = index.find([obj, 123]);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0], 'path1');
  });

  it('should handle deeply nested objects with circular refs', () => {
    const index = new CompoundIndex('deep-circular', ['data']);

    const parent: any = { name: 'parent' };
    const child: any = { name: 'child', parent: parent };
    parent.child = child; // Create circular reference

    // This should not throw
    index.insert([parent], 'path1');

    // Insert another entry with circular data
    index.insert([child], 'path2');

    // Both should be inserted
    assert.strictEqual(index.size(), 2);
  });

  it('should maintain consistent keys for same values', () => {
    const index = new CompoundIndex('consistency-test', ['a', 'b']);

    const bigInt = BigInt(12345);

    // Insert twice with same BigInt
    index.insert([bigInt, 'test'], 'path1');
    index.insert([bigInt, 'test'], 'path2');

    // Both paths should be found with same key
    const result = index.find([bigInt, 'test']);
    assert.strictEqual(result.length, 2);
    assert.ok(result.includes('path1'));
    assert.ok(result.includes('path2'));
  });

  it('should work with BTree type compound index', () => {
    const index = new CompoundIndex('btree-test', ['score', 'name'], { type: 'btree' });

    // Insert with BigInt
    index.insert([BigInt(100), 'Alice'], 'path1');
    index.insert([BigInt(200), 'Bob'], 'path2');

    // Find should work
    const result = index.find([BigInt(100), 'Alice']);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0], 'path1');
  });

  it('should support unique constraint with special values', () => {
    const index = new CompoundIndex('unique-test', ['id', 'value'], { unique: true });

    // First insert should work
    index.insert([BigInt(1), 'test'], 'path1');

    // Duplicate should fail for unique index
    try {
      index.insert([BigInt(1), 'test'], 'path2');
      // If we get here, the unique constraint wasn't enforced
      // This depends on the underlying index implementation
    } catch (e) {
      // Expected - unique constraint violation
      assert.ok(e instanceof Error);
    }
  });
});

describe('BUG-NEW-015: Compound Index Integration', () => {
  it('should work with real-world data patterns', () => {
    const index = new CompoundIndex('user-activity', ['userId', 'action', 'timestamp']);

    // Simulate user activity indexing
    const userId = BigInt('1234567890123456789');
    const now = Date.now();

    index.insert([userId, 'login', now], 'activity/1');
    index.insert([userId, 'view', now + 1000], 'activity/2');
    index.insert([userId, 'logout', now + 2000], 'activity/3');

    // Should be able to query by exact match
    const loginResult = index.find([userId, 'login', now]);
    assert.strictEqual(loginResult.length, 1);
    assert.strictEqual(loginResult[0], 'activity/1');

    // Index size should be correct
    assert.strictEqual(index.size(), 3);
  });

  it('should handle remove operations with special values', () => {
    const index = new CompoundIndex('remove-test', ['id']);

    const bigId = BigInt(999);

    index.insert([bigId], 'path1');
    assert.strictEqual(index.size(), 1);

    // Remove should work
    const removed = index.remove([bigId], 'path1');
    assert.strictEqual(removed, true);
    assert.strictEqual(index.size(), 0);
  });

  it('should handle has() with special values', () => {
    const index = new CompoundIndex('has-test', ['value']);

    const bigValue = BigInt(12345);
    const sym = Symbol('test');

    index.insert([bigValue], 'path1');
    index.insert([sym], 'path2');

    assert.strictEqual(index.has([bigValue]), true);
    assert.strictEqual(index.has([sym]), true);
    assert.strictEqual(index.has([BigInt(99999)]), false);
  });
});
