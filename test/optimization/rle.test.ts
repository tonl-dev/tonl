/**
 * Tests for run-length encoding optimization
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { RunLengthEncoder, RunLengthDecoder } from '../../dist/optimization/rle.js';

describe('RunLengthEncoder', () => {
  describe('analyzeSequence', () => {
    it('should detect repetitive runs', () => {
      const encoder = new RunLengthEncoder();
      const values = ['active', 'active', 'active', 'inactive', 'inactive', 'inactive', 'inactive'];

      const analysis = encoder.analyzeSequence(values);

      assert.strictEqual(analysis.totalRuns, 2);
      assert.ok(analysis.avgRunLength >= 3);
      assert.strictEqual(analysis.maxRunLength, 4);
      assert.ok(analysis.recommended);
    });

    it('should handle no repetition', () => {
      const encoder = new RunLengthEncoder();
      const values = ['a', 'b', 'c', 'd', 'e'];

      const analysis = encoder.analyzeSequence(values);

      assert.strictEqual(analysis.totalRuns, 5);
      assert.strictEqual(analysis.avgRunLength, 1);
      assert.strictEqual(analysis.maxRunLength, 1);
      assert.strictEqual(analysis.recommended, false);
    });

    it('should handle uniform values', () => {
      const encoder = new RunLengthEncoder();
      const values = Array(100).fill('active');

      const analysis = encoder.analyzeSequence(values);

      assert.strictEqual(analysis.totalRuns, 1);
      assert.strictEqual(analysis.avgRunLength, 100);
      assert.strictEqual(analysis.maxRunLength, 100);
      assert.ok(analysis.recommended);
      assert.ok(analysis.compressionRatio > 0.8); // Very high compression
    });

    it('should calculate compression ratio', () => {
      const encoder = new RunLengthEncoder();
      const values = ['yes', 'yes', 'yes', 'yes', 'yes']; // "yes*5" vs "yes,yes,yes,yes,yes"

      const analysis = encoder.analyzeSequence(values);

      // Original: 3+3+3+3+3 = 15 bytes
      // Encoded: 3+1+1 = 5 bytes
      // Ratio: ~67% compression
      assert.ok(analysis.compressionRatio > 0.5);
      assert.ok(analysis.savings > 5);
    });

    it('should handle empty array', () => {
      const encoder = new RunLengthEncoder();

      const analysis = encoder.analyzeSequence([]);

      assert.strictEqual(analysis.totalRuns, 0);
      assert.strictEqual(analysis.recommended, false);
    });

    it('should handle single value', () => {
      const encoder = new RunLengthEncoder();

      const analysis = encoder.analyzeSequence(['active']);

      assert.strictEqual(analysis.totalRuns, 1);
      assert.strictEqual(analysis.avgRunLength, 1);
    });

    it('should handle mixed run lengths', () => {
      const encoder = new RunLengthEncoder();
      const values = ['a', 'a', 'b', 'b', 'b', 'b', 'c', 'd', 'd', 'd'];

      const analysis = encoder.analyzeSequence(values);

      assert.strictEqual(analysis.totalRuns, 4);
      assert.strictEqual(analysis.maxRunLength, 4); // 'b' appears 4 times
    });
  });

  describe('encode', () => {
    it('should encode consecutive repetitions', () => {
      const encoder = new RunLengthEncoder();
      const values = ['active', 'active', 'active', 'inactive', 'inactive'];

      const encoded = encoder.encode(values);

      assert.deepStrictEqual(encoded, ['active*3', 'inactive*2']);
    });

    it('should preserve single values', () => {
      const encoder = new RunLengthEncoder({ preserveSingletons: true });
      const values = ['a', 'b', 'b', 'b', 'c'];

      const encoded = encoder.encode(values);

      assert.deepStrictEqual(encoded, ['a', 'b*3', 'c']);
    });

    it('should not preserve singletons when disabled', () => {
      const encoder = new RunLengthEncoder({ preserveSingletons: false });
      const values = ['a', 'b', 'b', 'b', 'c'];

      const encoded = encoder.encode(values);

      assert.deepStrictEqual(encoded, ['a*1', 'b*3', 'c*1']);
    });

    it('should handle uniform values', () => {
      const encoder = new RunLengthEncoder();
      const values = Array(50).fill('active');

      const encoded = encoder.encode(values);

      assert.deepStrictEqual(encoded, ['active*50']);
    });

    it('should handle no repetition', () => {
      const encoder = new RunLengthEncoder();
      const values = ['a', 'b', 'c', 'd', 'e'];

      const encoded = encoder.encode(values);

      assert.deepStrictEqual(encoded, ['a', 'b', 'c', 'd', 'e']);
    });

    it('should respect minRunLength', () => {
      const encoder = new RunLengthEncoder({ minRunLength: 4 });
      const values = ['a', 'a', 'a', 'b', 'b', 'b', 'b', 'b'];

      const encoded = encoder.encode(values);

      // 'a' appears 3 times (below threshold - preserved as individual values),
      // 'b' appears 5 times (above threshold - encoded)
      assert.deepStrictEqual(encoded, ['a', 'a', 'a', 'b*5']);
    });

    it('should handle maxRunLength', () => {
      const encoder = new RunLengthEncoder({ maxRunLength: 10 });
      const values = Array(25).fill('x');

      const encoded = encoder.encode(values);

      // Should split into 10 + 10 + 5
      assert.strictEqual(encoded.length, 3);
      assert.deepStrictEqual(encoded, ['x*10', 'x*10', 'x*5']);
    });

    it('should handle empty array', () => {
      const encoder = new RunLengthEncoder();

      const encoded = encoder.encode([]);

      assert.deepStrictEqual(encoded, []);
    });

    it('should handle numeric values', () => {
      const encoder = new RunLengthEncoder();
      const values = [1, 1, 1, 2, 2, 3];

      const encoded = encoder.encode(values);

      assert.deepStrictEqual(encoded, ['1*3', '2*2', '3']);
    });

    it('should handle boolean values', () => {
      const encoder = new RunLengthEncoder();
      const values = [true, true, true, false, false, true];

      const encoded = encoder.encode(values);

      assert.deepStrictEqual(encoded, ['true*3', 'false*2', 'true']);
    });

    it('should handle special characters in values', () => {
      const encoder = new RunLengthEncoder();
      const values = ['a*b', 'a*b', 'a*b', 'c'];

      const encoded = encoder.encode(values);

      // Should still encode even with * in value
      assert.deepStrictEqual(encoded, ['a*b*3', 'c']);
    });
  });

  describe('decode', () => {
    it('should decode run-length encoded values', () => {
      const encoder = new RunLengthEncoder();
      const original = ['active', 'active', 'active', 'inactive', 'inactive'];
      const encoded = encoder.encode(original);

      const decoded = encoder.decode(encoded);

      assert.deepStrictEqual(decoded, original);
    });

    it('should decode uniform values', () => {
      const encoder = new RunLengthEncoder();
      const encoded = ['status*100'];

      const decoded = encoder.decode(encoded);

      assert.strictEqual(decoded.length, 100);
      assert.ok(decoded.every(v => v === 'status'));
    });

    it('should decode mixed runs', () => {
      const encoder = new RunLengthEncoder();
      const encoded = ['a*3', 'b', 'c*2', 'd'];

      const decoded = encoder.decode(encoded);

      assert.deepStrictEqual(decoded, ['a', 'a', 'a', 'b', 'c', 'c', 'd']);
    });

    it('should handle single values', () => {
      const encoder = new RunLengthEncoder();
      const encoded = ['a', 'b', 'c'];

      const decoded = encoder.decode(encoded);

      assert.deepStrictEqual(decoded, ['a', 'b', 'c']);
    });

    it('should handle empty array', () => {
      const encoder = new RunLengthEncoder();

      const decoded = encoder.decode([]);

      assert.deepStrictEqual(decoded, []);
    });

    it('should throw on invalid run length', () => {
      const encoder = new RunLengthEncoder();

      assert.throws(() => {
        encoder.decode(['a*invalid']);
      });
    });

    it('should throw on zero run length', () => {
      const encoder = new RunLengthEncoder();

      assert.throws(() => {
        encoder.decode(['a*0']);
      });
    });

    it('should throw on negative run length', () => {
      const encoder = new RunLengthEncoder();

      assert.throws(() => {
        encoder.decode(['a*-5']);
      });
    });

    it('should handle values with asterisk', () => {
      const encoder = new RunLengthEncoder();
      const encoded = ['a*b*2', 'c'];

      const decoded = encoder.decode(encoded);

      assert.deepStrictEqual(decoded, ['a*b', 'a*b', 'c']);
    });

    it('should handle large run lengths', () => {
      const encoder = new RunLengthEncoder();
      const encoded = ['x*1000'];

      const decoded = encoder.decode(encoded);

      assert.strictEqual(decoded.length, 1000);
      assert.ok(decoded.every(v => v === 'x'));
    });
  });

  describe('generateDirective', () => {
    it('should generate valid directive', () => {
      const encoder = new RunLengthEncoder();

      const directive = encoder.generateDirective('status');

      assert.strictEqual(directive, '@rle status');
    });

    it('should handle column names with spaces', () => {
      const encoder = new RunLengthEncoder();

      const directive = encoder.generateDirective('order status');

      assert.strictEqual(directive, '@rle order status');
    });
  });

  describe('parseDirective', () => {
    it('should parse valid directive', () => {
      const encoder = new RunLengthEncoder();

      const columnName = encoder.parseDirective('@rle status');

      assert.strictEqual(columnName, 'status');
    });

    it('should handle whitespace', () => {
      const encoder = new RunLengthEncoder();

      const columnName = encoder.parseDirective('@rle  status ');

      assert.strictEqual(columnName, 'status');
    });

    it('should throw on invalid format', () => {
      const encoder = new RunLengthEncoder();

      assert.throws(() => {
        encoder.parseDirective('@rle');
      });

      assert.throws(() => {
        encoder.parseDirective('rle status');
      });
    });
  });

  describe('shouldEncode', () => {
    it('should recommend encoding for repetitive data', () => {
      const encoder = new RunLengthEncoder();
      const values = Array(20).fill('active').concat(Array(10).fill('inactive'));

      const should = encoder.shouldEncode(values);

      assert.strictEqual(should, true);
    });

    it('should not recommend for non-repetitive data', () => {
      const encoder = new RunLengthEncoder();
      const values = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

      const should = encoder.shouldEncode(values);

      assert.strictEqual(should, false);
    });

    it('should not recommend for short runs', () => {
      const encoder = new RunLengthEncoder({ minRunLength: 5 });
      const values = ['a', 'a', 'a', 'b', 'b', 'b']; // All runs < 5

      const should = encoder.shouldEncode(values);

      assert.strictEqual(should, false);
    });

    it('should not recommend when disabled', () => {
      const encoder = new RunLengthEncoder({ enabled: false });
      const values = Array(100).fill('active');

      const should = encoder.shouldEncode(values);

      assert.strictEqual(should, false);
    });

    it('should respect compression ratio threshold', () => {
      const encoder = new RunLengthEncoder();
      const values = ['yes', 'yes', 'yes', 'yes', 'yes']; // Good compression

      const shouldWith10 = encoder.shouldEncode(values, 0.10); // 10%
      const shouldWith99 = encoder.shouldEncode(values, 0.99); // 99% (impossible)

      assert.ok(shouldWith10);
      assert.strictEqual(shouldWith99, false);
    });
  });

  describe('smartEncode', () => {
    it('should encode when beneficial', () => {
      const encoder = new RunLengthEncoder();
      const values = ['active', 'active', 'active', 'active', 'active'];

      const result = encoder.smartEncode(values);

      assert.deepStrictEqual(result, ['active*5']);
    });

    it('should not encode when not beneficial', () => {
      const encoder = new RunLengthEncoder();
      const values = ['a', 'b', 'c', 'd']; // No runs

      const result = encoder.smartEncode(values);

      assert.deepStrictEqual(result, ['a', 'b', 'c', 'd']);
    });
  });

  describe('estimateSavings', () => {
    it('should calculate byte savings', () => {
      const encoder = new RunLengthEncoder();
      const values = ['active', 'active', 'active', 'active', 'active'];

      const savings = encoder.estimateSavings(values);

      // Original: 6*5 = 30 bytes
      // Encoded: 6+1+1 = 8 bytes
      // Savings: 22 bytes
      assert.ok(savings > 15);
    });

    it('should return 0 for non-repetitive data', () => {
      const encoder = new RunLengthEncoder({ minRunLength: 3 });
      const values = ['a', 'b', 'c', 'd', 'e'];

      const savings = encoder.estimateSavings(values);

      assert.strictEqual(savings, 0);
    });

    it('should handle uniform data', () => {
      const encoder = new RunLengthEncoder();
      const values = Array(100).fill('status');

      const savings = encoder.estimateSavings(values);

      // Original: 6*100 = 600 bytes
      // Encoded: 6+1+3 = 10 bytes
      // Savings: 590 bytes
      assert.ok(savings > 500);
    });
  });
});

describe('RunLengthDecoder', () => {
  describe('parseDirective', () => {
    it('should parse and register directive', () => {
      const decoder = new RunLengthDecoder();

      decoder.parseDirective('@rle status');

      assert.ok(decoder.isRLEEncoded('status'));
    });

    it('should handle multiple directives', () => {
      const decoder = new RunLengthDecoder();

      decoder.parseDirective('@rle status');
      decoder.parseDirective('@rle category');

      assert.ok(decoder.isRLEEncoded('status'));
      assert.ok(decoder.isRLEEncoded('category'));
    });

    it('should throw on invalid format', () => {
      const decoder = new RunLengthDecoder();

      assert.throws(() => {
        decoder.parseDirective('@rle');
      });
    });
  });

  describe('isRLEEncoded', () => {
    it('should return false for unknown column', () => {
      const decoder = new RunLengthDecoder();

      assert.strictEqual(decoder.isRLEEncoded('unknown'), false);
    });

    it('should return true for registered column', () => {
      const decoder = new RunLengthDecoder();
      decoder.parseDirective('@rle status');

      assert.strictEqual(decoder.isRLEEncoded('status'), true);
    });
  });

  describe('decode', () => {
    it('should decode registered column', () => {
      const decoder = new RunLengthDecoder();
      decoder.parseDirective('@rle status');

      const values = ['active*3', 'inactive*2'];
      const decoded = decoder.decode('status', values);

      assert.deepStrictEqual(decoded, ['active', 'active', 'active', 'inactive', 'inactive']);
    });

    it('should pass through non-encoded column', () => {
      const decoder = new RunLengthDecoder();
      // status not registered

      const values = ['active', 'inactive'];
      const decoded = decoder.decode('status', values);

      assert.deepStrictEqual(decoded, ['active', 'inactive']);
    });

    it('should handle mixed encoded and non-encoded values', () => {
      const decoder = new RunLengthDecoder();
      decoder.parseDirective('@rle status');

      const values = ['active*5', 'pending', 'inactive*2'];
      const decoded = decoder.decode('status', values);

      assert.deepStrictEqual(decoded, [
        'active', 'active', 'active', 'active', 'active',
        'pending',
        'inactive', 'inactive'
      ]);
    });
  });

  describe('getRLEColumns', () => {
    it('should return all registered columns', () => {
      const decoder = new RunLengthDecoder();
      decoder.parseDirective('@rle status');
      decoder.parseDirective('@rle category');

      const columns = decoder.getRLEColumns();

      assert.strictEqual(columns.length, 2);
      assert.ok(columns.includes('status'));
      assert.ok(columns.includes('category'));
    });

    it('should return empty array when none registered', () => {
      const decoder = new RunLengthDecoder();

      const columns = decoder.getRLEColumns();

      assert.deepStrictEqual(columns, []);
    });
  });

  describe('clear', () => {
    it('should clear all directives', () => {
      const decoder = new RunLengthDecoder();
      decoder.parseDirective('@rle status');
      decoder.parseDirective('@rle category');

      decoder.clear();

      assert.strictEqual(decoder.getRLEColumns().length, 0);
      assert.strictEqual(decoder.isRLEEncoded('status'), false);
    });
  });
});

describe('RLE Integration', () => {
  it('should complete full encode/decode cycle', () => {
    const encoder = new RunLengthEncoder();
    const decoder = new RunLengthDecoder();

    const original = ['active', 'active', 'active', 'inactive', 'inactive', 'active'];

    // Encode
    const encoded = encoder.encode(original);
    const directive = encoder.generateDirective('status');

    // Parse directive in decoder
    decoder.parseDirective(directive);

    // Decode
    const decoded = decoder.decode('status', encoded);

    // Should match original
    assert.deepStrictEqual(decoded, original);
  });

  it('should handle status field data', () => {
    const encoder = new RunLengthEncoder();
    const decoder = new RunLengthDecoder();

    // Simulate status changes over time
    const statuses = [
      ...Array(50).fill('pending'),
      ...Array(30).fill('processing'),
      ...Array(10).fill('failed'),
      ...Array(60).fill('completed')
    ];

    // Should be highly compressible
    const analysis = encoder.analyzeSequence(statuses);
    assert.ok(analysis.recommended);
    assert.ok(analysis.compressionRatio > 0.8);

    // Encode and decode
    const encoded = encoder.encode(statuses);
    decoder.parseDirective(encoder.generateDirective('status'));
    const decoded = decoder.decode('status', encoded);

    assert.deepStrictEqual(decoded, statuses);
    assert.strictEqual(encoded.length, 4); // Only 4 runs
  });

  it('should handle boolean flags', () => {
    const encoder = new RunLengthEncoder();
    const decoder = new RunLengthDecoder();

    const flags = [
      ...Array(20).fill(true),
      ...Array(5).fill(false),
      ...Array(15).fill(true)
    ];

    // Should recommend encoding
    assert.ok(encoder.shouldEncode(flags));

    // Encode
    const encoded = encoder.encode(flags);
    const savings = encoder.estimateSavings(flags);

    // Should save significant bytes
    assert.ok(savings > 50);

    // Decode
    decoder.parseDirective(encoder.generateDirective('isActive'));
    const decoded = decoder.decode('isActive', encoded);

    assert.deepStrictEqual(decoded.map(v => v === 'true'), flags);
  });

  it('should handle categorical data with patterns', () => {
    const encoder = new RunLengthEncoder();
    const decoder = new RunLengthDecoder();

    // Simulate day/night cycle
    const periods = [];
    for (let i = 0; i < 10; i++) {
      periods.push(...Array(12).fill('day'));
      periods.push(...Array(12).fill('night'));
    }

    // Should be highly compressible
    const analysis = encoder.analyzeSequence(periods);
    assert.ok(analysis.recommended);
    assert.ok(analysis.avgRunLength >= 12);

    // Encode and decode
    const encoded = encoder.encode(periods);
    decoder.parseDirective(encoder.generateDirective('period'));
    const decoded = decoder.decode('period', encoded);

    assert.deepStrictEqual(decoded, periods);
    assert.strictEqual(encoded.length, 20); // 10 cycles × 2 states
  });
});
