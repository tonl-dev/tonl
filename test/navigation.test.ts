/**
 * Test suite for Navigation & Iteration API (T004)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  entries,
  keys,
  values,
  deepEntries,
  deepKeys,
  deepValues,
  walk,
  countNodes,
  find,
  findAll,
  some,
  every
} from '../dist/src/navigation/index.js';

describe('Navigation & Iteration API - T004', () => {
  const testData = {
    user: {
      name: 'Alice',
      age: 30,
      email: 'alice@example.com'
    },
    users: [
      { id: 1, name: 'Bob' },
      { id: 2, name: 'Carol' }
    ]
  };

  describe('Basic Iterators', () => {
    test('should iterate over object entries', () => {
      const result = Array.from(entries(testData));
      assert.strictEqual(result.length, 2);
      assert.ok(result.some(([k]) => k === 'user'));
      assert.ok(result.some(([k]) => k === 'users'));
    });

    test('should iterate over object keys', () => {
      const result = Array.from(keys(testData));
      assert.deepStrictEqual(result.sort(), ['user', 'users']);
    });

    test('should iterate over object values', () => {
      const result = Array.from(values(testData));
      assert.strictEqual(result.length, 2);
    });

    test('should iterate over array entries', () => {
      const arr = ['a', 'b', 'c'];
      const result = Array.from(entries(arr));
      assert.strictEqual(result.length, 3);
      assert.deepStrictEqual(result[0], ['0', 'a']);
    });

    test('should iterate over array keys', () => {
      const arr = ['a', 'b', 'c'];
      const result = Array.from(keys(arr));
      assert.deepStrictEqual(result, ['0', '1', '2']);
    });

    test('should iterate over array values', () => {
      const arr = [1, 2, 3];
      const result = Array.from(values(arr));
      assert.deepStrictEqual(result, [1, 2, 3]);
    });
  });

  describe('Deep Iterators', () => {
    test('should iterate all paths recursively', () => {
      const result = Array.from(deepKeys(testData));
      assert.ok(result.includes('user.name'));
      assert.ok(result.includes('users[0].id'));
    });

    test('should iterate all entries recursively', () => {
      const result = Array.from(deepEntries(testData));
      assert.ok(result.some(([p, v]) => p === 'user.name' && v === 'Alice'));
    });

    test('should iterate all values recursively', () => {
      const result = Array.from(deepValues(testData));
      assert.ok(result.includes('Alice'));
      assert.ok(result.includes(30));
    });
  });

  describe('Walker', () => {
    test('should walk tree with callback', () => {
      const paths: string[] = [];
      walk(testData, (path) => { paths.push(path); });
      assert.ok(paths.length > 0);
    });

    test('should support early termination', () => {
      let count = 0;
      walk(testData, () => {
        count++;
        return count < 3; // Stop after 3 nodes
      });
      assert.strictEqual(count, 3);
    });

    test('should provide depth information', () => {
      const depths: number[] = [];
      walk(testData, (_, __, depth) => { depths.push(depth); });
      assert.ok(Math.max(...depths) >= 2);
    });

    test('should count all nodes', () => {
      const count = countNodes(testData);
      assert.ok(count > 5);
    });

    test('should find value by predicate', () => {
      const result = find(testData, (val) => val === 'Alice');
      assert.strictEqual(result, 'Alice');
    });

    test('should find all matching values', () => {
      const result = findAll(testData, (val) => typeof val === 'number');
      assert.ok(result.length >= 3);
    });

    test('should check if some value matches', () => {
      const result = some(testData, (val) => val === 30);
      assert.strictEqual(result, true);
    });

    test('should check if every value matches', () => {
      const data = { a: 1, b: 2, c: 3 };
      const result = every(data, (val) => typeof val === 'number');
      assert.strictEqual(result, true);
    });
  });
});
