/**
 * HashIndex Tests
 * Tests for hash-based index for O(1) lookups
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { HashIndex } from '../dist/indexing/hash-index.js';

describe('HashIndex', () => {
  describe('constructor', () => {
    test('should create index with name', () => {
      const index = new HashIndex('test-index');
      assert.strictEqual(index.name, 'test-index');
      assert.strictEqual(index.type, 'hash');
    });

    test('should create non-unique index by default', () => {
      const index = new HashIndex('default-index');
      // Should allow duplicate keys
      index.insert('key1', 'path1');
      index.insert('key1', 'path2');
      assert.deepStrictEqual(index.find('key1').sort(), ['path1', 'path2'].sort());
    });

    test('should create unique index when specified', () => {
      const index = new HashIndex('unique-index', { unique: true });
      index.insert('key1', 'path1');
      assert.throws(
        () => index.insert('key1', 'path2'),
        /Duplicate key in unique index/
      );
    });

    test('should create case-insensitive index when specified', () => {
      const index = new HashIndex('ci-index', { caseInsensitive: true });
      index.insert('Key', 'path1');
      assert.ok(index.has('key'));
      assert.ok(index.has('KEY'));
      assert.ok(index.has('Key'));
    });
  });

  describe('insert', () => {
    test('should insert single entry', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      assert.deepStrictEqual(index.find('key1'), ['path1']);
    });

    test('should insert multiple paths for same key', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      index.insert('key1', 'path2');
      index.insert('key1', 'path3');
      const paths = index.find('key1').sort();
      assert.deepStrictEqual(paths, ['path1', 'path2', 'path3']);
    });

    test('should insert different keys', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      index.insert('key2', 'path2');
      index.insert('key3', 'path3');
      assert.deepStrictEqual(index.find('key1'), ['path1']);
      assert.deepStrictEqual(index.find('key2'), ['path2']);
      assert.deepStrictEqual(index.find('key3'), ['path3']);
    });

    test('should handle numeric keys', () => {
      const index = new HashIndex('test');
      index.insert(1, 'path1');
      index.insert(2, 'path2');
      assert.deepStrictEqual(index.find(1), ['path1']);
      assert.deepStrictEqual(index.find(2), ['path2']);
    });

    test('should handle boolean keys', () => {
      const index = new HashIndex('test');
      index.insert(true, 'path1');
      index.insert(false, 'path2');
      assert.deepStrictEqual(index.find(true), ['path1']);
      assert.deepStrictEqual(index.find(false), ['path2']);
    });

    test('should handle null key', () => {
      const index = new HashIndex('test');
      index.insert(null, 'path1');
      assert.deepStrictEqual(index.find(null), ['path1']);
    });

    test('should not add duplicate paths', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      index.insert('key1', 'path1'); // Same path again
      assert.deepStrictEqual(index.find('key1'), ['path1']);
    });

    test('should throw on duplicate key in unique index', () => {
      const index = new HashIndex('unique', { unique: true });
      index.insert('key1', 'path1');
      assert.throws(
        () => index.insert('key1', 'path2'),
        /Duplicate key in unique index 'unique': key1/
      );
    });
  });

  describe('remove', () => {
    test('should remove specific path', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      index.insert('key1', 'path2');

      const result = index.remove('key1', 'path1');
      assert.strictEqual(result, true);
      assert.deepStrictEqual(index.find('key1'), ['path2']);
    });

    test('should remove all paths for key when no path specified', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      index.insert('key1', 'path2');

      const result = index.remove('key1');
      assert.strictEqual(result, true);
      assert.deepStrictEqual(index.find('key1'), []);
    });

    test('should return false for non-existent key', () => {
      const index = new HashIndex('test');
      const result = index.remove('non-existent');
      assert.strictEqual(result, false);
    });

    test('should return false for non-existent path', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      const result = index.remove('key1', 'non-existent');
      assert.strictEqual(result, false);
    });

    test('should clean up key when last path removed', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      index.remove('key1', 'path1');
      assert.strictEqual(index.has('key1'), false);
      assert.strictEqual(index.size(), 0);
    });
  });

  describe('find', () => {
    test('should return empty array for non-existent key', () => {
      const index = new HashIndex('test');
      assert.deepStrictEqual(index.find('non-existent'), []);
    });

    test('should return single path', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      assert.deepStrictEqual(index.find('key1'), ['path1']);
    });

    test('should return multiple paths', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      index.insert('key1', 'path2');
      const paths = index.find('key1').sort();
      assert.deepStrictEqual(paths, ['path1', 'path2']);
    });

    test('should find with case-insensitive key', () => {
      const index = new HashIndex('test', { caseInsensitive: true });
      index.insert('Hello', 'path1');
      assert.deepStrictEqual(index.find('hello'), ['path1']);
      assert.deepStrictEqual(index.find('HELLO'), ['path1']);
    });
  });

  describe('has', () => {
    test('should return true for existing key', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      assert.strictEqual(index.has('key1'), true);
    });

    test('should return false for non-existent key', () => {
      const index = new HashIndex('test');
      assert.strictEqual(index.has('non-existent'), false);
    });

    test('should work with case-insensitive index', () => {
      const index = new HashIndex('test', { caseInsensitive: true });
      index.insert('Key', 'path1');
      assert.strictEqual(index.has('key'), true);
      assert.strictEqual(index.has('KEY'), true);
    });
  });

  describe('clear', () => {
    test('should remove all entries', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      index.insert('key2', 'path2');
      index.insert('key3', 'path3');

      index.clear();
      assert.strictEqual(index.size(), 0);
      assert.strictEqual(index.has('key1'), false);
      assert.strictEqual(index.has('key2'), false);
      assert.strictEqual(index.has('key3'), false);
    });

    test('should handle clearing empty index', () => {
      const index = new HashIndex('test');
      index.clear(); // Should not throw
      assert.strictEqual(index.size(), 0);
    });
  });

  describe('size', () => {
    test('should return 0 for empty index', () => {
      const index = new HashIndex('test');
      assert.strictEqual(index.size(), 0);
    });

    test('should return number of unique keys', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      index.insert('key1', 'path2'); // Same key, different path
      index.insert('key2', 'path3');
      assert.strictEqual(index.size(), 2); // 2 unique keys
    });

    test('should decrease after remove', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      index.insert('key2', 'path2');
      assert.strictEqual(index.size(), 2);

      index.remove('key1');
      assert.strictEqual(index.size(), 1);
    });
  });

  describe('stats', () => {
    test('should return correct stats for empty index', () => {
      const index = new HashIndex('test');
      const stats = index.stats();
      assert.strictEqual(stats.size, 0);
      assert.strictEqual(stats.type, 'hash');
      assert.strictEqual(stats.unique, false);
      assert.strictEqual(stats.collisions, 0);
    });

    test('should return correct stats for non-unique index', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      index.insert('key2', 'path2');

      const stats = index.stats();
      assert.strictEqual(stats.size, 2);
      assert.strictEqual(stats.type, 'hash');
      assert.strictEqual(stats.unique, false);
      assert.ok(stats.memoryUsage > 0);
    });

    test('should return correct stats for unique index', () => {
      const index = new HashIndex('test', { unique: true });
      index.insert('key1', 'path1');

      const stats = index.stats();
      assert.strictEqual(stats.unique, true);
    });

    test('should count collisions (multiple paths per key)', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      index.insert('key1', 'path2');
      index.insert('key1', 'path3');
      index.insert('key2', 'path4'); // No collision

      const stats = index.stats();
      assert.strictEqual(stats.collisions, 1); // 1 key has collisions
    });
  });

  describe('keys iterator', () => {
    test('should iterate over all keys', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      index.insert('key2', 'path2');
      index.insert('key3', 'path3');

      const keys = Array.from(index.keys()).sort();
      assert.deepStrictEqual(keys, ['key1', 'key2', 'key3']);
    });

    test('should return empty iterator for empty index', () => {
      const index = new HashIndex('test');
      const keys = Array.from(index.keys());
      assert.deepStrictEqual(keys, []);
    });

    test('should return unique keys only', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      index.insert('key1', 'path2'); // Same key

      const keys = Array.from(index.keys());
      assert.deepStrictEqual(keys, ['key1']);
    });
  });

  describe('entries iterator', () => {
    test('should iterate over all entries', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      index.insert('key2', 'path2');

      const entries = Array.from(index.entries());
      assert.strictEqual(entries.length, 2);

      const sorted = entries.sort((a, b) => a.key.localeCompare(b.key));
      assert.deepStrictEqual(sorted[0], { key: 'key1', path: 'path1' });
      assert.deepStrictEqual(sorted[1], { key: 'key2', path: 'path2' });
    });

    test('should return entry for each path', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1');
      index.insert('key1', 'path2');

      const entries = Array.from(index.entries());
      assert.strictEqual(entries.length, 2);

      const paths = entries.map(e => e.path).sort();
      assert.deepStrictEqual(paths, ['path1', 'path2']);
    });

    test('should return empty iterator for empty index', () => {
      const index = new HashIndex('test');
      const entries = Array.from(index.entries());
      assert.deepStrictEqual(entries, []);
    });
  });

  describe('case sensitivity', () => {
    test('case-sensitive index treats different cases as different keys', () => {
      const index = new HashIndex('test'); // case-sensitive by default
      index.insert('Key', 'path1');
      index.insert('key', 'path2');
      index.insert('KEY', 'path3');

      assert.deepStrictEqual(index.find('Key'), ['path1']);
      assert.deepStrictEqual(index.find('key'), ['path2']);
      assert.deepStrictEqual(index.find('KEY'), ['path3']);
      assert.strictEqual(index.size(), 3);
    });

    test('case-insensitive index treats different cases as same key', () => {
      const index = new HashIndex('test', { caseInsensitive: true });
      index.insert('Key', 'path1');
      index.insert('key', 'path2');
      index.insert('KEY', 'path3');

      const paths = index.find('key').sort();
      assert.deepStrictEqual(paths, ['path1', 'path2', 'path3']);
      assert.strictEqual(index.size(), 1);
    });

    test('case-insensitive only affects string keys', () => {
      const index = new HashIndex('test', { caseInsensitive: true });
      index.insert(123, 'path1');
      assert.deepStrictEqual(index.find(123), ['path1']);
      assert.strictEqual(index.has(123), true);
    });
  });

  describe('edge cases', () => {
    test('should handle empty string key', () => {
      const index = new HashIndex('test');
      index.insert('', 'path1');
      assert.deepStrictEqual(index.find(''), ['path1']);
      assert.strictEqual(index.has(''), true);
    });

    test('should handle undefined value parameter', () => {
      const index = new HashIndex('test');
      index.insert('key1', 'path1', undefined);
      assert.deepStrictEqual(index.find('key1'), ['path1']);
    });

    test('should handle object keys (using reference)', () => {
      const index = new HashIndex('test');
      const objKey = { id: 1 };
      index.insert(objKey, 'path1');
      assert.deepStrictEqual(index.find(objKey), ['path1']);
    });

    test('should handle large number of entries', () => {
      const index = new HashIndex('test');
      const count = 10000;

      for (let i = 0; i < count; i++) {
        index.insert(`key${i}`, `path${i}`);
      }

      assert.strictEqual(index.size(), count);
      assert.deepStrictEqual(index.find('key5000'), ['path5000']);
    });

    test('should handle special characters in keys', () => {
      const index = new HashIndex('test');
      const specialKeys = ['hello world', 'key\twith\ttabs', 'key\nwith\nnewlines', 'key with "quotes"'];

      for (const key of specialKeys) {
        index.insert(key, `path-${key}`);
      }

      for (const key of specialKeys) {
        assert.deepStrictEqual(index.find(key), [`path-${key}`]);
      }
    });
  });
});
