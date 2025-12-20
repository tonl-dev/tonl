/**
 * Transaction Tests
 * Tests for atomic modification support
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { Transaction } from '../dist/modification/transaction.js';

describe('Transaction', () => {
  describe('constructor', () => {
    test('should create transaction with data snapshot', () => {
      const data = { name: 'Alice', age: 30 };
      const tx = new Transaction(data);
      assert.ok(tx);
    });

    test('should create deep copy of data for snapshot', () => {
      const data = { user: { name: 'Bob' } };
      const tx = new Transaction(data);

      // Modify original data
      data.user.name = 'Charlie';

      // Rollback should return original snapshot
      const snapshot = tx.rollback();
      assert.strictEqual(snapshot.user.name, 'Bob');
    });
  });

  describe('recordChange', () => {
    test('should record set change', () => {
      const tx = new Transaction({});
      tx.recordChange({
        type: 'set',
        path: 'name',
        oldValue: undefined,
        newValue: 'Alice'
      });

      const changes = tx.getChanges();
      assert.strictEqual(changes.length, 1);
      assert.strictEqual(changes[0].type, 'set');
      assert.strictEqual(changes[0].path, 'name');
    });

    test('should record delete change', () => {
      const tx = new Transaction({ name: 'Alice' });
      tx.recordChange({
        type: 'delete',
        path: 'name',
        oldValue: 'Alice'
      });

      const changes = tx.getChanges();
      assert.strictEqual(changes.length, 1);
      assert.strictEqual(changes[0].type, 'delete');
    });

    test('should record push change', () => {
      const tx = new Transaction({ items: [] });
      tx.recordChange({
        type: 'push',
        path: 'items',
        newValue: 42
      });

      const changes = tx.getChanges();
      assert.strictEqual(changes.length, 1);
      assert.strictEqual(changes[0].type, 'push');
    });

    test('should record pop change', () => {
      const tx = new Transaction({ items: [1, 2, 3] });
      tx.recordChange({
        type: 'pop',
        path: 'items',
        oldValue: 3
      });

      const changes = tx.getChanges();
      assert.strictEqual(changes.length, 1);
      assert.strictEqual(changes[0].type, 'pop');
    });

    test('should record multiple changes', () => {
      const tx = new Transaction({});
      tx.recordChange({ type: 'set', path: 'a', newValue: 1 });
      tx.recordChange({ type: 'set', path: 'b', newValue: 2 });
      tx.recordChange({ type: 'delete', path: 'a', oldValue: 1 });

      const changes = tx.getChanges();
      assert.strictEqual(changes.length, 3);
    });

    test('should throw if already committed', () => {
      const tx = new Transaction({});
      tx.commit();

      assert.throws(
        () => tx.recordChange({ type: 'set', path: 'name', newValue: 'test' }),
        /Transaction already committed/
      );
    });
  });

  describe('commit', () => {
    test('should return all recorded changes', () => {
      const tx = new Transaction({});
      tx.recordChange({ type: 'set', path: 'a', newValue: 1 });
      tx.recordChange({ type: 'set', path: 'b', newValue: 2 });

      const changes = tx.commit();
      assert.strictEqual(changes.length, 2);
    });

    test('should mark transaction as committed', () => {
      const tx = new Transaction({});
      tx.commit();

      assert.throws(
        () => tx.recordChange({ type: 'set', path: 'name', newValue: 'test' }),
        /Transaction already committed/
      );
    });

    test('should return empty array for no changes', () => {
      const tx = new Transaction({});
      const changes = tx.commit();
      assert.deepStrictEqual(changes, []);
    });
  });

  describe('rollback', () => {
    test('should return original snapshot', () => {
      const original = { name: 'Alice', items: [1, 2, 3] };
      const tx = new Transaction(original);

      // Record some changes
      tx.recordChange({ type: 'set', path: 'name', oldValue: 'Alice', newValue: 'Bob' });
      tx.recordChange({ type: 'push', path: 'items', newValue: 4 });

      // Rollback should return original snapshot
      const snapshot = tx.rollback();
      assert.deepStrictEqual(snapshot, { name: 'Alice', items: [1, 2, 3] });
    });

    test('should return the snapshot object', () => {
      const original = { nested: { value: 42 } };
      const tx = new Transaction(original);

      const snapshot1 = tx.rollback();
      const snapshot2 = tx.rollback();

      // Both calls return the same snapshot object
      assert.strictEqual(snapshot1, snapshot2);
      assert.strictEqual(snapshot1.nested.value, 42);
    });
  });

  describe('getChanges', () => {
    test('should return copy of changes', () => {
      const tx = new Transaction({});
      tx.recordChange({ type: 'set', path: 'a', newValue: 1 });

      const changes1 = tx.getChanges();
      changes1.push({ type: 'set', path: 'b', newValue: 2 });

      const changes2 = tx.getChanges();
      assert.strictEqual(changes2.length, 1); // Should not be affected
    });

    test('should return empty array initially', () => {
      const tx = new Transaction({});
      const changes = tx.getChanges();
      assert.deepStrictEqual(changes, []);
    });

    test('should work after commit', () => {
      const tx = new Transaction({});
      tx.recordChange({ type: 'set', path: 'a', newValue: 1 });
      tx.commit();

      const changes = tx.getChanges();
      assert.strictEqual(changes.length, 1);
    });
  });

  describe('change types', () => {
    test('should handle set with complex values', () => {
      const tx = new Transaction({});
      tx.recordChange({
        type: 'set',
        path: 'user.profile.settings',
        oldValue: undefined,
        newValue: { theme: 'dark', language: 'en' }
      });

      const changes = tx.getChanges();
      assert.deepStrictEqual(changes[0].newValue, { theme: 'dark', language: 'en' });
    });

    test('should handle delete with complex path', () => {
      const tx = new Transaction({ users: [{ id: 1 }] });
      tx.recordChange({
        type: 'delete',
        path: 'users[0]',
        oldValue: { id: 1 }
      });

      const changes = tx.getChanges();
      assert.strictEqual(changes[0].path, 'users[0]');
    });

    test('should handle array modifications', () => {
      const tx = new Transaction({ items: [1, 2, 3] });

      tx.recordChange({ type: 'push', path: 'items', newValue: 4 });
      tx.recordChange({ type: 'push', path: 'items', newValue: 5 });
      tx.recordChange({ type: 'pop', path: 'items', oldValue: 5 });

      const changes = tx.getChanges();
      assert.strictEqual(changes.length, 3);
      assert.strictEqual(changes[0].type, 'push');
      assert.strictEqual(changes[1].type, 'push');
      assert.strictEqual(changes[2].type, 'pop');
    });
  });

  describe('edge cases', () => {
    test('should handle null values', () => {
      const tx = new Transaction({ value: null });
      tx.recordChange({
        type: 'set',
        path: 'value',
        oldValue: null,
        newValue: 'not null'
      });

      const changes = tx.getChanges();
      assert.strictEqual(changes[0].oldValue, null);
    });

    test('should handle empty object', () => {
      const tx = new Transaction({});
      const snapshot = tx.rollback();
      assert.deepStrictEqual(snapshot, {});
    });

    test('should handle empty array', () => {
      const tx = new Transaction([]);
      const snapshot = tx.rollback();
      assert.deepStrictEqual(snapshot, []);
    });

    test('should handle deeply nested data', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep'
              }
            }
          }
        }
      };
      const tx = new Transaction(data);

      // Modify original
      data.level1.level2.level3.level4.value = 'modified';

      const snapshot = tx.rollback();
      assert.strictEqual(snapshot.level1.level2.level3.level4.value, 'deep');
    });

    test('should handle special characters in path', () => {
      const tx = new Transaction({});
      tx.recordChange({
        type: 'set',
        path: 'user.profile["first-name"]',
        newValue: 'Alice'
      });

      const changes = tx.getChanges();
      assert.strictEqual(changes[0].path, 'user.profile["first-name"]');
    });
  });
});
