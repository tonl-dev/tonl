/**
 * README Examples Validation (Task 020)
 *
 * This test file validates that code examples in README.md work correctly.
 * If any example breaks due to API changes, these tests will fail, alerting
 * developers to update the documentation.
 *
 * Coverage:
 * - Basic Usage examples (lines 90-161)
 * - Format examples (encoding/decoding)
 * - API Reference examples (TONLDocument, encode/decode, schema, streaming)
 * - Use case examples (LLM prompts, config files)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TONLDocument, encodeTONL, decodeTONL, encodeSmart } from '../dist/index.js';

describe('README Examples Validation', () => {

  describe('Basic Usage Examples (Quick Start)', () => {

    it('TONLDocument.fromJSON creates document from data', () => {
      // From README: Create from JSON
      const doc = TONLDocument.fromJSON({
        users: [
          { id: 1, name: "Alice", role: "admin", age: 30 },
          { id: 2, name: "Bob", role: "user", age: 25 }
        ]
      });

      assert.ok(doc instanceof TONLDocument, 'Should create TONLDocument instance');
      assert.ok(doc.toJSON().users, 'Should have users array');
      assert.strictEqual(doc.toJSON().users.length, 2, 'Should have 2 users');
    });

    it('doc.get() retrieves single values', () => {
      const doc = TONLDocument.fromJSON({
        users: [
          { id: 1, name: "Alice", role: "admin", age: 30 },
          { id: 2, name: "Bob", role: "user", age: 25 }
        ]
      });

      // From README: Query with JSONPath-like syntax
      const name = doc.get('users[0].name');
      assert.strictEqual(name, 'Alice', 'Should get first user name');
    });

    it('doc.query() retrieves multiple values', () => {
      const doc = TONLDocument.fromJSON({
        users: [
          { id: 1, name: "Alice", role: "admin", age: 30 },
          { id: 2, name: "Bob", role: "user", age: 25 }
        ]
      });

      // From README: doc.query('users[*].name')
      const names = doc.query('users[*].name');
      assert.deepStrictEqual(names, ['Alice', 'Bob'], 'Should get all user names');
    });

    it('doc.query() with filter expressions', () => {
      const doc = TONLDocument.fromJSON({
        users: [
          { id: 1, name: "Alice", role: "admin", age: 30 },
          { id: 2, name: "Bob", role: "user", age: 25 }
        ]
      });

      // From README: doc.query('users[?(@.role == "admin")]')
      const admins = doc.query('users[?(@.role == "admin")]');
      assert.strictEqual(admins.length, 1, 'Should find one admin');
      assert.strictEqual(admins[0].name, 'Alice', 'Admin should be Alice');
    });

    it('doc.set() modifies data', () => {
      const doc = TONLDocument.fromJSON({
        users: [
          { id: 1, name: "Alice", role: "admin", age: 30 },
          { id: 2, name: "Bob", role: "user", age: 25 }
        ]
      });

      // From README: doc.set('users[0].age', 31)
      doc.set('users[0].age', 31);
      assert.strictEqual(doc.get('users[0].age'), 31, 'Age should be updated');
    });

    it('doc.push() appends to arrays', () => {
      const doc = TONLDocument.fromJSON({
        users: [
          { id: 1, name: "Alice", role: "admin", age: 30 },
          { id: 2, name: "Bob", role: "user", age: 25 }
        ]
      });

      // From README: doc.push('users', { id: 3, name: "Carol", role: "editor", age: 28 })
      doc.push('users', { id: 3, name: "Carol", role: "editor", age: 28 });
      const json = doc.toJSON();
      assert.strictEqual(json.users.length, 3, 'Should have 3 users');
      assert.strictEqual(json.users[2].name, 'Carol', 'Third user should be Carol');
    });

    it('doc.entries() iterates over key-value pairs', () => {
      const doc = TONLDocument.fromJSON({
        name: 'Test',
        value: 42
      });

      // From README: for (const [key, value] of doc.entries())
      const entries: [string, unknown][] = [];
      for (const [key, value] of doc.entries()) {
        entries.push([key, value]);
      }

      assert.ok(entries.length > 0, 'Should have entries');
      assert.ok(entries.some(([k]) => k === 'name'), 'Should have name entry');
    });

    it('doc.walk() traverses the tree', () => {
      const doc = TONLDocument.fromJSON({
        user: {
          name: 'Alice',
          age: 30
        }
      });

      // From README: doc.walk((path, value, depth) => { ... })
      const paths: string[] = [];
      doc.walk((path) => {
        paths.push(path);
      });

      assert.ok(paths.length > 0, 'Should walk through paths');
    });

    it('doc.toTONL() exports as TONL', () => {
      const doc = TONLDocument.fromJSON({
        users: [{ id: 1, name: "Alice" }]
      });

      // From README: const tonl = doc.toTONL()
      const tonl = doc.toTONL();
      assert.ok(typeof tonl === 'string', 'Should return string');
      assert.ok(tonl.includes('Alice'), 'Should contain Alice');
    });

    it('doc.toJSON() exports as JSON object', () => {
      const doc = TONLDocument.fromJSON({
        users: [{ id: 1, name: "Alice" }]
      });

      // From README: const json = doc.toJSON()
      const json = doc.toJSON();
      assert.ok(typeof json === 'object', 'Should return object');
      assert.strictEqual(json.users[0].name, 'Alice', 'Should have Alice');
    });

    it('Classic API encode/decode round-trip', () => {
      // From README: Classic API (encode/decode)
      const data = { users: [{ id: 1, name: "Alice" }] };
      const tonlText = encodeTONL(data);
      const restored = decodeTONL(tonlText);

      assert.strictEqual(restored.users[0].id, 1, 'ID should be preserved');
      assert.strictEqual(restored.users[0].name, 'Alice', 'Name should be preserved');
    });
  });

  describe('Aggregation Examples (v2.4.0)', () => {

    it('doc.count() returns count', () => {
      const doc = TONLDocument.fromJSON({
        users: [
          { id: 1, name: "Alice", role: "admin", age: 30 },
          { id: 2, name: "Bob", role: "user", age: 25 }
        ]
      });

      // From README: doc.count('users[*]')
      const count = doc.count('users[*]');
      assert.strictEqual(count, 2, 'Should count 2 users');
    });

    it('doc.sum() calculates sum', () => {
      const doc = TONLDocument.fromJSON({
        users: [
          { id: 1, name: "Alice", role: "admin", age: 30 },
          { id: 2, name: "Bob", role: "user", age: 25 }
        ]
      });

      // From README: doc.sum('users[*]', 'age')
      const sum = doc.sum('users[*]', 'age');
      assert.strictEqual(sum, 55, 'Sum of ages should be 55');
    });

    it('doc.avg() calculates average', () => {
      const doc = TONLDocument.fromJSON({
        users: [
          { id: 1, name: "Alice", role: "admin", age: 30 },
          { id: 2, name: "Bob", role: "user", age: 25 }
        ]
      });

      // From README: doc.avg('users[*]', 'age')
      const avg = doc.avg('users[*]', 'age');
      assert.strictEqual(avg, 27.5, 'Average age should be 27.5');
    });

    it('doc.groupBy() groups by field', () => {
      const doc = TONLDocument.fromJSON({
        users: [
          { id: 1, name: "Alice", role: "admin", age: 30 },
          { id: 2, name: "Bob", role: "user", age: 25 }
        ]
      });

      // From README: doc.groupBy('users[*]', 'role')
      const grouped = doc.groupBy('users[*]', 'role');
      assert.ok('admin' in grouped, 'Should have admin group');
      assert.ok('user' in grouped, 'Should have user group');
      assert.strictEqual(grouped.admin.length, 1, 'Should have 1 admin');
      assert.strictEqual(grouped.user.length, 1, 'Should have 1 user');
    });

    it('doc.aggregate() provides fluent stats API', () => {
      const doc = TONLDocument.fromJSON({
        users: [
          { id: 1, name: "Alice", role: "admin", age: 30 },
          { id: 2, name: "Bob", role: "user", age: 25 }
        ]
      });

      // From README: doc.aggregate('users[*]').stats('age')
      const stats = doc.aggregate('users[*]').stats('age');
      assert.ok('count' in stats, 'Stats should have count');
      assert.ok('sum' in stats, 'Stats should have sum');
      assert.ok('avg' in stats, 'Stats should have avg');
      assert.ok('min' in stats, 'Stats should have min');
      assert.ok('max' in stats, 'Stats should have max');
    });
  });

  describe('Format Examples', () => {

    it('Arrays of objects encode to tabular format', () => {
      // From README Format Overview: Arrays of Objects
      const data = {
        users: [
          { id: 1, name: "Alice", role: "admin" },
          { id: 2, name: "Bob, Jr.", role: "user" },
          { id: 3, name: "Carol", role: "editor" }
        ]
      };

      const tonl = encodeTONL(data);
      assert.ok(tonl.includes('users'), 'Should include users key');
      assert.ok(tonl.includes('Alice'), 'Should include Alice');
      assert.ok(tonl.includes('Bob'), 'Should include Bob');
      assert.ok(tonl.includes('Carol'), 'Should include Carol');
    });

    it('Nested objects encode correctly', () => {
      // From README Format Overview: Nested Objects
      const data = {
        user: {
          id: 1,
          name: "Alice",
          contact: {
            email: "alice@example.com",
            phone: "+123456789"
          },
          roles: ["admin", "editor"]
        }
      };

      const tonl = encodeTONL(data);
      const restored = decodeTONL(tonl);

      assert.strictEqual(restored.user.id, 1);
      assert.strictEqual(restored.user.name, 'Alice');
      assert.strictEqual(restored.user.contact.email, 'alice@example.com');
      assert.strictEqual(restored.user.contact.phone, '+123456789');
      assert.deepStrictEqual(restored.user.roles, ['admin', 'editor']);
    });
  });

  describe('Use Case Examples', () => {

    it('LLM Prompts use case', () => {
      // From README Use Cases: LLM Prompts
      const doc = TONLDocument.fromJSON({
        users: [{ id: 1, name: "Alice" }]
      });

      const prompt = `Analyze this user data:\n${doc.toTONL()}`;
      assert.ok(prompt.includes('Analyze'), 'Should have prompt text');
      assert.ok(prompt.includes('Alice'), 'Should include user data');
    });

    it('Configuration files use case', () => {
      // Similar to README Use Cases: Configuration Files
      const config = {
        env: 'production',
        database: {
          host: 'db.example.com',
          port: 5432,
          ssl: true
        },
        features: ['auth', 'analytics', 'caching']
      };

      const tonl = encodeTONL(config);
      const restored = decodeTONL(tonl);

      assert.strictEqual(restored.env, 'production');
      assert.strictEqual(restored.database.host, 'db.example.com');
      assert.strictEqual(restored.database.port, 5432);
      assert.strictEqual(restored.database.ssl, true);
      assert.deepStrictEqual(restored.features, ['auth', 'analytics', 'caching']);
    });
  });

  describe('API Reference Examples', () => {

    it('TONLDocument.fromJSON() creation', () => {
      // From README API Reference
      const doc = TONLDocument.fromJSON({ test: 'data' });
      assert.ok(doc instanceof TONLDocument);
    });

    it('TONLDocument.parse() creation', () => {
      // From README API Reference
      const tonl = `#version 1.0
name: Alice
age: 30`;
      const doc = TONLDocument.parse(tonl);
      assert.strictEqual(doc.get('name'), 'Alice');
      assert.strictEqual(doc.get('age'), 30);
    });

    it('doc.exists() checks existence', () => {
      const doc = TONLDocument.fromJSON({ name: 'Alice' });

      // From README API Reference
      assert.strictEqual(doc.exists('name'), true);
      assert.strictEqual(doc.exists('nonexistent'), false);
    });

    it('doc.delete() removes values', () => {
      const doc = TONLDocument.fromJSON({ name: 'Alice', age: 30 });

      // From README API Reference
      doc.delete('age');
      assert.strictEqual(doc.exists('age'), false);
    });

    it('doc.pop() removes last array element', () => {
      const doc = TONLDocument.fromJSON({ items: [1, 2, 3] });

      // From README API Reference
      const popped = doc.pop('items');
      assert.strictEqual(popped, 3);
      assert.deepStrictEqual(doc.get('items'), [1, 2]);
    });

    it('doc.merge() deep merges objects', () => {
      const doc = TONLDocument.fromJSON({
        user: { name: 'Alice', age: 30 }
      });

      // From README API Reference
      doc.merge('user', { role: 'admin' });
      const user = doc.get('user') as { name: string; age: number; role: string };
      assert.strictEqual(user.name, 'Alice');
      assert.strictEqual(user.role, 'admin');
    });

    it('doc.keys() returns key iterator', () => {
      const doc = TONLDocument.fromJSON({ a: 1, b: 2 });

      // From README API Reference
      const keys: string[] = [];
      for (const key of doc.keys()) {
        keys.push(key);
      }

      assert.ok(keys.includes('a'));
      assert.ok(keys.includes('b'));
    });

    it('doc.values() returns value iterator', () => {
      const doc = TONLDocument.fromJSON({ a: 1, b: 2 });

      // From README API Reference
      const values: unknown[] = [];
      for (const value of doc.values()) {
        values.push(value);
      }

      assert.ok(values.includes(1));
      assert.ok(values.includes(2));
    });

    it('doc.find() finds single value', () => {
      const doc = TONLDocument.fromJSON({
        items: [
          { id: 1, name: 'one' },
          { id: 2, name: 'two' }
        ]
      });

      // From README API Reference
      const found = doc.find((value) =>
        typeof value === 'object' && value !== null && 'id' in value && (value as { id: number }).id === 2
      );
      assert.ok(found);
    });

    it('doc.some() checks if any match', () => {
      const doc = TONLDocument.fromJSON({
        items: [{ active: false }, { active: true }]
      });

      // From README API Reference
      const hasActive = doc.some((value) =>
        typeof value === 'object' && value !== null && 'active' in value && (value as { active: boolean }).active === true
      );
      assert.strictEqual(hasActive, true);
    });

    it('doc.every() checks if all match', () => {
      const doc = TONLDocument.fromJSON({
        numbers: [2, 4, 6]
      });

      // From README API Reference
      const allEven = doc.every((value) =>
        typeof value !== 'number' || value % 2 === 0
      );
      assert.strictEqual(allEven, true);
    });

    it('doc.size() returns size in bytes', () => {
      const doc = TONLDocument.fromJSON({ test: 'data' });

      // From README API Reference
      const size = doc.size();
      assert.ok(typeof size === 'number');
      assert.ok(size > 0);
    });

    it('doc.stats() returns statistics', () => {
      const doc = TONLDocument.fromJSON({ test: 'data' });

      // From README API Reference
      const stats = doc.stats();
      assert.ok(typeof stats === 'object');
    });

    it('doc.createIndex() creates index', () => {
      const doc = TONLDocument.fromJSON({
        users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
      });

      // From README API Reference
      doc.createIndex('userById', 'users[*].id', 'hash');
      assert.ok(doc.getIndex('userById'));
    });

    it('doc.dropIndex() removes index', () => {
      const doc = TONLDocument.fromJSON({
        users: [{ id: 1, name: 'Alice' }]
      });

      // From README API Reference
      doc.createIndex('userById', 'users[*].id', 'hash');
      doc.dropIndex('userById');
      assert.strictEqual(doc.getIndex('userById'), undefined);
    });
  });

  describe('Encode/Decode API Examples', () => {

    it('encodeTONL with default options', () => {
      const data = { hello: 'world' };
      const tonl = encodeTONL(data);
      assert.ok(typeof tonl === 'string');
      assert.ok(tonl.includes('hello'));
    });

    it('encodeTONL with custom delimiter', () => {
      // From README API Reference
      const data = { items: [{ a: 1, b: 2 }] };
      const tonl = encodeTONL(data, { delimiter: '|' });
      assert.ok(typeof tonl === 'string');
    });

    it('encodeTONL with type hints', () => {
      // From README API Reference
      const data = { items: [{ id: 1, name: 'test' }] };
      const tonl = encodeTONL(data, { includeTypes: true });
      assert.ok(typeof tonl === 'string');
    });

    it('encodeSmart auto-optimizes', () => {
      // From README API Reference
      const data = { users: [{ id: 1, name: 'Alice' }] };
      const tonl = encodeSmart(data);
      assert.ok(typeof tonl === 'string');
      assert.ok(tonl.includes('Alice'));
    });

    it('decodeTONL parses TONL text', () => {
      // From README API Reference
      const tonl = `name: Alice
age: 30`;
      const data = decodeTONL(tonl);
      assert.strictEqual(data.name, 'Alice');
      assert.strictEqual(data.age, 30);
    });

    it('decodeTONL with strict mode', () => {
      // From README API Reference
      const tonl = `name: Alice`;
      const data = decodeTONL(tonl, { strict: false });
      assert.strictEqual(data.name, 'Alice');
    });
  });

  describe('Round-trip Integrity', () => {

    it('Complex nested data round-trips correctly', () => {
      const original = {
        config: {
          database: {
            host: 'localhost',
            port: 5432,
            credentials: {
              username: 'admin',
              password: 'secret'
            }
          },
          features: ['auth', 'logging', 'caching'],
          limits: {
            maxConnections: 100,
            timeout: 30000
          }
        },
        users: [
          { id: 1, name: 'Alice', active: true },
          { id: 2, name: 'Bob', active: false }
        ]
      };

      const tonl = encodeTONL(original);
      const restored = decodeTONL(tonl);

      assert.deepStrictEqual(
        JSON.parse(JSON.stringify(restored)),
        JSON.parse(JSON.stringify(original)),
        'Data should round-trip perfectly'
      );
    });

    it('Special characters round-trip correctly', () => {
      const original = {
        name: 'Bob, Jr.',
        description: 'Contains: colons',
        path: 'C:\\Users\\test',
        unicode: '日本語テスト'
      };

      const tonl = encodeTONL(original);
      const restored = decodeTONL(tonl);

      assert.strictEqual(restored.name, original.name);
      assert.strictEqual(restored.description, original.description);
      assert.strictEqual(restored.unicode, original.unicode);
    });
  });
});
