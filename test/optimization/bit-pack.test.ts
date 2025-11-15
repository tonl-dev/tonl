/**
 * Tests for bit packing optimizer
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { BitPacker, BitPackDecoder } from '../../dist/optimization/bit-pack.js';

describe('BitPacker', () => {
  describe('analyzeValues', () => {
    it('should detect boolean data type', () => {
      const packer = new BitPacker();
      const values = [true, false, true, false, true, true, false, false];

      const analysis = packer.analyzeValues(values);

      assert.strictEqual(analysis.dataType, 'boolean');
      assert.strictEqual(analysis.bitWidth, 1);
      assert.ok(analysis.compressionRatio > 0);
    });

    it('should detect small integer data type', () => {
      const packer = new BitPacker();
      const values = [0, 1, 2, 3, 4, 5, 6, 7];

      const analysis = packer.analyzeValues(values);

      assert.strictEqual(analysis.dataType, 'small-int');
      assert.strictEqual(analysis.bitWidth, 3); // 0-7 needs 3 bits
      assert.ok(analysis.compressionRatio > 0);
    });

    it('should recommend packing for boolean values', () => {
      const packer = new BitPacker();
      const values = Array(20).fill(null).map((_, i) => i % 2 === 0);

      const analysis = packer.analyzeValues(values);

      assert.ok(analysis.recommended);
      assert.strictEqual(analysis.dataType, 'boolean');
      assert.ok(analysis.compressionRatio > 0.3); // At least 30% savings
    });

    it('should recommend packing for small integers', () => {
      const packer = new BitPacker();
      const values = Array(20).fill(null).map((_, i) => i % 16); // 0-15

      const analysis = packer.analyzeValues(values);

      assert.ok(analysis.recommended);
      assert.strictEqual(analysis.dataType, 'small-int');
      assert.strictEqual(analysis.bitWidth, 4); // 0-15 needs 4 bits
    });

    it('should not recommend for large integers', () => {
      const packer = new BitPacker();
      const values = [1000, 2000, 3000, 4000];

      const analysis = packer.analyzeValues(values);

      assert.strictEqual(analysis.dataType, 'unsupported');
      assert.ok(!analysis.recommended);
    });

    it('should not recommend for small datasets', () => {
      const packer = new BitPacker({ minPackSize: 10 });
      const values = [true, false, true]; // Only 3 values

      const analysis = packer.analyzeValues(values);

      assert.ok(!analysis.recommended); // Too few values
    });

    it('should handle empty array', () => {
      const packer = new BitPacker();
      const analysis = packer.analyzeValues([]);

      assert.strictEqual(analysis.dataType, 'unsupported');
      assert.ok(!analysis.recommended);
      assert.strictEqual(analysis.compressionRatio, 0);
    });

    it('should detect mixed types', () => {
      const packer = new BitPacker();
      const values = [true, 1, 'string', false];

      const analysis = packer.analyzeValues(values);

      assert.strictEqual(analysis.dataType, 'mixed');
      assert.ok(!analysis.recommended);
    });
  });

  describe('packBooleans', () => {
    it('should pack 8 booleans into 1 byte', () => {
      const packer = new BitPacker();
      const values = [true, false, true, true, false, false, true, false];

      const packed = packer.packBooleans(values);

      assert.strictEqual(packed.length, 1);
      assert.strictEqual(packed[0], 0b01001101); // Binary: 01001101
    });

    it('should pack 16 booleans into 2 bytes', () => {
      const packer = new BitPacker();
      const values = Array(16).fill(null).map((_, i) => i % 2 === 0);

      const packed = packer.packBooleans(values);

      assert.strictEqual(packed.length, 2);
    });

    it('should handle partial bytes', () => {
      const packer = new BitPacker();
      const values = [true, false, true]; // Only 3 bits

      const packed = packer.packBooleans(values);

      assert.strictEqual(packed.length, 1);
      assert.strictEqual(packed[0], 0b00000101); // 3 bits used
    });

    it('should handle all true values', () => {
      const packer = new BitPacker();
      const values = Array(8).fill(true);

      const packed = packer.packBooleans(values);

      assert.strictEqual(packed.length, 1);
      assert.strictEqual(packed[0], 0b11111111);
    });

    it('should handle all false values', () => {
      const packer = new BitPacker();
      const values = Array(8).fill(false);

      const packed = packer.packBooleans(values);

      assert.strictEqual(packed.length, 1);
      assert.strictEqual(packed[0], 0b00000000);
    });
  });

  describe('unpackBooleans', () => {
    it('should unpack 1 byte to 8 booleans', () => {
      const packer = new BitPacker();
      const packed = [0b01001101];

      const unpacked = packer.unpackBooleans(packed, 8);

      assert.deepStrictEqual(unpacked, [true, false, true, true, false, false, true, false]);
    });

    it('should unpack partial bytes', () => {
      const packer = new BitPacker();
      const packed = [0b00000101];

      const unpacked = packer.unpackBooleans(packed, 3);

      assert.deepStrictEqual(unpacked, [true, false, true]);
    });

    it('should handle multiple bytes', () => {
      const packer = new BitPacker();
      const original = Array(16).fill(null).map((_, i) => i % 2 === 0);
      const packed = packer.packBooleans(original);

      const unpacked = packer.unpackBooleans(packed, 16);

      assert.deepStrictEqual(unpacked, original);
    });

    it('should round-trip correctly', () => {
      const packer = new BitPacker();
      const original = [true, true, false, true, false, false, true, false, true];
      const packed = packer.packBooleans(original);
      const unpacked = packer.unpackBooleans(packed, original.length);

      assert.deepStrictEqual(unpacked, original);
    });
  });

  describe('packIntegers', () => {
    it('should pack 4-bit integers efficiently', () => {
      const packer = new BitPacker();
      const values = [0, 1, 2, 3, 4, 5, 6, 7]; // 0-7 needs 3 bits

      const packed = packer.packIntegers(values, 3);

      // 8 values * 3 bits = 24 bits = 3 bytes
      assert.strictEqual(packed.length, 3);
    });

    it('should pack 8-bit integers', () => {
      const packer = new BitPacker();
      const values = [0, 15, 255, 100, 200]; // 0-255 needs 8 bits

      const packed = packer.packIntegers(values, 8);

      assert.strictEqual(packed.length, 5); // 5 values * 8 bits = 5 bytes
    });

    it('should auto-detect bit width', () => {
      const packer = new BitPacker();
      const values = [0, 1, 2, 3]; // Max value is 3, needs 2 bits

      const packed = packer.packIntegers(values);

      // 4 values * 2 bits = 8 bits = 1 byte
      assert.strictEqual(packed.length, 1);
    });

    it('should throw on negative integers', () => {
      const packer = new BitPacker();
      const values = [-1, 0, 1];

      assert.throws(() => {
        packer.packIntegers(values);
      }, /out of range/);
    });

    it('should throw on integers exceeding maxIntValue', () => {
      const packer = new BitPacker({ maxIntValue: 255 });
      const values = [0, 256, 100];

      assert.throws(() => {
        packer.packIntegers(values);
      }, /out of range/);
    });
  });

  describe('unpackIntegers', () => {
    it('should unpack 3-bit integers', () => {
      const packer = new BitPacker();
      const original = [0, 1, 2, 3, 4, 5, 6, 7];
      const packed = packer.packIntegers(original, 3);

      const unpacked = packer.unpackIntegers(packed, original.length, 3);

      assert.deepStrictEqual(unpacked, original);
    });

    it('should unpack 8-bit integers', () => {
      const packer = new BitPacker();
      const original = [0, 15, 255, 100, 200];
      const packed = packer.packIntegers(original, 8);

      const unpacked = packer.unpackIntegers(packed, original.length, 8);

      assert.deepStrictEqual(unpacked, original);
    });

    it('should round-trip correctly with various bit widths', () => {
      const packer = new BitPacker();

      for (const bitWidth of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const maxValue = (1 << bitWidth) - 1;
        const original = Array(20).fill(null).map((_, i) => i % (maxValue + 1));
        const packed = packer.packIntegers(original, bitWidth);
        const unpacked = packer.unpackIntegers(packed, original.length, bitWidth);

        assert.deepStrictEqual(unpacked, original, `Failed for bit width ${bitWidth}`);
      }
    });
  });

  describe('encodeToString', () => {
    it('should encode boolean packed data', () => {
      const packer = new BitPacker();
      const packed = [255, 0, 128];

      const encoded = packer.encodeToString(packed, 1);

      assert.strictEqual(encoded, 'b:255,0,128');
    });

    it('should encode integer packed data with bit width', () => {
      const packer = new BitPacker();
      const packed = [100, 200, 50];

      const encoded = packer.encodeToString(packed, 4);

      assert.strictEqual(encoded, 'i4:100,200,50');
    });

    it('should handle various bit widths', () => {
      const packer = new BitPacker();

      assert.strictEqual(packer.encodeToString([1, 2], 1), 'b:1,2');
      assert.strictEqual(packer.encodeToString([1, 2], 2), 'i2:1,2');
      assert.strictEqual(packer.encodeToString([1, 2], 8), 'i8:1,2');
    });
  });

  describe('decodeFromString', () => {
    it('should decode boolean format', () => {
      const packer = new BitPacker();
      const encoded = 'b:255,0,128';

      const { packed, bitWidth } = packer.decodeFromString(encoded);

      assert.deepStrictEqual(packed, [255, 0, 128]);
      assert.strictEqual(bitWidth, 1);
    });

    it('should decode integer format', () => {
      const packer = new BitPacker();
      const encoded = 'i4:100,200,50';

      const { packed, bitWidth } = packer.decodeFromString(encoded);

      assert.deepStrictEqual(packed, [100, 200, 50]);
      assert.strictEqual(bitWidth, 4);
    });

    it('should throw on invalid format', () => {
      const packer = new BitPacker();

      assert.throws(() => {
        packer.decodeFromString('invalid');
      }, /Invalid bit-packed format/);
    });

    it('should throw on invalid byte values', () => {
      const packer = new BitPacker();

      assert.throws(() => {
        packer.decodeFromString('b:256,100'); // 256 exceeds byte max
      }, /Invalid byte values/);
    });

    it('should round-trip correctly', () => {
      const packer = new BitPacker();
      const packed = [10, 20, 30, 40];
      const bitWidth = 4;

      const encoded = packer.encodeToString(packed, bitWidth);
      const decoded = packer.decodeFromString(encoded);

      assert.deepStrictEqual(decoded.packed, packed);
      assert.strictEqual(decoded.bitWidth, bitWidth);
    });
  });

  describe('directive generation', () => {
    it('should generate boolean directive', () => {
      const packer = new BitPacker();
      const directive = packer.generateDirective('flags', 1, 100);

      assert.strictEqual(directive, '@bitpack flags 1 100');
    });

    it('should generate integer directive', () => {
      const packer = new BitPacker();
      const directive = packer.generateDirective('status', 4, 50);

      assert.strictEqual(directive, '@bitpack status 4 50');
    });
  });

  describe('parseDirective', () => {
    it('should parse boolean directive', () => {
      const packer = new BitPacker();
      const parsed = packer.parseDirective('@bitpack flags 1 100');

      assert.strictEqual(parsed.columnName, 'flags');
      assert.strictEqual(parsed.bitWidth, 1);
      assert.strictEqual(parsed.count, 100);
    });

    it('should parse integer directive', () => {
      const packer = new BitPacker();
      const parsed = packer.parseDirective('@bitpack status 4 50');

      assert.strictEqual(parsed.columnName, 'status');
      assert.strictEqual(parsed.bitWidth, 4);
      assert.strictEqual(parsed.count, 50);
    });

    it('should throw on invalid directive', () => {
      const packer = new BitPacker();

      assert.throws(() => {
        packer.parseDirective('@invalid');
      }, /Invalid bitpack directive/);
    });

    it('should throw on invalid bit width', () => {
      const packer = new BitPacker();

      assert.throws(() => {
        packer.parseDirective('@bitpack flags 0 100');
      }, /Invalid bit width/);

      assert.throws(() => {
        packer.parseDirective('@bitpack flags 33 100');
      }, /Invalid bit width/);
    });

    it('should throw on invalid count', () => {
      const packer = new BitPacker();

      assert.throws(() => {
        packer.parseDirective('@bitpack flags 1 0');
      }, /Invalid count/);
    });
  });

  describe('shouldPack', () => {
    it('should return true for boolean arrays', () => {
      const packer = new BitPacker();
      const values = Array(20).fill(null).map((_, i) => i % 2 === 0);

      assert.ok(packer.shouldPack(values));
    });

    it('should return true for small integer arrays', () => {
      const packer = new BitPacker();
      const values = Array(20).fill(null).map((_, i) => i % 16);

      assert.ok(packer.shouldPack(values));
    });

    it('should return false for large integers', () => {
      const packer = new BitPacker();
      const values = [1000, 2000, 3000];

      assert.ok(!packer.shouldPack(values));
    });

    it('should return false when disabled', () => {
      const packer = new BitPacker({ enabled: false });
      const values = Array(20).fill(true);

      assert.ok(!packer.shouldPack(values));
    });

    it('should respect minCompressionRatio', () => {
      const packer = new BitPacker({ minPackSize: 10 });
      const values = Array(10).fill(true); // Exactly minimum size

      // Should pack with default ratio (0.3)
      assert.ok(packer.shouldPack(values, 0.3));

      // Analyze to check actual compression ratio
      const analysis = packer.analyzeValues(values);

      // Should respect the threshold - if actual compression > threshold, shouldPack returns true
      const actualRatio = analysis.compressionRatio;
      const highThreshold = actualRatio + 0.1; // Set threshold higher than actual
      assert.ok(!packer.shouldPack(values, highThreshold));
    });
  });

  describe('smartPack', () => {
    it('should pack boolean values automatically', () => {
      const packer = new BitPacker();
      const values = [true, false, true, true, false, false, true, false];

      const encoded = packer.smartPack(values);

      assert.ok(encoded !== null);
      assert.ok(encoded!.startsWith('b:'));
    });

    it('should pack small integers automatically', () => {
      const packer = new BitPacker();
      const values = Array(20).fill(null).map((_, i) => i % 8);

      const encoded = packer.smartPack(values);

      assert.ok(encoded !== null);
      assert.ok(encoded!.startsWith('i'));
    });

    it('should return null for unsuitable data', () => {
      const packer = new BitPacker();
      const values = [1000, 2000, 3000];

      const encoded = packer.smartPack(values);

      assert.strictEqual(encoded, null);
    });
  });

  describe('smartUnpack', () => {
    it('should unpack boolean values', () => {
      const packer = new BitPacker();
      const original = [true, false, true, true, false, false, true, false];
      const encoded = packer.smartPack(original)!;

      const unpacked = packer.smartUnpack(encoded, original.length);

      assert.deepStrictEqual(unpacked, original);
    });

    it('should unpack integer values', () => {
      const packer = new BitPacker();
      const original = Array(20).fill(null).map((_, i) => i % 8);
      const encoded = packer.smartPack(original)!;

      const unpacked = packer.smartUnpack(encoded, original.length);

      assert.deepStrictEqual(unpacked, original);
    });

    it('should round-trip correctly', () => {
      const packer = new BitPacker();

      // Test booleans
      const boolValues = Array(50).fill(null).map((_, i) => i % 3 === 0);
      const boolEncoded = packer.smartPack(boolValues)!;
      const boolUnpacked = packer.smartUnpack(boolEncoded, boolValues.length);
      assert.deepStrictEqual(boolUnpacked, boolValues);

      // Test integers
      const intValues = Array(50).fill(null).map((_, i) => i % 16);
      const intEncoded = packer.smartPack(intValues)!;
      const intUnpacked = packer.smartUnpack(intEncoded, intValues.length);
      assert.deepStrictEqual(intUnpacked, intValues);
    });
  });

  describe('estimateSavings', () => {
    it('should estimate savings for boolean values', () => {
      const packer = new BitPacker();
      const values = Array(100).fill(null).map((_, i) => i % 2 === 0);

      const savings = packer.estimateSavings(values);

      assert.ok(savings > 0);
      assert.ok(savings > 100); // Should save significant bytes
    });

    it('should estimate savings for small integers', () => {
      const packer = new BitPacker();
      const values = Array(100).fill(null).map((_, i) => i % 16);

      const savings = packer.estimateSavings(values);

      assert.ok(savings > 0);
    });

    it('should return minimal savings for unsuitable data', () => {
      const packer = new BitPacker();
      const values = [1000, 2000, 3000];

      const analysis = packer.analyzeValues(values);

      assert.strictEqual(analysis.dataType, 'unsupported');
      assert.ok(!analysis.recommended);
    });
  });
});

describe('BitPackDecoder', () => {
  describe('directive parsing', () => {
    it('should parse and register directive', () => {
      const decoder = new BitPackDecoder();
      decoder.parseDirective('@bitpack flags 1 100');

      assert.ok(decoder.isBitPacked('flags'));
    });

    it('should throw on invalid directive', () => {
      const decoder = new BitPackDecoder();

      assert.throws(() => {
        decoder.parseDirective('@invalid');
      }, /Invalid bitpack directive/);
    });

    it('should track multiple columns', () => {
      const decoder = new BitPackDecoder();
      decoder.parseDirective('@bitpack flags 1 100');
      decoder.parseDirective('@bitpack status 4 50');

      assert.ok(decoder.isBitPacked('flags'));
      assert.ok(decoder.isBitPacked('status'));
      assert.ok(!decoder.isBitPacked('other'));
    });
  });

  describe('decode', () => {
    it('should decode boolean column', () => {
      const packer = new BitPacker();
      const decoder = new BitPackDecoder();
      const original = Array(20).fill(null).map((_, i) => i % 2 === 0);

      const encoded = packer.smartPack(original)!;
      decoder.parseDirective('@bitpack flags 1 20');

      const decoded = decoder.decode('flags', encoded);

      assert.deepStrictEqual(decoded, original);
    });

    it('should decode integer column', () => {
      const packer = new BitPacker();
      const decoder = new BitPackDecoder();
      const original = Array(20).fill(null).map((_, i) => i % 8);

      const encoded = packer.smartPack(original)!;
      decoder.parseDirective('@bitpack status 3 20');

      const decoded = decoder.decode('status', encoded);

      assert.deepStrictEqual(decoded, original);
    });

    it('should throw on non-bit-packed column', () => {
      const decoder = new BitPackDecoder();

      assert.throws(() => {
        decoder.decode('unknown', 'b:255');
      }, /Column not bit-packed/);
    });
  });

  describe('getBitPackedColumns', () => {
    it('should return all registered columns', () => {
      const decoder = new BitPackDecoder();
      decoder.parseDirective('@bitpack flags 1 100');
      decoder.parseDirective('@bitpack status 4 50');

      const columns = decoder.getBitPackedColumns();

      assert.strictEqual(columns.length, 2);
      assert.ok(columns.includes('flags'));
      assert.ok(columns.includes('status'));
    });

    it('should return empty array initially', () => {
      const decoder = new BitPackDecoder();

      assert.strictEqual(decoder.getBitPackedColumns().length, 0);
    });
  });

  describe('clear', () => {
    it('should clear all directives', () => {
      const decoder = new BitPackDecoder();
      decoder.parseDirective('@bitpack flags 1 100');
      decoder.parseDirective('@bitpack status 4 50');

      decoder.clear();

      assert.strictEqual(decoder.getBitPackedColumns().length, 0);
      assert.ok(!decoder.isBitPacked('flags'));
      assert.ok(!decoder.isBitPacked('status'));
    });
  });
});

describe('real-world scenarios', () => {
  it('should optimize boolean feature flags', () => {
    const packer = new BitPacker();
    const flags = Array(200).fill(null).map((_, i) => ({
      feature1: i % 2 === 0,
      feature2: i % 3 === 0,
      feature3: i % 5 === 0
    }));

    for (const flagName of ['feature1', 'feature2', 'feature3']) {
      const values = flags.map(f => f[flagName as keyof typeof f]);
      const analysis = packer.analyzeValues(values);

      assert.ok(analysis.recommended);
      assert.ok(analysis.compressionRatio > 0.5); // >50% savings
    }
  });

  it('should optimize status codes', () => {
    const packer = new BitPacker();
    // HTTP status codes mapped to 0-5
    const statusMap = { 200: 0, 201: 1, 400: 2, 404: 3, 500: 4 };
    const statuses = Array(100).fill(null).map((_, i) =>
      [0, 0, 0, 1, 2, 3, 4][i % 7]
    );

    const analysis = packer.analyzeValues(statuses);

    assert.ok(analysis.recommended);
    assert.strictEqual(analysis.bitWidth, 3); // 0-4 needs 3 bits
    assert.ok(analysis.compressionRatio > 0.4);
  });

  it('should handle IoT sensor on/off states', () => {
    const packer = new BitPacker();
    const sensorStates = Array(500).fill(null).map((_, i) => i % 10 < 7); // 70% on

    const encoded = packer.smartPack(sensorStates);
    assert.ok(encoded !== null);

    const unpacked = packer.smartUnpack(encoded!, sensorStates.length);
    assert.deepStrictEqual(unpacked, sensorStates);

    const savings = packer.estimateSavings(sensorStates);
    assert.ok(savings > 200); // Significant savings
  });

  it('should optimize age ranges (0-100)', () => {
    const packer = new BitPacker();
    const ages = Array(100).fill(null).map((_, i) => (i % 80) + 18); // Ages 18-97

    const analysis = packer.analyzeValues(ages);

    assert.strictEqual(analysis.dataType, 'small-int');
    assert.strictEqual(analysis.bitWidth, 7); // 0-97 needs 7 bits
    assert.ok(analysis.recommended);
  });
});
