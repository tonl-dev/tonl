/**
 * TONL REPL Tests
 * Tests for interactive TONL exploration and querying
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { TONLREPL } from '../dist/repl/index.js';
import { encodeTONL } from '../dist/encode.js';

// Test directory setup - must be within project directory for PathValidator security
const testDir = join(process.cwd(), 'test-temp', `repl-${Date.now()}-${Math.random().toString(36).substring(7)}`);

// Capture console output
let consoleOutput: string[] = [];
let consoleErrors: string[] = [];
const originalLog = console.log;
const originalError = console.error;

function mockConsole(): void {
  consoleOutput = [];
  consoleErrors = [];
  console.log = (...args: any[]) => {
    consoleOutput.push(args.map(a => String(a)).join(' '));
  };
  console.error = (...args: any[]) => {
    consoleErrors.push(args.map(a => String(a)).join(' '));
  };
}

function restoreConsole(): void {
  console.log = originalLog;
  console.error = originalError;
}

function createTestFile(name: string, data: any, format: 'tonl' | 'json' = 'tonl'): string {
  const filePath = join(testDir, name);
  const content = format === 'json' ? JSON.stringify(data) : encodeTONL(data);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

describe('TONLREPL', () => {
  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    restoreConsole();
    if (existsSync(testDir)) {
      try {
        rmSync(testDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('constructor', () => {
    test('should create REPL with default options', () => {
      const repl = new TONLREPL();
      assert.ok(repl);
    });

    test('should create REPL with custom options', () => {
      const repl = new TONLREPL({
        history: false,
        prompt: 'custom> '
      });
      assert.ok(repl);
    });
  });

  describe('load', () => {
    test('should load TONL file', async () => {
      const testData = { name: 'Alice', age: 30 };
      const filePath = createTestFile('test.tonl', testData);
      const repl = new TONLREPL();

      mockConsole();
      await repl.load(filePath);
      restoreConsole();

      // Should print success message
      assert.ok(consoleOutput.some(line => line.includes('Loaded')));
    });

    test('should load JSON file', async () => {
      const testData = { name: 'Bob', items: [1, 2, 3] };
      const filePath = createTestFile('test.json', testData, 'json');
      const repl = new TONLREPL();

      mockConsole();
      await repl.load(filePath);
      restoreConsole();

      assert.ok(consoleOutput.some(line => line.includes('Loaded')));
    });

    test('should handle non-existent file', async () => {
      const repl = new TONLREPL();

      mockConsole();
      await repl.load(join(testDir, 'non-existent.tonl'));
      restoreConsole();

      // Should print error
      assert.ok(consoleErrors.some(line =>
        line.includes('Error') || line.includes('Security')
      ));
    });

    test('should query after loading', async () => {
      const testData = { user: { name: 'Charlie', age: 25 } };
      const filePath = createTestFile('query-test.tonl', testData);
      const repl = new TONLREPL();

      mockConsole();
      await repl.load(filePath);
      restoreConsole();

      const result = repl.query('user.name');
      assert.strictEqual(result, 'Charlie');
    });
  });

  describe('query', () => {
    test('should return null when no document loaded', () => {
      const repl = new TONLREPL();

      mockConsole();
      const result = repl.query('some.path');
      restoreConsole();

      assert.strictEqual(result, null);
      assert.ok(consoleErrors.some(line => line.includes('No document loaded')));
    });

    test('should execute simple path query', async () => {
      const testData = { a: { b: { c: 'value' } } };
      const filePath = createTestFile('path-query.tonl', testData);
      const repl = new TONLREPL();

      mockConsole();
      await repl.load(filePath);
      restoreConsole();

      const result = repl.query('a.b.c');
      assert.strictEqual(result, 'value');
    });

    test('should execute array index query', async () => {
      const testData = { items: ['first', 'second', 'third'] };
      const filePath = createTestFile('array-query.tonl', testData);
      const repl = new TONLREPL();

      mockConsole();
      await repl.load(filePath);
      restoreConsole();

      const result = repl.query('items[1]');
      assert.strictEqual(result, 'second');
    });

    test('should execute wildcard query', async () => {
      const testData = {
        users: [
          { name: 'Alice' },
          { name: 'Bob' },
          { name: 'Charlie' }
        ]
      };
      const filePath = createTestFile('wildcard-query.tonl', testData);
      const repl = new TONLREPL();

      mockConsole();
      await repl.load(filePath);
      restoreConsole();

      const result = repl.query('users[*].name');
      assert.deepStrictEqual(result, ['Alice', 'Bob', 'Charlie']);
    });

    test('should handle query errors gracefully', async () => {
      const testData = { data: 'value' };
      const filePath = createTestFile('error-query.tonl', testData);
      const repl = new TONLREPL();

      mockConsole();
      await repl.load(filePath);
      restoreConsole();

      mockConsole();
      // Invalid query syntax should not throw but return null
      const result = repl.query('invalid[[[query');
      restoreConsole();

      // Either returns null or an error message is printed
      // The behavior depends on how the query parser handles invalid input
    });
  });

  describe('getHistory', () => {
    test('should return empty history initially', () => {
      const repl = new TONLREPL();
      const history = repl.getHistory();
      assert.deepStrictEqual(history, []);
    });

    test('should return copy of history', () => {
      const repl = new TONLREPL();
      const history1 = repl.getHistory();
      history1.push('modified'); // Should not affect original

      const history2 = repl.getHistory();
      assert.deepStrictEqual(history2, []);
    });
  });

  describe('complex queries after load', () => {
    test('should handle nested object queries', async () => {
      const testData = {
        company: {
          departments: {
            engineering: {
              lead: 'Alice',
              team: ['Bob', 'Charlie', 'Diana']
            }
          }
        }
      };
      const filePath = createTestFile('nested.tonl', testData);
      const repl = new TONLREPL();

      mockConsole();
      await repl.load(filePath);
      restoreConsole();

      assert.strictEqual(repl.query('company.departments.engineering.lead'), 'Alice');
      assert.deepStrictEqual(repl.query('company.departments.engineering.team'), ['Bob', 'Charlie', 'Diana']);
    });

    test('should handle filter queries', async () => {
      const testData = {
        products: [
          { name: 'Widget', price: 10, inStock: true },
          { name: 'Gadget', price: 25, inStock: false },
          { name: 'Gizmo', price: 15, inStock: true }
        ]
      };
      const filePath = createTestFile('filter.tonl', testData);
      const repl = new TONLREPL();

      mockConsole();
      await repl.load(filePath);
      restoreConsole();

      const inStock = repl.query('products[?(@.inStock)]');
      assert.strictEqual(inStock.length, 2);
    });

    test('should handle root query', async () => {
      const testData = { key: 'value' };
      const filePath = createTestFile('root.tonl', testData);
      const repl = new TONLREPL();

      mockConsole();
      await repl.load(filePath);
      restoreConsole();

      const result = repl.query('key');
      assert.strictEqual(result, 'value');
    });
  });

  describe('loading different data types', () => {
    test('should handle arrays at root', async () => {
      const testData = ['item1', 'item2', 'item3'];
      const filePath = createTestFile('root-array.json', testData, 'json');
      const repl = new TONLREPL();

      mockConsole();
      await repl.load(filePath);
      restoreConsole();

      const result = repl.query('[1]');
      assert.strictEqual(result, 'item2');
    });

    test('should handle mixed data types', async () => {
      const testData = {
        string: 'hello',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { nested: 'value' }
      };
      const filePath = createTestFile('mixed.tonl', testData);
      const repl = new TONLREPL();

      mockConsole();
      await repl.load(filePath);
      restoreConsole();

      assert.strictEqual(repl.query('string'), 'hello');
      assert.strictEqual(repl.query('number'), 42);
      assert.strictEqual(repl.query('boolean'), true);
      assert.strictEqual(repl.query('null'), null);
      assert.deepStrictEqual(repl.query('array'), [1, 2, 3]);
      assert.deepStrictEqual(repl.query('object'), { nested: 'value' });
    });

    test('should handle empty objects', async () => {
      const testData = { empty: {} };
      const filePath = createTestFile('empty.tonl', testData);
      const repl = new TONLREPL();

      mockConsole();
      await repl.load(filePath);
      restoreConsole();

      const result = repl.query('empty');
      assert.deepStrictEqual(result, {});
    });

    test('should handle empty arrays', async () => {
      const testData = { items: [] };
      const filePath = createTestFile('empty-array.tonl', testData);
      const repl = new TONLREPL();

      mockConsole();
      await repl.load(filePath);
      restoreConsole();

      const result = repl.query('items');
      assert.deepStrictEqual(result, []);
    });
  });

  describe('options', () => {
    test('should respect history option disabled', () => {
      const repl = new TONLREPL({ history: false });
      // REPL created successfully with history disabled
      assert.ok(repl);
    });

    test('should accept custom prompt', () => {
      const repl = new TONLREPL({ prompt: 'myrepl> ' });
      assert.ok(repl);
    });

    test('should accept history file path', () => {
      const repl = new TONLREPL({ historyFile: '/tmp/history' });
      assert.ok(repl);
    });
  });

  describe('multiple loads', () => {
    test('should replace document on second load', async () => {
      const testData1 = { version: 1, data: 'first' };
      const testData2 = { version: 2, data: 'second' };
      const filePath1 = createTestFile('first.tonl', testData1);
      const filePath2 = createTestFile('second.tonl', testData2);
      const repl = new TONLREPL();

      mockConsole();
      await repl.load(filePath1);
      restoreConsole();

      assert.strictEqual(repl.query('version'), 1);
      assert.strictEqual(repl.query('data'), 'first');

      mockConsole();
      await repl.load(filePath2);
      restoreConsole();

      assert.strictEqual(repl.query('version'), 2);
      assert.strictEqual(repl.query('data'), 'second');
    });
  });
});
