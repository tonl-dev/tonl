/**
 * Tests for dictionary encoding optimization
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { DictionaryBuilder, DictionaryDecoder } from '../../dist/optimization/dictionary.js';

describe('DictionaryBuilder', () => {
  describe('analyzeDictionaryCandidates', () => {
    it('should create dictionary for repetitive values', () => {
      const builder = new DictionaryBuilder();
      // Create realistic dataset with sufficient repetition
      const values = [
        'admin', 'admin', 'admin', 'admin', 'admin',  // 5x admin
        'user', 'user', 'user',                        // 3x user
        'editor', 'editor', 'editor'                   // 3x editor
      ];

      const dict = builder.analyzeDictionaryCandidates(values, 'role');

      assert.ok(dict, 'Dictionary should be created');
      assert.strictEqual(dict!.name, 'role');
      assert.ok(dict!.entries.size >= 2, 'Should have at least 2 entries'); // admin and user meet minFrequency
      assert.ok(dict!.totalSavings > 0);
    });

    it('should return null if values are not repetitive enough', () => {
      const builder = new DictionaryBuilder({ minFrequency: 5 });
      const values = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

      const dict = builder.analyzeDictionaryCandidates(values, 'test');

      assert.strictEqual(dict, null);
    });

    it('should return null if savings are below threshold', () => {
      const builder = new DictionaryBuilder({ minSavings: 1000 });
      const values = ['a', 'a', 'a', 'b', 'b', 'b'];

      const dict = builder.analyzeDictionaryCandidates(values, 'test');

      assert.strictEqual(dict, null);
    });

    it('should use numeric encoding for large dictionaries', () => {
      const builder = new DictionaryBuilder();
      const values = Array(100).fill(null).map((_, i) => `value${i % 30}`);

      const dict = builder.analyzeDictionaryCandidates(values, 'test');

      assert.ok(dict);
      assert.strictEqual(dict!.encoding, 'numeric');
    });

    it('should use alpha encoding for small dictionaries', () => {
      const builder = new DictionaryBuilder();
      const values = ['admin', 'user', 'editor'].flatMap(v => Array(10).fill(v));

      const dict = builder.analyzeDictionaryCandidates(values, 'role');

      assert.ok(dict);
      assert.strictEqual(dict!.encoding, 'alpha');
    });

    it('should handle null and undefined values', () => {
      const builder = new DictionaryBuilder({ minFrequency: 2 });
      // Sufficient repetition of non-null values
      const values = [
        'admin', 'admin', 'admin',
        null, null,
        'user', 'user', 'user',
        undefined, undefined
      ];

      const dict = builder.analyzeDictionaryCandidates(values, 'role');

      assert.ok(dict);
      assert.ok(dict!.entries.size >= 2); // admin and user (nulls ignored)
    });

    it('should sort entries by frequency', () => {
      const builder = new DictionaryBuilder();
      const values = [
        ...Array(10).fill('admin'),
        ...Array(5).fill('user'),
        ...Array(3).fill('editor')
      ];

      const dict = builder.analyzeDictionaryCandidates(values, 'role');

      assert.ok(dict);
      const entries = Array.from(dict!.entries.values());
      assert.strictEqual(entries[0].original, 'admin');
      assert.strictEqual(entries[0].frequency, 10);
    });
  });

  describe('encodeWithDictionary', () => {
    it('should encode values using dictionary', () => {
      const builder = new DictionaryBuilder({ minFrequency: 2 });
      const values = ['admin', 'user', 'admin', 'editor', 'user', 'admin'];

      const dict = builder.buildDictionary(values, 'role')!;
      assert.ok(dict, 'Dictionary should be created');

      const encoded = builder.encodeWithDictionary(values, dict);

      assert.ok(Array.isArray(encoded));
      assert.strictEqual(encoded.length, 6);

      // Check that frequent values are encoded (not original strings)
      assert.notStrictEqual(encoded[0], 'admin');
      assert.notStrictEqual(encoded[1], 'user');
    });

    it('should preserve null and undefined', () => {
      const builder = new DictionaryBuilder({ minFrequency: 2 });
      const values = ['admin', null, 'user', undefined, 'admin', 'user'];

      const dict = builder.buildDictionary(
        values.filter(v => v !== null && v !== undefined),
        'role'
      )!;
      assert.ok(dict, 'Dictionary should be created');

      const encoded = builder.encodeWithDictionary(values, dict);

      assert.strictEqual(encoded[1], null);
      assert.strictEqual(encoded[3], undefined);
    });

    it('should keep values that are not in dictionary', () => {
      const builder = new DictionaryBuilder({ minFrequency: 2 });
      const dictValues = ['admin', 'admin', 'admin', 'user', 'user', 'user'];
      const testValues = ['admin', 'guest', 'user'];

      const dict = builder.buildDictionary(dictValues, 'role')!;
      assert.ok(dict, 'Dictionary should be created');

      const encoded = builder.encodeWithDictionary(testValues, dict);

      assert.notStrictEqual(encoded[0], 'admin'); // Should be encoded
      assert.strictEqual(encoded[1], 'guest'); // Not in dict, kept as-is
      assert.notStrictEqual(encoded[2], 'user'); // Should be encoded
    });
  });

  describe('generateDictionaryDirective', () => {
    it('should generate valid TONL directive', () => {
      const builder = new DictionaryBuilder({ minFrequency: 2 });
      const values = ['admin', 'admin', 'admin', 'user', 'user', 'user', 'editor', 'editor', 'editor'];

      const dict = builder.buildDictionary(values, 'role')!;
      assert.ok(dict, 'Dictionary should be created');

      const directive = builder.generateDictionaryDirective(dict);

      assert.ok(directive.startsWith('@dict role:'));
      assert.ok(directive.includes('{'));
      assert.ok(directive.includes('}'));
      assert.ok(directive.includes('admin'));
      // user and editor should also be present
    });

    it('should quote values with special characters', () => {
      const builder = new DictionaryBuilder({ minFrequency: 2, minSavings: 5 });
      const values = ['admin,root', 'admin,root', 'admin,root', 'user:basic', 'user:basic', 'user:basic'];

      const dict = builder.buildDictionary(values, 'role')!;
      assert.ok(dict, 'Dictionary should be created');

      const directive = builder.generateDictionaryDirective(dict);

      // Values with comma or colon should be quoted
      assert.ok(directive.includes('"admin,root"') || directive.includes('"admin\\,root"'));
    });

    it('should use alpha encoding when appropriate', () => {
      const builder = new DictionaryBuilder({ encodingStrategy: 'alpha' });
      const values = ['admin', 'user', 'editor'].flatMap(v => Array(5).fill(v));

      const dict = builder.buildDictionary(values, 'role')!;
      const directive = builder.generateDictionaryDirective(dict);

      // Should use A, B, C encoding
      assert.ok(directive.match(/[A-C]:/));
    });
  });

  describe('analyzeAllColumns', () => {
    it('should analyze multiple columns', () => {
      const builder = new DictionaryBuilder({ minFrequency: 2, minSavings: 5 });
      const data = [
        { role: 'admin', status: 'active' },
        { role: 'user', status: 'active' },
        { role: 'admin', status: 'inactive' },
        { role: 'editor', status: 'active' },
        { role: 'admin', status: 'active' },
        { role: 'user', status: 'inactive' },
        { role: 'editor', status: 'active' },
        { role: 'admin', status: 'inactive' }
      ];

      const dicts = builder.analyzeAllColumns(data, ['role', 'status']);

      assert.ok(dicts.has('role'));
      assert.ok(dicts.has('status'));

      const roleDict = dicts.get('role')!;
      assert.ok(roleDict.entries.size >= 1);  // At least admin meets threshold

      const statusDict = dicts.get('status')!;
      assert.ok(statusDict.entries.size >= 1);  // active meets threshold
    });

    it('should skip columns without sufficient repetition', () => {
      const builder = new DictionaryBuilder({ minFrequency: 5 });
      const data = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Carol' }
      ];

      const dicts = builder.analyzeAllColumns(data, ['id', 'name']);

      // Neither column has values that repeat 5+ times
      assert.strictEqual(dicts.size, 0);
    });
  });
});

describe('DictionaryDecoder', () => {
  describe('parseDictionaryDirective', () => {
    it('should parse simple dictionary directive', () => {
      const decoder = new DictionaryDecoder();

      decoder.parseDictionaryDirective('@dict role: {1:admin,2:user,3:editor}');

      assert.ok(decoder.hasDictionary('role'));
      assert.strictEqual(decoder.decode('role', '1'), 'admin');
      assert.strictEqual(decoder.decode('role', '2'), 'user');
      assert.strictEqual(decoder.decode('role', '3'), 'editor');
    });

    it('should parse alpha-encoded dictionary', () => {
      const decoder = new DictionaryDecoder();

      decoder.parseDictionaryDirective('@dict status: {A:active,I:inactive,S:suspended}');

      assert.strictEqual(decoder.decode('status', 'A'), 'active');
      assert.strictEqual(decoder.decode('status', 'I'), 'inactive');
      assert.strictEqual(decoder.decode('status', 'S'), 'suspended');
    });

    it('should handle quoted values', () => {
      const decoder = new DictionaryDecoder();

      decoder.parseDictionaryDirective('@dict role: {1:"admin,root",2:"user:basic"}');

      assert.strictEqual(decoder.decode('role', '1'), 'admin,root');
      assert.strictEqual(decoder.decode('role', '2'), 'user:basic');
    });

    it('should handle escaped quotes in values', () => {
      const decoder = new DictionaryDecoder();

      decoder.parseDictionaryDirective('@dict msg: {1:"He said ""hello"""}');

      assert.strictEqual(decoder.decode('msg', '1'), 'He said "hello"');
    });

    it('should throw on invalid directive format', () => {
      const decoder = new DictionaryDecoder();

      assert.throws(() => {
        decoder.parseDictionaryDirective('@dict invalid');
      });

      assert.throws(() => {
        decoder.parseDictionaryDirective('@dict role: invalid');
      });
    });
  });

  describe('decode', () => {
    it('should return original value if no dictionary exists', () => {
      const decoder = new DictionaryDecoder();

      assert.strictEqual(decoder.decode('unknown', '1'), '1');
      assert.strictEqual(decoder.decode('unknown', 'value'), 'value');
    });

    it('should return original value if not in dictionary', () => {
      const decoder = new DictionaryDecoder();

      decoder.parseDictionaryDirective('@dict role: {1:admin,2:user}');

      assert.strictEqual(decoder.decode('role', '3'), '3');
      assert.strictEqual(decoder.decode('role', 'unknown'), 'unknown');
    });

    it('should handle numeric encoded values', () => {
      const decoder = new DictionaryDecoder();

      decoder.parseDictionaryDirective('@dict role: {1:admin,2:user}');

      assert.strictEqual(decoder.decode('role', 1), 'admin');
      assert.strictEqual(decoder.decode('role', 2), 'user');
    });
  });

  describe('getDictionaryColumns', () => {
    it('should return all dictionary column names', () => {
      const decoder = new DictionaryDecoder();

      decoder.parseDictionaryDirective('@dict role: {1:admin}');
      decoder.parseDictionaryDirective('@dict status: {A:active}');

      const columns = decoder.getDictionaryColumns();

      assert.strictEqual(columns.length, 2);
      assert.ok(columns.includes('role'));
      assert.ok(columns.includes('status'));
    });
  });

  describe('clear', () => {
    it('should clear all dictionaries', () => {
      const decoder = new DictionaryDecoder();

      decoder.parseDictionaryDirective('@dict role: {1:admin}');
      decoder.parseDictionaryDirective('@dict status: {A:active}');

      assert.strictEqual(decoder.getDictionaryColumns().length, 2);

      decoder.clear();

      assert.strictEqual(decoder.getDictionaryColumns().length, 0);
      assert.ok(!decoder.hasDictionary('role'));
      assert.ok(!decoder.hasDictionary('status'));
    });
  });
});

describe('Dictionary Integration', () => {
  it('should encode and decode values correctly', () => {
    const builder = new DictionaryBuilder();
    const decoder = new DictionaryDecoder();

    const values = ['admin', 'user', 'admin', 'editor', 'user', 'admin'];

    // Build dictionary
    const dict = builder.buildDictionary(values, 'role')!;

    // Generate directive
    const directive = builder.generateDictionaryDirective(dict);

    // Parse directive in decoder
    decoder.parseDictionaryDirective(directive);

    // Encode values
    const encoded = builder.encodeWithDictionary(values, dict);

    // Decode values
    const decoded = encoded.map(v => decoder.decode('role', v as string));

    // Should match original
    assert.deepStrictEqual(decoded, values);
  });

  it('should handle large datasets efficiently', () => {
    const builder = new DictionaryBuilder();
    const decoder = new DictionaryDecoder();

    // Create large dataset with repetitive values
    const roles = ['admin', 'user', 'editor', 'moderator', 'guest'];
    const values = Array(1000).fill(null).map((_, i) => roles[i % roles.length]);

    // Build dictionary
    const dict = builder.buildDictionary(values, 'role')!;

    assert.ok(dict, 'Dictionary should be created for large dataset');
    assert.ok(dict.totalSavings > 1000, 'Should save significant bytes');

    // Generate and parse directive
    const directive = builder.generateDictionaryDirective(dict);
    decoder.parseDictionaryDirective(directive);

    // Encode and decode
    const encoded = builder.encodeWithDictionary(values, dict);
    const decoded = encoded.map(v => decoder.decode('role', v as string));

    // Verify round-trip
    assert.deepStrictEqual(decoded, values);

    // Verify encoded values are shorter
    const originalSize = values.join('').length;
    const encodedSize = encoded.join('').length;
    assert.ok(encodedSize < originalSize, 'Encoded should be smaller');
  });
});
