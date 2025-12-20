/**
 * Browser Build Tests
 * Tests for browser-safe TONL exports
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

// Import from browser module
import {
  encodeTONL,
  decodeTONL,
  encodeSmart,
  preprocessJSON,
  TONLDocument,
  parseTONLLine,
  parseHeaderLine,
  parseObjectHeader,
  detectDelimiter,
  inferPrimitiveType,
  coerceValue
} from '../dist/browser.js';

describe('Browser Build', () => {
  describe('encodeTONL', () => {
    test('should encode simple object', () => {
      const data = { name: 'Alice', age: 30 };
      const encoded = encodeTONL(data);
      assert.ok(encoded.includes('name'));
      assert.ok(encoded.includes('Alice'));
      assert.ok(encoded.includes('age'));
      assert.ok(encoded.includes('30'));
    });

    test('should encode nested objects', () => {
      const data = { user: { profile: { name: 'Bob' } } };
      const encoded = encodeTONL(data);
      assert.ok(encoded.includes('user'));
      assert.ok(encoded.includes('profile'));
      assert.ok(encoded.includes('Bob'));
    });

    test('should encode arrays', () => {
      const data = { items: [1, 2, 3] };
      const encoded = encodeTONL(data);
      assert.ok(encoded.includes('items'));
    });

    test('should use custom delimiter', () => {
      const data = { items: ['a', 'b', 'c'] };
      const encoded = encodeTONL(data, { delimiter: '|' });
      assert.ok(encoded.includes('|'));
    });
  });

  describe('decodeTONL', () => {
    test('should decode simple TONL', () => {
      const tonl = `@v1.0
name: Alice
age: 30`;
      const decoded = decodeTONL(tonl);
      assert.deepStrictEqual(decoded, { name: 'Alice', age: 30 });
    });

    test('should decode arrays via round-trip', () => {
      // Use encodeTONL to generate correct array format
      const original = { items: [1, 2, 3] };
      const encoded = encodeTONL(original);
      const decoded = decodeTONL(encoded);
      assert.deepStrictEqual(decoded, original);
    });

    test('should handle round-trip', () => {
      const original = { name: 'Charlie', items: [1, 2, 3], nested: { key: 'value' } };
      const encoded = encodeTONL(original);
      const decoded = decodeTONL(encoded);
      assert.deepStrictEqual(decoded, original);
    });
  });

  describe('encodeSmart', () => {
    test('should choose optimal delimiter', () => {
      // Data with commas - should use pipe or other delimiter
      const dataWithCommas = { text: 'hello, world, test' };
      const encoded = encodeSmart(dataWithCommas);
      assert.ok(encoded.length > 0);
    });

    test('should accept custom options', () => {
      const data = { name: 'Test' };
      const encoded = encodeSmart(data, { delimiter: '|' });
      assert.ok(encoded.includes('|'));
    });

    test('should use smart delimiter selection', () => {
      // Data with pipes - should use comma or other delimiter
      const dataWithPipes = { text: 'value|other|test' };
      const encoded = encodeSmart(dataWithPipes);
      assert.ok(encoded.length > 0);
    });
  });

  describe('preprocessJSON', () => {
    test('should transform hash key', () => {
      const json = '{"#": "value"}';
      const result = preprocessJSON(json);
      assert.strictEqual(result.hash_key, 'value');
    });

    test('should transform empty key', () => {
      const json = '{"": "value"}';
      const result = preprocessJSON(json);
      assert.strictEqual(result.empty_key, 'value');
    });

    test('should transform @ in keys', () => {
      const json = '{"email@domain": "value"}';
      const result = preprocessJSON(json);
      assert.strictEqual(result['email_at_domain'], 'value');
    });

    test('should transform : in keys', () => {
      const json = '{"key:name": "value"}';
      const result = preprocessJSON(json);
      assert.strictEqual(result['key_colon_name'], 'value');
    });

    test('should transform . in keys', () => {
      const json = '{"key.name": "value"}';
      const result = preprocessJSON(json);
      assert.strictEqual(result['key_dot_name'], 'value');
    });

    test('should transform space in keys', () => {
      const json = '{"key name": "value"}';
      const result = preprocessJSON(json);
      assert.strictEqual(result['key_space_name'], 'value');
    });

    test('should transform $ in keys', () => {
      const json = '{"$key": "value"}';
      const result = preprocessJSON(json);
      assert.strictEqual(result['_dollar_key'], 'value');
    });

    test('should handle nested objects', () => {
      const json = '{"outer": {"#": "value"}}';
      const result = preprocessJSON(json);
      assert.strictEqual(result.outer.hash_key, 'value');
    });

    test('should handle arrays', () => {
      const json = '[{"#": "value1"}, {"#": "value2"}]';
      const result = preprocessJSON(json);
      assert.strictEqual(result[0].hash_key, 'value1');
      assert.strictEqual(result[1].hash_key, 'value2');
    });

    test('should throw on invalid JSON', () => {
      assert.throws(() => preprocessJSON('invalid json'), /Invalid JSON/);
    });
  });

  describe('TONLDocumentBrowser', () => {
    describe('parse', () => {
      test('should parse TONL text', () => {
        const tonl = `@v1.0
name: Alice
age: 30`;
        const doc = TONLDocument.parse(tonl);
        assert.strictEqual(doc.get('name'), 'Alice');
        assert.strictEqual(doc.get('age'), 30);
      });
    });

    describe('fromJSON', () => {
      test('should create document from JSON object', () => {
        const data = { user: { name: 'Bob' } };
        const doc = TONLDocument.fromJSON(data);
        assert.strictEqual(doc.get('user.name'), 'Bob');
      });
    });

    describe('query methods', () => {
      test('should get value by path', () => {
        const doc = TONLDocument.fromJSON({ a: { b: { c: 'value' } } });
        assert.strictEqual(doc.get('a.b.c'), 'value');
      });

      test('should query value', () => {
        const doc = TONLDocument.fromJSON({ items: [1, 2, 3] });
        assert.strictEqual(doc.query('items[1]'), 2);
      });

      test('should check existence', () => {
        const doc = TONLDocument.fromJSON({ key: 'value' });
        assert.strictEqual(doc.exists('key'), true);
        assert.strictEqual(doc.exists('nonexistent'), false);
      });

      test('should get type', () => {
        const doc = TONLDocument.fromJSON({ num: 42, str: 'hello', arr: [] });
        assert.strictEqual(doc.typeOf('num'), 'number');
        assert.strictEqual(doc.typeOf('str'), 'string');
        assert.strictEqual(doc.typeOf('arr'), 'array');
      });
    });

    describe('navigation methods', () => {
      test('should iterate entries', () => {
        const doc = TONLDocument.fromJSON({ a: 1, b: 2 });
        const entries = Array.from(doc.entries());
        assert.strictEqual(entries.length, 2);
      });

      test('should iterate keys', () => {
        const doc = TONLDocument.fromJSON({ a: 1, b: 2 });
        const keys = Array.from(doc.keys());
        assert.deepStrictEqual(keys.sort(), ['a', 'b']);
      });

      test('should iterate values', () => {
        const doc = TONLDocument.fromJSON({ a: 1, b: 2 });
        const values = Array.from(doc.values());
        assert.deepStrictEqual(values.sort(), [1, 2]);
      });

      test('should walk tree', () => {
        const doc = TONLDocument.fromJSON({ a: { b: 1 } });
        const paths: string[] = [];
        doc.walk((path) => paths.push(path));
        assert.ok(paths.includes('a'));
        assert.ok(paths.includes('a.b'));
      });

      test('should count nodes', () => {
        const doc = TONLDocument.fromJSON({ a: 1, b: 2, c: { d: 3 } });
        const count = doc.countNodes();
        assert.ok(count >= 4);
      });

      test('should find matching value', () => {
        const doc = TONLDocument.fromJSON({ items: [1, 42, 3] });
        // find() returns the value directly, not [path, value]
        const found = doc.find((v) => v === 42);
        assert.strictEqual(found, 42);
      });

      test('should find all matching values', () => {
        const doc = TONLDocument.fromJSON({ a: 1, b: 1, c: 2 });
        const found = doc.findAll((v) => v === 1);
        assert.strictEqual(found.length, 2);
      });

      test('should check some', () => {
        const doc = TONLDocument.fromJSON({ a: 1, b: 2 });
        assert.strictEqual(doc.some((v) => v === 2), true);
        assert.strictEqual(doc.some((v) => v === 99), false);
      });

      test('should check every', () => {
        const doc = TONLDocument.fromJSON({ a: 1, b: 1 });
        assert.strictEqual(doc.every((v) => v === 1), true);
      });
    });

    describe('export methods', () => {
      test('should export to JSON', () => {
        const original = { key: 'value' };
        const doc = TONLDocument.fromJSON(original);
        assert.deepStrictEqual(doc.toJSON(), original);
      });

      test('should export to TONL', () => {
        const doc = TONLDocument.fromJSON({ key: 'value' });
        const tonl = doc.toTONL();
        assert.ok(tonl.includes('key'));
        assert.ok(tonl.includes('value'));
      });

      test('should get stats', () => {
        const doc = TONLDocument.fromJSON({ a: 1, b: [1, 2, 3] });
        const stats = doc.stats();
        assert.ok(stats.nodeCount > 0);
        assert.ok(stats.sizeBytes > 0);
      });
    });

    describe('modification methods', () => {
      test('should set value', () => {
        const doc = TONLDocument.fromJSON({ key: 'old' });
        doc.set('key', 'new');
        assert.strictEqual(doc.get('key'), 'new');
      });

      test('should delete value', () => {
        const doc = TONLDocument.fromJSON({ a: 1, b: 2 });
        doc.delete('a');
        assert.strictEqual(doc.exists('a'), false);
      });

      test('should push to array', () => {
        const doc = TONLDocument.fromJSON({ items: [1, 2] });
        doc.push('items', 3);
        assert.deepStrictEqual(doc.get('items'), [1, 2, 3]);
      });

      test('should pop from array', () => {
        const doc = TONLDocument.fromJSON({ items: [1, 2, 3] });
        const popped = doc.pop('items');
        assert.strictEqual(popped, 3);
        assert.deepStrictEqual(doc.get('items'), [1, 2]);
      });

      test('should merge objects', () => {
        const doc = TONLDocument.fromJSON({ user: { name: 'Alice' } });
        doc.merge('user', { age: 30 });
        assert.strictEqual(doc.get('user.name'), 'Alice');
        assert.strictEqual(doc.get('user.age'), 30);
      });
    });

    describe('change tracking', () => {
      test('should create snapshot', () => {
        const doc = TONLDocument.fromJSON({ key: 'value' });
        const snapshot = doc.snapshot();
        doc.set('key', 'modified');
        assert.strictEqual(snapshot.get('key'), 'value');
        assert.strictEqual(doc.get('key'), 'modified');
      });

      test('should diff documents', () => {
        const doc1 = TONLDocument.fromJSON({ a: 1, b: 2 });
        const doc2 = TONLDocument.fromJSON({ a: 1, b: 3 });
        const diff = doc1.diff(doc2);
        assert.ok(diff);
      });
    });

    describe('indexing', () => {
      test('should create index', () => {
        const doc = TONLDocument.fromJSON({
          users: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' }
          ]
        });
        const index = doc.createIndex({ name: 'user-id', fields: ['users[*].id'] });
        assert.ok(index);
      });

      test('should list indices', () => {
        const doc = TONLDocument.fromJSON({ data: 'value' });
        doc.createIndex({ name: 'test-index', fields: ['data'] });
        const indices = doc.listIndices();
        assert.ok(indices.includes('test-index'));
      });

      test('should drop index', () => {
        const doc = TONLDocument.fromJSON({ data: 'value' });
        doc.createIndex({ name: 'drop-me', fields: ['data'] });
        const dropped = doc.dropIndex('drop-me');
        assert.strictEqual(dropped, true);
        assert.ok(!doc.listIndices().includes('drop-me'));
      });
    });
  });

  describe('parser utilities', () => {
    test('parseTONLLine should parse line with comma delimiter', () => {
      const result = parseTONLLine('a, b, c', ',');
      // parseTONLLine returns trimmed values
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 3);
    });

    test('parseTONLLine should parse line with pipe delimiter', () => {
      const result = parseTONLLine('a|b|c', '|');
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 3);
    });

    test('parseHeaderLine should parse directive lines', () => {
      // parseHeaderLine expects #directive format like #version 1.0
      const result = parseHeaderLine('#version 1.0');
      assert.ok(result);
      assert.strictEqual(result.key, 'version');
      assert.strictEqual(result.value, '1.0');
    });

    test('parseObjectHeader should parse object header format', () => {
      // parseObjectHeader expects object header like "users{}:" or "users[2]{name}:"
      const result = parseObjectHeader('users{}:');
      assert.ok(result);
      assert.strictEqual(result.key, 'users');
    });

    test('detectDelimiter should detect comma from content', () => {
      // detectDelimiter takes a single string content
      const result = detectDelimiter('name, age, active\nAlice, 30, true');
      assert.strictEqual(result, ',');
    });

    test('detectDelimiter should detect pipe from content', () => {
      const result = detectDelimiter('name|age|active\nBob|25|false');
      assert.strictEqual(result, '|');
    });
  });

  describe('infer utilities', () => {
    // Note: inferPrimitiveType takes JavaScript values, not strings
    // Returns TONL type hints: 'str', 'bool', 'u32', 'i32', 'f64', 'null', 'list', 'obj'

    test('inferPrimitiveType should infer string from JS string', () => {
      assert.strictEqual(inferPrimitiveType('hello'), 'str');
    });

    test('inferPrimitiveType should infer number from JS number', () => {
      assert.strictEqual(inferPrimitiveType(42), 'u32');
      assert.strictEqual(inferPrimitiveType(-10), 'i32');
      assert.strictEqual(inferPrimitiveType(3.14), 'f64');
    });

    test('inferPrimitiveType should infer boolean from JS boolean', () => {
      assert.strictEqual(inferPrimitiveType(true), 'bool');
      assert.strictEqual(inferPrimitiveType(false), 'bool');
    });

    test('inferPrimitiveType should infer null from JS null', () => {
      assert.strictEqual(inferPrimitiveType(null), 'null');
    });

    test('inferPrimitiveType should infer list from JS array', () => {
      assert.strictEqual(inferPrimitiveType([1, 2, 3]), 'list');
    });

    test('inferPrimitiveType should infer obj from JS object', () => {
      assert.strictEqual(inferPrimitiveType({ key: 'value' }), 'obj');
    });

    // coerceValue takes a string value and a TONL type hint ('str', 'bool', 'u32', etc.)
    test('coerceValue should coerce to u32', () => {
      assert.strictEqual(coerceValue('42', 'u32'), 42);
    });

    test('coerceValue should coerce to bool', () => {
      assert.strictEqual(coerceValue('true', 'bool'), true);
      assert.strictEqual(coerceValue('false', 'bool'), false);
    });

    test('coerceValue should coerce to null', () => {
      assert.strictEqual(coerceValue('null', 'null'), null);
    });

    test('coerceValue should coerce to f64', () => {
      assert.strictEqual(coerceValue('3.14', 'f64'), 3.14);
    });

    test('coerceValue should return string for str type', () => {
      assert.strictEqual(coerceValue('hello', 'str'), 'hello');
    });
  });
});
