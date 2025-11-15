/**
 * Tests for delta encoding optimization
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { DeltaEncoder, DeltaDecoder } from '../../dist/optimization/delta.js';

describe('DeltaEncoder', () => {
  describe('analyzeSequence', () => {
    it('should detect monotonically increasing sequence', () => {
      const encoder = new DeltaEncoder();
      const values = [100, 101, 102, 103, 104, 105];

      const analysis = encoder.analyzeSequence(values);

      assert.strictEqual(analysis.isMonotonic, true);
      assert.strictEqual(analysis.avgDelta, 1);
      assert.strictEqual(analysis.maxDelta, 1);
      assert.strictEqual(analysis.minDelta, 1);
      assert.ok(analysis.compressionRatio > 0);
    });

    it('should detect monotonically decreasing sequence', () => {
      const encoder = new DeltaEncoder();
      const values = [100, 99, 98, 97, 96, 95];

      const analysis = encoder.analyzeSequence(values);

      assert.strictEqual(analysis.isMonotonic, true);
      assert.strictEqual(analysis.avgDelta, 1);
    });

    it('should detect non-monotonic sequence', () => {
      const encoder = new DeltaEncoder();
      const values = [100, 102, 101, 103, 102];

      const analysis = encoder.analyzeSequence(values);

      assert.strictEqual(analysis.isMonotonic, false);
    });

    it('should handle constant sequence', () => {
      const encoder = new DeltaEncoder();
      const values = [100, 100, 100, 100];

      const analysis = encoder.analyzeSequence(values);

      assert.strictEqual(analysis.isMonotonic, true);
      assert.strictEqual(analysis.avgDelta, 0);
      assert.strictEqual(analysis.maxDelta, 0);
      assert.strictEqual(analysis.minDelta, 0);
    });

    it('should calculate compression ratio', () => {
      const encoder = new DeltaEncoder();
      const values = [1000, 1001, 1002, 1003, 1004];

      const analysis = encoder.analyzeSequence(values);

      // Original: "1000" (4) + "1001" (4) + ... = ~20 chars
      // Delta: "1000" (4) + "+1" (2) + "+1" (2) + ... = ~12 chars
      // Ratio: ~40% compression
      assert.ok(analysis.compressionRatio > 0.3);
    });

    it('should handle empty array', () => {
      const encoder = new DeltaEncoder();

      const analysis = encoder.analyzeSequence([]);

      assert.strictEqual(analysis.recommended, false);
    });

    it('should handle single value', () => {
      const encoder = new DeltaEncoder();

      const analysis = encoder.analyzeSequence([100]);

      assert.strictEqual(analysis.recommended, false);
    });
  });

  describe('encode', () => {
    it('should encode sequential integers', () => {
      const encoder = new DeltaEncoder();
      const values = [100, 101, 102, 103, 104];

      const encoded = encoder.encode(values);

      assert.deepStrictEqual(encoded, [100, '+1', '+1', '+1', '+1']);
    });

    it('should encode with positive deltas', () => {
      const encoder = new DeltaEncoder();
      const values = [10, 15, 20, 25];

      const encoded = encoder.encode(values);

      assert.deepStrictEqual(encoded, [10, '+5', '+5', '+5']);
    });

    it('should encode with negative deltas', () => {
      const encoder = new DeltaEncoder();
      const values = [100, 95, 90, 85];

      const encoded = encoder.encode(values);

      assert.deepStrictEqual(encoded, [100, '-5', '-5', '-5']);
    });

    it('should encode with mixed deltas', () => {
      const encoder = new DeltaEncoder();
      const values = [100, 105, 103, 108];

      const encoded = encoder.encode(values);

      assert.deepStrictEqual(encoded, [100, '+5', '-2', '+5']);
    });

    it('should encode with zero deltas', () => {
      const encoder = new DeltaEncoder();
      const values = [100, 100, 100];

      const encoded = encoder.encode(values);

      assert.deepStrictEqual(encoded, [100, '+0', '+0']);
    });

    it('should handle single value', () => {
      const encoder = new DeltaEncoder();

      const encoded = encoder.encode([100]);

      assert.deepStrictEqual(encoded, [100]);
    });

    it('should handle empty array', () => {
      const encoder = new DeltaEncoder();

      const encoded = encoder.encode([]);

      assert.deepStrictEqual(encoded, []);
    });

    it('should handle floating-point values', () => {
      const encoder = new DeltaEncoder();
      const values = [10.5, 11.5, 12.5];

      const encoded = encoder.encode(values);

      assert.strictEqual(encoded[0], 10.5);
      assert.strictEqual(encoded[1], '+1');
      assert.strictEqual(encoded[2], '+1');
    });
  });

  describe('decode', () => {
    it('should decode sequential integers', () => {
      const encoder = new DeltaEncoder();
      const original = [100, 101, 102, 103, 104];
      const encoded = encoder.encode(original);

      const decoded = encoder.decode(encoded);

      assert.deepStrictEqual(decoded, original);
    });

    it('should decode with negative deltas', () => {
      const encoder = new DeltaEncoder();
      const original = [100, 95, 90, 85];
      const encoded = encoder.encode(original);

      const decoded = encoder.decode(encoded);

      assert.deepStrictEqual(decoded, original);
    });

    it('should decode with mixed deltas', () => {
      const encoder = new DeltaEncoder();
      const original = [100, 105, 103, 108, 100];
      const encoded = encoder.encode(original);

      const decoded = encoder.decode(encoded);

      assert.deepStrictEqual(decoded, original);
    });

    it('should handle single value', () => {
      const encoder = new DeltaEncoder();

      const decoded = encoder.decode([100]);

      assert.deepStrictEqual(decoded, [100]);
    });

    it('should handle empty array', () => {
      const encoder = new DeltaEncoder();

      const decoded = encoder.decode([]);

      assert.deepStrictEqual(decoded, []);
    });

    it('should throw on invalid delta', () => {
      const encoder = new DeltaEncoder();

      assert.throws(() => {
        encoder.decode([100, 'invalid']);
      });
    });

    it('should handle floating-point deltas', () => {
      const encoder = new DeltaEncoder();
      const encoded = [10.5, '+1', '+1.5', '-0.5'];

      const decoded = encoder.decode(encoded);

      assert.strictEqual(decoded[0], 10.5);
      assert.strictEqual(decoded[1], 11.5);
      assert.strictEqual(decoded[2], 13);
      assert.strictEqual(decoded[3], 12.5);
    });
  });

  describe('generateDirective', () => {
    it('should generate valid directive', () => {
      const encoder = new DeltaEncoder();

      const directive = encoder.generateDirective('timestamp');

      assert.strictEqual(directive, '@delta timestamp');
    });

    it('should handle column names with spaces', () => {
      const encoder = new DeltaEncoder();

      const directive = encoder.generateDirective('time stamp');

      assert.strictEqual(directive, '@delta time stamp');
    });
  });

  describe('parseDirective', () => {
    it('should parse valid directive', () => {
      const encoder = new DeltaEncoder();

      const columnName = encoder.parseDirective('@delta timestamp');

      assert.strictEqual(columnName, 'timestamp');
    });

    it('should handle whitespace', () => {
      const encoder = new DeltaEncoder();

      const columnName = encoder.parseDirective('@delta  timestamp ');

      assert.strictEqual(columnName, 'timestamp');
    });

    it('should throw on invalid format', () => {
      const encoder = new DeltaEncoder();

      assert.throws(() => {
        encoder.parseDirective('@delta');
      });

      assert.throws(() => {
        encoder.parseDirective('delta timestamp');
      });
    });
  });

  describe('shouldEncode', () => {
    it('should recommend encoding for sequential data', () => {
      const encoder = new DeltaEncoder();
      const values = [1000, 1001, 1002, 1003, 1004, 1005];

      const should = encoder.shouldEncode(values);

      assert.strictEqual(should, true);
    });

    it('should not recommend for short sequences', () => {
      const encoder = new DeltaEncoder({ minSequenceLength: 5 });
      const values = [100, 101, 102];

      const should = encoder.shouldEncode(values);

      assert.strictEqual(should, false);
    });

    it('should not recommend for non-monotonic sequences', () => {
      const encoder = new DeltaEncoder({ detectMonotonic: true });
      const values = [100, 102, 101, 103, 102, 104];

      const should = encoder.shouldEncode(values);

      assert.strictEqual(should, false);
    });

    it('should recommend when detectMonotonic is false', () => {
      const encoder = new DeltaEncoder({ detectMonotonic: false, minSequenceLength: 3 });
      const values = [100, 102, 101, 103];

      const should = encoder.shouldEncode(values);

      assert.ok(should); // May still recommend if deltas are small
    });

    it('should not recommend when disabled', () => {
      const encoder = new DeltaEncoder({ enabled: false });
      const values = [100, 101, 102, 103, 104];

      const should = encoder.shouldEncode(values);

      assert.strictEqual(should, false);
    });

    it('should respect compression ratio threshold', () => {
      const encoder = new DeltaEncoder();
      const values = [1000, 1001, 1002, 1003, 1004, 1005]; // Good compression (4 digits → 2 digits)

      const shouldWith15 = encoder.shouldEncode(values, 0.15); // 15%
      const shouldWith90 = encoder.shouldEncode(values, 0.90); // 90% (impossible)

      assert.ok(shouldWith15);
      assert.strictEqual(shouldWith90, false);
    });
  });

  describe('smartEncode', () => {
    it('should encode when beneficial', () => {
      const encoder = new DeltaEncoder();
      const values = [1000, 1001, 1002, 1003, 1004];

      const result = encoder.smartEncode(values);

      assert.deepStrictEqual(result, [1000, '+1', '+1', '+1', '+1']);
    });

    it('should not encode when not beneficial', () => {
      const encoder = new DeltaEncoder({ minSequenceLength: 10 });
      const values = [100, 101, 102]; // Too short

      const result = encoder.smartEncode(values);

      assert.deepStrictEqual(result, values); // Original values
    });
  });

  describe('estimateSavings', () => {
    it('should calculate byte savings', () => {
      const encoder = new DeltaEncoder();
      const values = [1000, 1001, 1002, 1003, 1004];

      const savings = encoder.estimateSavings(values);

      // Original: "1000,1001,1002,1003,1004" = 24 chars
      // Encoded: "1000,+1,+1,+1,+1" = 16 chars
      // Savings: 8 bytes
      assert.ok(savings > 5);
    });

    it('should return 0 for single value', () => {
      const encoder = new DeltaEncoder();

      const savings = encoder.estimateSavings([100]);

      assert.strictEqual(savings, 0);
    });

    it('should return 0 when encoding is worse', () => {
      const encoder = new DeltaEncoder();
      // Large jumps make delta encoding inefficient
      const values = [1, 1000000, 2, 1000000];

      const savings = encoder.estimateSavings(values);

      assert.strictEqual(savings, 0); // No savings, encoding is worse
    });
  });
});

describe('DeltaDecoder', () => {
  describe('parseDirective', () => {
    it('should parse and register directive', () => {
      const decoder = new DeltaDecoder();

      decoder.parseDirective('@delta timestamp');

      assert.ok(decoder.isDeltaEncoded('timestamp'));
    });

    it('should handle multiple directives', () => {
      const decoder = new DeltaDecoder();

      decoder.parseDirective('@delta timestamp');
      decoder.parseDirective('@delta sequenceId');

      assert.ok(decoder.isDeltaEncoded('timestamp'));
      assert.ok(decoder.isDeltaEncoded('sequenceId'));
    });

    it('should throw on invalid format', () => {
      const decoder = new DeltaDecoder();

      assert.throws(() => {
        decoder.parseDirective('@delta');
      });
    });
  });

  describe('isDeltaEncoded', () => {
    it('should return false for unknown column', () => {
      const decoder = new DeltaDecoder();

      assert.strictEqual(decoder.isDeltaEncoded('unknown'), false);
    });

    it('should return true for registered column', () => {
      const decoder = new DeltaDecoder();
      decoder.parseDirective('@delta timestamp');

      assert.strictEqual(decoder.isDeltaEncoded('timestamp'), true);
    });
  });

  describe('decode', () => {
    it('should decode registered column', () => {
      const decoder = new DeltaDecoder();
      decoder.parseDirective('@delta timestamp');

      const values = [1000, '+1', '+1', '+1'];
      const decoded = decoder.decode('timestamp', values);

      assert.deepStrictEqual(decoded, [1000, 1001, 1002, 1003]);
    });

    it('should pass through non-encoded column', () => {
      const decoder = new DeltaDecoder();
      // timestamp not registered

      const values = [100, 200, 300];
      const decoded = decoder.decode('timestamp', values);

      assert.deepStrictEqual(decoded, [100, 200, 300]);
    });

    it('should handle string numbers', () => {
      const decoder = new DeltaDecoder();
      decoder.parseDirective('@delta id');

      const values = ['100', '+1', '+1'];
      const decoded = decoder.decode('id', values);

      assert.deepStrictEqual(decoded, [100, 101, 102]);
    });
  });

  describe('getDeltaColumns', () => {
    it('should return all registered columns', () => {
      const decoder = new DeltaDecoder();
      decoder.parseDirective('@delta timestamp');
      decoder.parseDirective('@delta sequenceId');

      const columns = decoder.getDeltaColumns();

      assert.strictEqual(columns.length, 2);
      assert.ok(columns.includes('timestamp'));
      assert.ok(columns.includes('sequenceId'));
    });

    it('should return empty array when none registered', () => {
      const decoder = new DeltaDecoder();

      const columns = decoder.getDeltaColumns();

      assert.deepStrictEqual(columns, []);
    });
  });

  describe('clear', () => {
    it('should clear all directives', () => {
      const decoder = new DeltaDecoder();
      decoder.parseDirective('@delta timestamp');
      decoder.parseDirective('@delta sequenceId');

      decoder.clear();

      assert.strictEqual(decoder.getDeltaColumns().length, 0);
      assert.strictEqual(decoder.isDeltaEncoded('timestamp'), false);
    });
  });
});

describe('Delta Integration', () => {
  it('should complete full encode/decode cycle', () => {
    const encoder = new DeltaEncoder();
    const decoder = new DeltaDecoder();

    const original = [1000, 1001, 1002, 1003, 1004];

    // Encode
    const encoded = encoder.encode(original);
    const directive = encoder.generateDirective('timestamp');

    // Parse directive in decoder
    decoder.parseDirective(directive);

    // Decode
    const decoded = decoder.decode('timestamp', encoded);

    // Should match original
    assert.deepStrictEqual(decoded, original);
  });

  it('should handle time-series data', () => {
    const encoder = new DeltaEncoder();
    const decoder = new DeltaDecoder();

    // Unix timestamps (1 second intervals)
    const timestamps = [
      1704067200,
      1704067201,
      1704067202,
      1704067203,
      1704067204
    ];

    // Should be highly compressible
    const analysis = encoder.analyzeSequence(timestamps);
    assert.ok(analysis.recommended);
    assert.ok(analysis.compressionRatio > 0.4);

    // Encode and decode
    const encoded = encoder.encode(timestamps);
    decoder.parseDirective(encoder.generateDirective('timestamp'));
    const decoded = decoder.decode('timestamp', encoded);

    assert.deepStrictEqual(decoded, timestamps);
  });

  it('should handle sequential IDs', () => {
    const encoder = new DeltaEncoder();
    const decoder = new DeltaDecoder();

    const ids = Array(100).fill(null).map((_, i) => 1000 + i);

    // Should recommend encoding
    assert.ok(encoder.shouldEncode(ids));

    // Encode
    const encoded = encoder.encode(ids);
    const savings = encoder.estimateSavings(ids);

    // Should save significant bytes
    assert.ok(savings > 100);

    // Decode
    decoder.parseDirective(encoder.generateDirective('id'));
    const decoded = decoder.decode('id', encoded);

    assert.deepStrictEqual(decoded, ids);
  });
});
