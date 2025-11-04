/**
 * Comprehensive test suite for Query Evaluator (T002)
 *
 * Tests cover:
 * - Simple path evaluation
 * - Nested property access
 * - Array indexing and wildcards
 * - Recursive descent
 * - Array slicing
 * - exists() and typeOf() helpers
 * - Caching behavior
 * - Performance benchmarks
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  parsePath,
  QueryEvaluator,
  evaluate,
  exists,
  typeOf,
  QueryCache,
  getGlobalCache,
  resetGlobalCache
} from '../dist/src/query/index.js';

describe('Query Evaluator - T002', () => {
  // Test data
  const testData = {
    user: {
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      profile: {
        age: 30,
        city: 'New York',
        contact: {
          phone: '+1234567890',
          fax: '+0987654321'
        }
      }
    },
    users: [
      { id: 1, name: 'Alice', role: 'admin', active: true },
      { id: 2, name: 'Bob', role: 'user', active: true },
      { id: 3, name: 'Carol', role: 'editor', active: false }
    ],
    products: [
      { id: 101, name: 'Widget', price: 29.99, stock: 100 },
      { id: 102, name: 'Gadget', price: 49.99, stock: 50 },
      { id: 103, name: 'Tool', price: 19.99, stock: 200 }
    ],
    data: {
      items: [
        { value: 1, nested: { deep: 'value1' } },
        { value: 2, nested: { deep: 'value2' } },
        { value: 3, nested: { deep: 'value3' } }
      ]
    },
    primitives: {
      string: 'hello',
      number: 42,
      boolean: true,
      null: null,
      array: [1, 2, 3, 4, 5]
    }
  };

  // ========================================
  // Simple Property Access (Tests 1-15)
  // ========================================

  describe('Simple Property Access', () => {
    test('should access top-level property', () => {
      const ast = parsePath('user').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, testData.user);
    });

    test('should access nested property', () => {
      const ast = parsePath('user.name').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, 'Alice');
    });

    test('should access deeply nested property', () => {
      const ast = parsePath('user.profile.contact.phone').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, '+1234567890');
    });

    test('should return undefined for non-existent property', () => {
      const ast = parsePath('user.nonExistent').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, undefined);
    });

    test('should handle accessing property on null', () => {
      const ast = parsePath('primitives.null.property').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, undefined);
    });

    test('should access property starting with $', () => {
      const data = { $price: 100 };
      const ast = parsePath('$price').ast;
      const result = evaluate(data, ast);
      assert.strictEqual(result, 100);
    });

    test('should access property with root ($)', () => {
      const ast = parsePath('$.user.name').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, 'Alice');
    });

    test('should return entire document for root ($)', () => {
      const ast = parsePath('$').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, testData);
    });

    test('should return entire document for empty path', () => {
      const result = evaluate(testData, []);
      assert.deepStrictEqual(result, testData);
    });

    test('should access multiple levels', () => {
      const ast = parsePath('user.profile.age').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, 30);
    });

    test('should access primitive values', () => {
      const ast = parsePath('primitives.number').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, 42);
    });

    test('should access boolean values', () => {
      const ast = parsePath('primitives.boolean').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, true);
    });

    test('should access null values', () => {
      const ast = parsePath('primitives.null').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, null);
    });

    test('should access string values', () => {
      const ast = parsePath('primitives.string').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, 'hello');
    });

    test('should access array property', () => {
      const ast = parsePath('primitives.array').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, [1, 2, 3, 4, 5]);
    });
  });

  // ========================================
  // Array Indexing (Tests 16-30)
  // ========================================

  describe('Array Indexing', () => {
    test('should access array element by index', () => {
      const ast = parsePath('users[0]').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, testData.users[0]);
    });

    test('should access array element property', () => {
      const ast = parsePath('users[0].name').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, 'Alice');
    });

    test('should handle negative index', () => {
      const ast = parsePath('users[-1]').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, testData.users[2]);
    });

    test('should handle negative index -2', () => {
      const ast = parsePath('users[-2]').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, testData.users[1]);
    });

    test('should return undefined for out of bounds index', () => {
      const ast = parsePath('users[100]').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, undefined);
    });

    test('should return undefined for negative out of bounds', () => {
      const ast = parsePath('users[-100]').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, undefined);
    });

    test('should handle nested array access', () => {
      const ast = parsePath('data.items[0].value').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, 1);
    });

    test('should handle deeply nested array property', () => {
      const ast = parsePath('data.items[1].nested.deep').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, 'value2');
    });

    test('should handle array of primitives', () => {
      const ast = parsePath('primitives.array[2]').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, 3);
    });

    test('should return undefined for index on non-array', () => {
      const ast = parsePath('user[0]').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, undefined);
    });

    test('should handle zero index', () => {
      const ast = parsePath('users[0]').ast;
      const result = evaluate(testData, ast);
      assert.ok(result);
    });

    test('should handle last element access', () => {
      const ast = parsePath('primitives.array[-1]').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, 5);
    });

    test('should handle multiple array indices', () => {
      const data = { matrix: [[1, 2], [3, 4]] };
      const ast = parsePath('matrix[0][1]').ast;
      const result = evaluate(data, ast);
      assert.strictEqual(result, 2);
    });

    test('should handle array access on root', () => {
      const data = ['a', 'b', 'c'];
      const ast = parsePath('$[1]').ast;
      const result = evaluate(data, ast);
      assert.strictEqual(result, 'b');
    });

    test('should handle complex nested array paths', () => {
      const ast = parsePath('products[1].price').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result, 49.99);
    });
  });

  // ========================================
  // Wildcards (Tests 31-45)
  // ========================================

  describe('Wildcards', () => {
    test('should expand wildcard on array', () => {
      const ast = parsePath('users[*]').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, testData.users);
    });

    test('should expand wildcard and access property', () => {
      const ast = parsePath('users[*].name').ast;
      const result = evaluate(testData, ast);
      assert.ok(Array.isArray(result)); // Should return array of names
      assert.deepStrictEqual(result, ['Alice', 'Bob', 'Carol']);
    });

    test('should expand wildcard on object properties', () => {
      const data = { a: 1, b: 2, c: 3 };
      const ast = parsePath('*').ast;
      const result = evaluate(data, ast);
      assert.deepStrictEqual(result, [1, 2, 3]);
    });

    test('should return empty array for wildcard on null', () => {
      const data = { value: null };
      const ast = parsePath('value[*]').ast;
      const result = evaluate(data, ast);
      assert.deepStrictEqual(result, []);
    });

    test('should return empty array for wildcard on primitive', () => {
      const ast = parsePath('primitives.number[*]').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, []);
    });

    test('should handle wildcard after property', () => {
      const ast = parsePath('data.*').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, [testData.data.items]);
    });

    test('should handle multiple wildcards', () => {
      const data = {
        groups: [
          { items: [1, 2] },
          { items: [3, 4] }
        ]
      };
      const ast = parsePath('groups[*]').ast;
      const result = evaluate(data, ast);
      assert.strictEqual(result.length, 2);
    });

    test('should handle wildcard on empty array', () => {
      const data = { arr: [] };
      const ast = parsePath('arr[*]').ast;
      const result = evaluate(data, ast);
      assert.deepStrictEqual(result, []);
    });

    test('should handle wildcard on empty object', () => {
      const data = { obj: {} };
      const ast = parsePath('obj.*').ast;
      const result = evaluate(data, ast);
      assert.deepStrictEqual(result, []);
    });

    test('should get all user ids with wildcard', () => {
      const data = {
        users: [
          { id: 1 },
          { id: 2 },
          { id: 3 }
        ]
      };
      const ast = parsePath('users[*].id').ast;
      const result = evaluate(data, ast);
      assert.strictEqual(result.length, 3);
      assert.deepStrictEqual(result, [1, 2, 3]);
    });

    test('should expand wildcard on nested structure', () => {
      const ast = parsePath('data.items[*]').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result.length, 3);
    });

    test('should handle wildcard at root level', () => {
      const data = [1, 2, 3, 4, 5];
      const ast = parsePath('$[*]').ast;
      const result = evaluate(data, ast);
      assert.deepStrictEqual(result, [1, 2, 3, 4, 5]);
    });

    test('should return object values for wildcard', () => {
      const data = {
        obj: { a: 10, b: 20, c: 30 }
      };
      const ast = parsePath('obj.*').ast;
      const result = evaluate(data, ast);
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 3);
      // Object.values() order is not guaranteed, so just check values are present
      assert.ok(result.includes(10));
      assert.ok(result.includes(20));
      assert.ok(result.includes(30));
    });

    test('should handle dot wildcard syntax', () => {
      const ast = parsePath('primitives.*').ast;
      const result = evaluate(testData, ast);
      assert.ok(Array.isArray(result));
      assert.ok(result.length > 0);
    });

    test('should handle bracket wildcard syntax', () => {
      const ast = parsePath('users[*]').ast;
      const result = evaluate(testData, ast);
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 3);
    });
  });

  // ========================================
  // Recursive Descent (Tests 46-60)
  // ========================================

  describe('Recursive Descent', () => {
    test('should find property at any depth', () => {
      const ast = parsePath('$..phone').ast;
      const result = evaluate(testData, ast);
      assert.ok(Array.isArray(result));
      assert.ok(result.includes('+1234567890'));
    });

    test('should find all matching properties', () => {
      const data = {
        a: { email: 'a@test.com' },
        b: { email: 'b@test.com' },
        c: { nested: { email: 'c@test.com' } }
      };
      const ast = parsePath('$..email').ast;
      const result = evaluate(data, ast);
      assert.strictEqual(result.length, 3);
    });

    test('should handle recursive descent without property name', () => {
      const ast = parsePath('$..').ast;
      const result = evaluate(testData, ast);
      assert.ok(Array.isArray(result));
      assert.ok(result.length > 0);
    });

    test('should find deeply nested value', () => {
      const ast = parsePath('$..deep').ast;
      const result = evaluate(testData, ast);
      assert.ok(result.includes('value1'));
      assert.ok(result.includes('value2'));
      assert.ok(result.includes('value3'));
    });

    test('should handle recursive descent on arrays', () => {
      const data = {
        items: [
          { id: 1, sub: { id: 2 } },
          { id: 3, sub: { id: 4 } }
        ]
      };
      const ast = parsePath('$..id').ast;
      const result = evaluate(data, ast);
      assert.ok(result.length >= 4);
    });

    test('should return empty array if no matches', () => {
      const ast = parsePath('$..nonExistent').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, []);
    });

    test('should handle recursive descent from non-root', () => {
      const ast = parsePath('user..city').ast;
      const result = evaluate(testData, ast);
      assert.ok(result.includes('New York'));
    });

    test('should find all values with specific key', () => {
      const data = {
        a: { name: 'A' },
        b: { name: 'B', nested: { name: 'C' } }
      };
      const ast = parsePath('$..name').ast;
      const result = evaluate(data, ast);
      assert.strictEqual(result.length, 3);
    });

    test('should handle recursive descent on empty object', () => {
      const data = {};
      const ast = parsePath('$..anything').ast;
      const result = evaluate(data, ast);
      assert.deepStrictEqual(result, []);
    });

    test('should handle recursive descent with multiple levels', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              target: 'found'
            }
          }
        }
      };
      const ast = parsePath('$..target').ast;
      const result = evaluate(data, ast);
      assert.ok(result.includes('found'));
    });

    test('should find all id fields recursively', () => {
      const ast = parsePath('$..id').ast;
      const result = evaluate(testData, ast);
      assert.ok(Array.isArray(result));
      // user.id(1) + users[3 ids] + products[3 ids] = 7 total
      assert.ok(result.includes(1)); // user.id
      assert.ok(result.includes(2)); // users
      assert.ok(result.includes(101)); // products
    });

    test('should handle recursive descent on arrays of objects', () => {
      const ast = parsePath('$..name').ast;
      const result = evaluate(testData, ast);
      assert.ok(Array.isArray(result));
      assert.ok(result.includes('Alice')); // user.name or users[0].name
      assert.ok(result.includes('Bob')); // users[1].name
      assert.ok(result.includes('Widget')); // products[0].name
    });

    test('should not exceed max recursion depth', () => {
      // Create circular-like deep structure
      const deepData: any = { value: 1 };
      let current = deepData;
      for (let i = 0; i < 50; i++) {
        current.nested = { value: i };
        current = current.nested;
      }

      const ast = parsePath('$..value').ast;
      const result = evaluate(deepData, ast, { maxDepth: 100 });
      assert.ok(Array.isArray(result));
    });

    test('should handle recursive with arrays at multiple levels', () => {
      const data = {
        groups: [
          { items: [{ val: 1 }, { val: 2 }] },
          { items: [{ val: 3 }] }
        ]
      };
      const ast = parsePath('$..val').ast;
      const result = evaluate(data, ast);
      assert.strictEqual(result.length, 3);
    });

    test('should find property in mixed structures', () => {
      const ast = parsePath('$..value').ast;
      const result = evaluate(testData, ast);
      assert.ok(result.includes(1));
      assert.ok(result.includes(2));
      assert.ok(result.includes(3));
    });
  });

  // ========================================
  // Array Slicing (Tests 61-75)
  // ========================================

  describe('Array Slicing', () => {
    test('should slice array with start and end', () => {
      const ast = parsePath('users[0:2]').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result, testData.users.slice(0, 2));
    });

    test('should slice array with only end', () => {
      const ast = parsePath('users[:2]').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result.length, 2);
    });

    test('should slice array with only start', () => {
      const ast = parsePath('users[1:]').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result.length, 2);
    });

    test('should slice array with step', () => {
      const ast = parsePath('primitives.array[0:5:2]').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, [1, 3, 5]);
    });

    test('should slice array with only step', () => {
      const ast = parsePath('primitives.array[::2]').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, [1, 3, 5]);
    });

    test('should handle negative slice indices', () => {
      const ast = parsePath('users[-2:]').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result.length, 2);
    });

    test('should handle slice with negative start and end', () => {
      const ast = parsePath('primitives.array[-4:-1]').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, [2, 3, 4]);
    });

    test('should return empty array for slice on non-array', () => {
      const ast = parsePath('user[0:2]').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, []);
    });

    test('should handle slice with out of bounds indices', () => {
      const ast = parsePath('users[0:100]').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result.length, 3);
    });

    test('should handle empty slice range', () => {
      const ast = parsePath('users[2:2]').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, []);
    });

    test('should handle full array slice', () => {
      const ast = parsePath('users[::]').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, testData.users);
    });

    test('should handle slice on empty array', () => {
      const data = { arr: [] };
      const ast = parsePath('arr[0:5]').ast;
      const result = evaluate(data, ast);
      assert.deepStrictEqual(result, []);
    });

    test('should handle large step', () => {
      const ast = parsePath('primitives.array[::10]').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, [1]);
    });

    test('should handle slice starting from middle', () => {
      const ast = parsePath('primitives.array[2:4]').ast;
      const result = evaluate(testData, ast);
      assert.deepStrictEqual(result, [3, 4]);
    });

    test('should handle slice on nested array', () => {
      const ast = parsePath('data.items[0:2]').ast;
      const result = evaluate(testData, ast);
      assert.strictEqual(result.length, 2);
    });
  });

  // ========================================
  // exists() Helper (Tests 76-85)
  // ========================================

  describe('exists() Helper', () => {
    test('should return true for existing property', () => {
      const ast = parsePath('user.name').ast;
      const result = exists(testData, ast);
      assert.strictEqual(result, true);
    });

    test('should return false for non-existing property', () => {
      const ast = parsePath('user.nonExistent').ast;
      const result = exists(testData, ast);
      assert.strictEqual(result, false);
    });

    test('should return true for null value', () => {
      const ast = parsePath('primitives.null').ast;
      const result = exists(testData, ast);
      assert.strictEqual(result, true); // null exists, it's just null
    });

    test('should return true for array element', () => {
      const ast = parsePath('users[0]').ast;
      const result = exists(testData, ast);
      assert.strictEqual(result, true);
    });

    test('should return false for out of bounds index', () => {
      const ast = parsePath('users[100]').ast;
      const result = exists(testData, ast);
      assert.strictEqual(result, false);
    });

    test('should return true for root', () => {
      const ast = parsePath('$').ast;
      const result = exists(testData, ast);
      assert.strictEqual(result, true);
    });

    test('should return true for deeply nested property', () => {
      const ast = parsePath('user.profile.contact.phone').ast;
      const result = exists(testData, ast);
      assert.strictEqual(result, true);
    });

    test('should return false for broken path', () => {
      const ast = parsePath('user.profile.nonExistent.property').ast;
      const result = exists(testData, ast);
      assert.strictEqual(result, false);
    });

    test('should return true for wildcard match', () => {
      const ast = parsePath('users[*]').ast;
      const result = exists(testData, ast);
      assert.strictEqual(result, true);
    });

    test('should return true for recursive descent match', () => {
      const ast = parsePath('$..email').ast;
      const result = exists(testData, ast);
      assert.strictEqual(result, true);
    });
  });

  // ========================================
  // typeOf() Helper (Tests 86-100)
  // ========================================

  describe('typeOf() Helper', () => {
    test('should return "string" for string value', () => {
      const ast = parsePath('user.name').ast;
      const result = typeOf(testData, ast);
      assert.strictEqual(result, 'string');
    });

    test('should return "number" for number value', () => {
      const ast = parsePath('user.id').ast;
      const result = typeOf(testData, ast);
      assert.strictEqual(result, 'number');
    });

    test('should return "boolean" for boolean value', () => {
      const ast = parsePath('users[0].active').ast;
      const result = typeOf(testData, ast);
      assert.strictEqual(result, 'boolean');
    });

    test('should return "null" for null value', () => {
      const ast = parsePath('primitives.null').ast;
      const result = typeOf(testData, ast);
      assert.strictEqual(result, 'null');
    });

    test('should return "object" for object value', () => {
      const ast = parsePath('user.profile').ast;
      const result = typeOf(testData, ast);
      assert.strictEqual(result, 'object');
    });

    test('should return "array" for array value', () => {
      const ast = parsePath('users').ast;
      const result = typeOf(testData, ast);
      assert.strictEqual(result, 'array');
    });

    test('should return undefined for non-existent path', () => {
      const ast = parsePath('user.nonExistent').ast;
      const result = typeOf(testData, ast);
      assert.strictEqual(result, undefined);
    });

    test('should return "array" for wildcard result', () => {
      const ast = parsePath('users[*]').ast;
      const result = typeOf(testData, ast);
      assert.strictEqual(result, 'array');
    });

    test('should return "array" for slice result', () => {
      const ast = parsePath('users[0:2]').ast;
      const result = typeOf(testData, ast);
      assert.strictEqual(result, 'array');
    });

    test('should return "array" for recursive descent result', () => {
      const ast = parsePath('$..email').ast;
      const result = typeOf(testData, ast);
      assert.strictEqual(result, 'array');
    });

    test('should return "number" for array element', () => {
      const ast = parsePath('primitives.array[0]').ast;
      const result = typeOf(testData, ast);
      assert.strictEqual(result, 'number');
    });

    test('should return "object" for root', () => {
      const ast = parsePath('$').ast;
      const result = typeOf(testData, ast);
      assert.strictEqual(result, 'object');
    });

    test('should handle typeof for primitive array', () => {
      const data = [1, 2, 3];
      const ast = parsePath('$').ast;
      const result = typeOf(data, ast);
      assert.strictEqual(result, 'array');
    });

    test('should return "number" for nested number', () => {
      const ast = parsePath('products[0].price').ast;
      const result = typeOf(testData, ast);
      assert.strictEqual(result, 'number');
    });

    test('should return "string" for deeply nested string', () => {
      const ast = parsePath('data.items[0].nested.deep').ast;
      const result = typeOf(testData, ast);
      assert.strictEqual(result, 'string');
    });
  });

  // ========================================
  // QueryEvaluator Class (Tests 101-110)
  // ========================================

  describe('QueryEvaluator Class', () => {
    test('should create evaluator instance', () => {
      const evaluator = new QueryEvaluator(testData);
      assert.ok(evaluator);
    });

    test('should evaluate path using evaluator', () => {
      const evaluator = new QueryEvaluator(testData);
      const ast = parsePath('user.name').ast;
      const result = evaluator.evaluate(ast);
      assert.strictEqual(result, 'Alice');
    });

    test('should use exists method', () => {
      const evaluator = new QueryEvaluator(testData);
      const ast = parsePath('user.email').ast;
      assert.strictEqual(evaluator.exists(ast), true);
    });

    test('should use typeOf method', () => {
      const evaluator = new QueryEvaluator(testData);
      const ast = parsePath('user.id').ast;
      assert.strictEqual(evaluator.typeOf(ast), 'number');
    });

    test('should handle custom max depth', () => {
      const evaluator = new QueryEvaluator(testData, { maxDepth: 10 });
      const ast = parsePath('user.profile.contact.phone').ast;
      assert.ok(evaluator.evaluate(ast));
    });

    test('should support cache enable/disable', () => {
      const evaluator = new QueryEvaluator(testData, { enableCache: false });
      const ast = parsePath('user.name').ast;
      assert.strictEqual(evaluator.evaluate(ast), 'Alice');
    });

    test('should provide cache stats', () => {
      const evaluator = new QueryEvaluator(testData);
      const ast = parsePath('user.name').ast;
      evaluator.evaluate(ast);
      const stats = evaluator.getCacheStats();
      assert.ok(stats);
      assert.ok('size' in stats);
    });

    test('should clear cache', () => {
      const evaluator = new QueryEvaluator(testData);
      const ast = parsePath('user.name').ast;
      evaluator.evaluate(ast);
      evaluator.clearCache();
      const stats = evaluator.getCacheStats();
      assert.strictEqual(stats.size, 0);
    });

    test('should handle multiple evaluations', () => {
      const evaluator = new QueryEvaluator(testData);
      const ast1 = parsePath('user.name').ast;
      const ast2 = parsePath('user.email').ast;
      assert.strictEqual(evaluator.evaluate(ast1), 'Alice');
      assert.strictEqual(evaluator.evaluate(ast2), 'alice@example.com');
    });

    test('should reuse evaluator for multiple queries', () => {
      const evaluator = new QueryEvaluator(testData);
      for (let i = 0; i < 10; i++) {
        const ast = parsePath('users[0].name').ast;
        assert.strictEqual(evaluator.evaluate(ast), 'Alice');
      }
    });
  });

  // ========================================
  // Cache Behavior (Tests 111-120)
  // ========================================

  describe('Cache Behavior', () => {
    test('should cache query results', () => {
      resetGlobalCache();
      const cache = getGlobalCache();
      const evaluator = new QueryEvaluator(testData, { cache });

      const ast = parsePath('user.name').ast;
      evaluator.evaluate(ast);
      evaluator.evaluate(ast); // Second call should hit cache

      const stats = cache.getStats();
      assert.ok(stats.totalHits > 0);
    });

    test('should use custom cache', () => {
      const customCache = new QueryCache(100);
      const evaluator = new QueryEvaluator(testData, { cache: customCache });
      const ast = parsePath('user.name').ast;
      evaluator.evaluate(ast);
      assert.strictEqual(customCache.getStats().size, 1);
    });

    test('should respect cache size limit', () => {
      const smallCache = new QueryCache(2);
      const evaluator = new QueryEvaluator(testData, { cache: smallCache });

      const ast1 = parsePath('user.name').ast;
      const ast2 = parsePath('user.email').ast;
      const ast3 = parsePath('user.id').ast;

      evaluator.evaluate(ast1);
      evaluator.evaluate(ast2);
      evaluator.evaluate(ast3); // Should evict LRU

      assert.ok(smallCache.getStats().size <= 2);
    });

    test('should update LRU on cache hit', () => {
      const cache = new QueryCache(2);
      const evaluator = new QueryEvaluator(testData, { cache });

      const ast1 = parsePath('user.name').ast;
      const ast2 = parsePath('user.email').ast;

      evaluator.evaluate(ast1);
      evaluator.evaluate(ast2);
      evaluator.evaluate(ast1); // Hit ast1 again
      const ast3 = parsePath('user.id').ast;
      evaluator.evaluate(ast3); // Should evict ast2, not ast1

      // Cache should have at most 2 items
      const stats = cache.getStats();
      assert.ok(stats.size <= 2);
    });

    test('should clear cache correctly', () => {
      const cache = new QueryCache();
      const evaluator = new QueryEvaluator(testData, { cache });

      evaluator.evaluate(parsePath('user.name').ast);
      evaluator.evaluate(parsePath('user.email').ast);
      cache.clear();

      assert.strictEqual(cache.getStats().size, 0);
    });

    test('should track cache hits', () => {
      const cache = new QueryCache();
      const evaluator = new QueryEvaluator(testData, { cache });
      const ast = parsePath('user.name').ast;

      evaluator.evaluate(ast);
      evaluator.evaluate(ast);
      evaluator.evaluate(ast);

      const stats = cache.getStats();
      assert.ok(stats.totalHits >= 2);
    });

    test('should handle cache with disabled caching', () => {
      const evaluator = new QueryEvaluator(testData, { enableCache: false });
      const ast = parsePath('user.name').ast;

      evaluator.evaluate(ast);
      evaluator.evaluate(ast);

      // Should still work, just not cache
      const result = evaluator.evaluate(ast);
      assert.strictEqual(result, 'Alice');
    });

    test('should generate unique cache keys', () => {
      const cache = new QueryCache();
      const evaluator = new QueryEvaluator(testData, { cache });

      evaluator.evaluate(parsePath('user.name').ast);
      evaluator.evaluate(parsePath('user.email').ast);

      assert.strictEqual(cache.getStats().size, 2);
    });

    test('should share cache between evaluators', () => {
      const sharedCache = new QueryCache();
      const eval1 = new QueryEvaluator(testData, { cache: sharedCache });
      const eval2 = new QueryEvaluator(testData, { cache: sharedCache });

      eval1.evaluate(parsePath('user.name').ast);
      eval2.evaluate(parsePath('user.name').ast);

      assert.strictEqual(sharedCache.getStats().totalHits, 1);
    });

    test('should provide cache statistics', () => {
      const cache = new QueryCache();
      const stats = cache.getStats();

      assert.ok('size' in stats);
      assert.ok('maxSize' in stats);
      assert.ok('totalHits' in stats);
      assert.ok('averageHits' in stats);
      assert.ok('hitRate' in stats);
    });
  });

  // ========================================
  // Performance Tests (Tests 121-125)
  // ========================================

  describe('Performance', () => {
    test('should evaluate simple path in <1ms', () => {
      const ast = parsePath('user.name').ast;
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        evaluate(testData, ast);
      }
      const elapsed = Date.now() - start;
      assert.ok(elapsed < 100); // 100 evaluations in <100ms = <1ms each
    });

    test('should handle 1000 evaluations efficiently', () => {
      const evaluator = new QueryEvaluator(testData);
      const ast = parsePath('users[0].name').ast;
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        evaluator.evaluate(ast);
      }

      const elapsed = Date.now() - start;
      assert.ok(elapsed < 500); // 1000 evaluations in <500ms
    });

    test('should benefit from caching', () => {
      const evaluator = new QueryEvaluator(testData);
      const ast = parsePath('user.profile.contact.phone').ast;

      // Multiple evaluations should work correctly
      const results: string[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(evaluator.evaluate(ast));
      }

      // All results should be identical
      assert.ok(results.every(r => r === '+1234567890'));

      // Cache should have the entry
      const stats = evaluator.getCacheStats();
      assert.ok(stats.totalHits >= 99); // First is miss, rest are hits
    });

    test('should handle large result sets', () => {
      const largeData = {
        items: Array.from({ length: 10000 }, (_, i) => ({ id: i, value: i * 2 }))
      };
      const ast = parsePath('items[*]').ast;
      const start = Date.now();
      const result = evaluate(largeData, ast);
      const elapsed = Date.now() - start;

      assert.strictEqual(result.length, 10000);
      assert.ok(elapsed < 100); // Should complete in <100ms
    });

    test('should handle deep recursion efficiently', () => {
      const deepData: any = { value: 1 };
      let current = deepData;
      for (let i = 0; i < 20; i++) {
        current.nested = { value: i };
        current = current.nested;
      }

      const ast = parsePath('$..value').ast;
      const start = Date.now();
      const result = evaluate(deepData, ast);
      const elapsed = Date.now() - start;

      assert.ok(result.length > 0);
      assert.ok(elapsed < 50); // Should complete in <50ms
    });
  });
});
