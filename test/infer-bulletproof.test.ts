/**
 * BULLETPROOF TESTS for Type Inference System
 * Target: 95%+ coverage for src/infer.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  inferPrimitiveType,
  coerceValue,
  isUniformObjectArray,
  getUniformColumns,
  inferTypeFromString
} from '../dist/infer.js';

describe('BULLETPROOF: Type Inference', () => {
  describe('inferPrimitiveType - All Paths', () => {
    it('should handle all null/undefined cases', () => {
      assert.strictEqual(inferPrimitiveType(null), 'null');
      assert.strictEqual(inferPrimitiveType(undefined), 'null');
    });

    it('should handle all boolean cases', () => {
      assert.strictEqual(inferPrimitiveType(true), 'bool');
      assert.strictEqual(inferPrimitiveType(false), 'bool');
    });

    it('should handle u32 boundary cases', () => {
      assert.strictEqual(inferPrimitiveType(0), 'u32');
      assert.strictEqual(inferPrimitiveType(1), 'u32');
      assert.strictEqual(inferPrimitiveType(42), 'u32');
      assert.strictEqual(inferPrimitiveType(2147483647), 'u32'); // Max i32 but positive = u32
      assert.strictEqual(inferPrimitiveType(4294967295), 'u32'); // Max u32
    });

    it('should handle i32 boundary cases', () => {
      assert.strictEqual(inferPrimitiveType(-1), 'i32');
      assert.strictEqual(inferPrimitiveType(-42), 'i32');
      assert.strictEqual(inferPrimitiveType(-2147483648), 'i32'); // Min i32
      assert.strictEqual(inferPrimitiveType(-2147483647), 'i32');
    });

    it('should handle f64 for large integers', () => {
      assert.strictEqual(inferPrimitiveType(4294967296), 'f64'); // u32 max + 1
      assert.strictEqual(inferPrimitiveType(-2147483649), 'f64'); // i32 min - 1
      assert.strictEqual(inferPrimitiveType(9007199254740991), 'f64'); // MAX_SAFE_INTEGER
      assert.strictEqual(inferPrimitiveType(Number.MAX_SAFE_INTEGER), 'f64');
    });

    it('should handle f64 for floats', () => {
      assert.strictEqual(inferPrimitiveType(0.1), 'f64');
      assert.strictEqual(inferPrimitiveType(3.14159), 'f64');
      assert.strictEqual(inferPrimitiveType(-3.14), 'f64');
      assert.strictEqual(inferPrimitiveType(0.0000001), 'f64');
    });

    it('should handle f64 for special values', () => {
      assert.strictEqual(inferPrimitiveType(Infinity), 'f64');
      assert.strictEqual(inferPrimitiveType(-Infinity), 'f64');
      assert.strictEqual(inferPrimitiveType(NaN), 'f64');
    });

    it('should handle strings', () => {
      assert.strictEqual(inferPrimitiveType(''), 'str');
      assert.strictEqual(inferPrimitiveType('hello'), 'str');
      assert.strictEqual(inferPrimitiveType('123'), 'str');
    });

    it('should handle arrays', () => {
      assert.strictEqual(inferPrimitiveType([]), 'list');
      assert.strictEqual(inferPrimitiveType([1, 2, 3]), 'list');
      assert.strictEqual(inferPrimitiveType(['a', 'b']), 'list');
    });

    it('should handle objects', () => {
      assert.strictEqual(inferPrimitiveType({}), 'obj');
      assert.strictEqual(inferPrimitiveType({ a: 1 }), 'obj');
      assert.strictEqual(inferPrimitiveType(new Date()), 'obj');
    });
  });

  describe('coerceValue - COMPLETE Coverage', () => {
    describe('null type', () => {
      it('should always return null', () => {
        assert.strictEqual(coerceValue('null', 'null'), null);
        assert.strictEqual(coerceValue('anything', 'null'), null);
        assert.strictEqual(coerceValue('123', 'null'), null);
        assert.strictEqual(coerceValue('', 'null'), null);
      });
    });

    describe('bool type', () => {
      it('should coerce boolean values', () => {
        assert.strictEqual(coerceValue('true', 'bool'), true);
        assert.strictEqual(coerceValue('false', 'bool'), false);
      });

      it('should treat anything else as false', () => {
        assert.strictEqual(coerceValue('TRUE', 'bool'), false);
        assert.strictEqual(coerceValue('1', 'bool'), false);
        assert.strictEqual(coerceValue('yes', 'bool'), false);
        assert.strictEqual(coerceValue('', 'bool'), false);
      });
    });

    describe('u32 type - ALL validation paths', () => {
      it('should accept valid u32 values', () => {
        assert.strictEqual(coerceValue('0', 'u32'), 0);
        assert.strictEqual(coerceValue('1', 'u32'), 1);
        assert.strictEqual(coerceValue('42', 'u32'), 42);
        assert.strictEqual(coerceValue('4294967295', 'u32'), 4294967295);
      });

      it('should reject non-decimal formats', () => {
        assert.throws(() => coerceValue('0x10', 'u32'), /hexadecimal.*not supported/);
        assert.throws(() => coerceValue('0o10', 'u32'), /octal.*not supported/);
        assert.throws(() => coerceValue('0b10', 'u32'), /binary.*not supported/);
        assert.throws(() => coerceValue('10n', 'u32'), /must be decimal/);
      });

      it('should reject negative numbers', () => {
        assert.throws(() => coerceValue('-1', 'u32'), /must be decimal/);
        assert.throws(() => coerceValue('-42', 'u32'), /must be decimal/);
      });

      it('should reject floats', () => {
        assert.throws(() => coerceValue('3.14', 'u32'), /must be decimal/);
        assert.throws(() => coerceValue('1.0', 'u32'), /must be decimal/);
      });

      it('should reject out of range', () => {
        assert.throws(() => coerceValue('4294967296', 'u32'), /out of range/);
        assert.throws(() => coerceValue('9999999999', 'u32'), /out of range/);
      });

      it('should reject leading zeros (overflow detection)', () => {
        assert.throws(() => coerceValue('042', 'u32'), /overflow detected/);
        assert.throws(() => coerceValue('00', 'u32'), /overflow detected/);
        assert.throws(() => coerceValue('0000000001', 'u32'), /overflow detected/);
      });

      it('should reject invalid characters', () => {
        assert.throws(() => coerceValue('12a34', 'u32'), /must be decimal/);
        assert.throws(() => coerceValue('12.34e10', 'u32'), /scientific notation.*not supported/);
      });
    });

    describe('i32 type - ALL validation paths', () => {
      it('should accept valid i32 values', () => {
        assert.strictEqual(coerceValue('0', 'i32'), 0);
        assert.strictEqual(coerceValue('42', 'i32'), 42);
        assert.strictEqual(coerceValue('-42', 'i32'), -42);
        assert.strictEqual(coerceValue('2147483647', 'i32'), 2147483647);
        assert.strictEqual(coerceValue('-2147483648', 'i32'), -2147483648);
      });

      it('should reject non-decimal formats', () => {
        assert.throws(() => coerceValue('0x10', 'i32'), /hexadecimal.*not supported/);
        assert.throws(() => coerceValue('-0x10', 'i32'), /must be decimal.*only/);
      });

      it('should reject floats', () => {
        assert.throws(() => coerceValue('3.14', 'i32'), /must be decimal/);
        assert.throws(() => coerceValue('-3.14', 'i32'), /must be decimal/);
      });

      it('should reject out of range positive', () => {
        assert.throws(() => coerceValue('2147483648', 'i32'), /out of range/);
        assert.throws(() => coerceValue('9999999999', 'i32'), /out of range/);
      });

      it('should reject out of range negative', () => {
        assert.throws(() => coerceValue('-2147483649', 'i32'), /out of range/);
        assert.throws(() => coerceValue('-9999999999', 'i32'), /out of range/);
      });

      it('should reject leading zeros (BUGFIX VERIFICATION)', () => {
        assert.throws(() => coerceValue('042', 'i32'), /overflow detected/);
        assert.throws(() => coerceValue('-042', 'i32'), /overflow detected/);
        assert.throws(() => coerceValue('-00', 'i32'), /overflow detected/);
        assert.throws(() => coerceValue('-0000000001', 'i32'), /overflow detected/);
      });
    });

    describe('f64 type - ALL validation paths', () => {
      it('should accept valid f64 values', () => {
        assert.strictEqual(coerceValue('0', 'f64'), 0);
        assert.strictEqual(coerceValue('3.14', 'f64'), 3.14);
        assert.strictEqual(coerceValue('-3.14', 'f64'), -3.14);
        assert.strictEqual(coerceValue('1.5e10', 'f64'), 1.5e10);
        assert.strictEqual(coerceValue('-2.5e-5', 'f64'), -2.5e-5);
      });

      it('should reject NaN', () => {
        assert.throws(() => coerceValue('NaN', 'f64'), /NaN or Infinity not allowed/);
      });

      it('should reject Infinity', () => {
        assert.throws(() => coerceValue('Infinity', 'f64'), /NaN or Infinity not allowed/);
        assert.throws(() => coerceValue('-Infinity', 'f64'), /NaN or Infinity not allowed/);
      });

      it('should handle edge cases', () => {
        assert.strictEqual(coerceValue('0.0', 'f64'), 0);
        assert.strictEqual(coerceValue('.5', 'f64'), 0.5);
      });
    });

    describe('str type', () => {
      it('should handle unquoted strings', () => {
        assert.strictEqual(coerceValue('hello', 'str'), 'hello');
        assert.strictEqual(coerceValue('world', 'str'), 'world');
      });

      it('should handle quoted strings with doubled quotes', () => {
        assert.strictEqual(coerceValue('"hello"', 'str'), 'hello');
        assert.strictEqual(coerceValue('"say ""hi"""', 'str'), 'say "hi"');
      });

      it('should handle null string', () => {
        assert.strictEqual(coerceValue('null', 'str'), null);
      });

      it('should handle empty string', () => {
        assert.strictEqual(coerceValue('""', 'str'), '');
      });
    });

    describe('unknown types', () => {
      it('should default to unquoted string', () => {
        assert.strictEqual(coerceValue('test', 'unknown' as any), 'test');
        assert.strictEqual(coerceValue('value', 'xyz' as any), 'value');
      });
    });
  });

  describe('isUniformObjectArray - COMPLETE Coverage', () => {
    it('should handle empty array', () => {
      assert.strictEqual(isUniformObjectArray([]), true);
    });

    it('should accept uniform objects', () => {
      assert.strictEqual(isUniformObjectArray([
        { a: 1, b: 2 },
        { a: 3, b: 4 },
        { a: 5, b: 6 }
      ]), true);
    });

    it('should accept single object', () => {
      assert.strictEqual(isUniformObjectArray([{ a: 1 }]), true);
    });

    it('should reject arrays with non-objects', () => {
      assert.strictEqual(isUniformObjectArray([1, 2, 3]), false);
      assert.strictEqual(isUniformObjectArray(['a', 'b']), false);
      assert.strictEqual(isUniformObjectArray([true, false]), false);
    });

    it('should reject arrays with null', () => {
      assert.strictEqual(isUniformObjectArray([null]), false);
      assert.strictEqual(isUniformObjectArray([null, null]), false);
      assert.strictEqual(isUniformObjectArray([{ a: 1 }, null]), false);
    });

    it('should reject nested arrays', () => {
      assert.strictEqual(isUniformObjectArray([[1], [2]]), false);
      assert.strictEqual(isUniformObjectArray([[], []]), false);
    });

    it('should reject objects with different keys', () => {
      assert.strictEqual(isUniformObjectArray([
        { a: 1, b: 2 },
        { c: 3, d: 4 }
      ]), false);
    });

    it('should reject objects with different key counts', () => {
      assert.strictEqual(isUniformObjectArray([
        { a: 1 },
        { a: 2, b: 3 }
      ]), false);
    });

    it('should reject objects with same keys in different order (should still be uniform due to sort)', () => {
      // Keys are sorted internally, so this should be true
      assert.strictEqual(isUniformObjectArray([
        { a: 1, b: 2 },
        { b: 3, a: 4 }
      ]), true);
    });
  });

  describe('getUniformColumns - COMPLETE Coverage', () => {
    it('should handle empty array', () => {
      assert.deepStrictEqual(getUniformColumns([]), []);
    });

    it('should return sorted column names', () => {
      assert.deepStrictEqual(
        getUniformColumns([{ z: 1, a: 2, m: 3 }]),
        ['a', 'm', 'z']
      );
    });

    it('should use first object keys', () => {
      assert.deepStrictEqual(
        getUniformColumns([
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 }
        ]),
        ['age', 'name']
      );
    });

    it('should handle single key', () => {
      assert.deepStrictEqual(
        getUniformColumns([{ x: 1 }]),
        ['x']
      );
    });
  });

  describe('inferTypeFromString - COMPLETE Coverage', () => {
    it('should infer null', () => {
      assert.strictEqual(inferTypeFromString('null'), 'null');
      assert.strictEqual(inferTypeFromString(''), 'null');
      assert.strictEqual(inferTypeFromString('  '), 'null');
    });

    it('should infer bool', () => {
      assert.strictEqual(inferTypeFromString('true'), 'bool');
      assert.strictEqual(inferTypeFromString('false'), 'bool');
      assert.strictEqual(inferTypeFromString('  true  '), 'bool');
      assert.strictEqual(inferTypeFromString('  false  '), 'bool');
    });

    it('should infer u32 for positive integers', () => {
      assert.strictEqual(inferTypeFromString('0'), 'u32');
      assert.strictEqual(inferTypeFromString('42'), 'u32');
      assert.strictEqual(inferTypeFromString('999'), 'u32');
    });

    it('should infer i32 for negative integers', () => {
      assert.strictEqual(inferTypeFromString('-1'), 'i32');
      assert.strictEqual(inferTypeFromString('-42'), 'i32');
      assert.strictEqual(inferTypeFromString('-999'), 'i32');
    });

    it('should infer f64 for decimals', () => {
      assert.strictEqual(inferTypeFromString('3.14'), 'f64');
      assert.strictEqual(inferTypeFromString('-3.14'), 'f64');
      assert.strictEqual(inferTypeFromString('0.5'), 'f64');
      assert.strictEqual(inferTypeFromString('.5'), 'f64');
    });

    it('should infer str for quoted strings', () => {
      assert.strictEqual(inferTypeFromString('"hello"'), 'str');
      assert.strictEqual(inferTypeFromString('"42"'), 'str');
      assert.strictEqual(inferTypeFromString('""'), 'str');
    });

    it('should default to str for unrecognized', () => {
      assert.strictEqual(inferTypeFromString('hello'), 'str');
      assert.strictEqual(inferTypeFromString('not-a-number'), 'str');
      assert.strictEqual(inferTypeFromString('TRUE'), 'str');
      assert.strictEqual(inferTypeFromString('abc123'), 'str');
    });
  });
});
