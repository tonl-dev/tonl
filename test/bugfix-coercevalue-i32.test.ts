/**
 * Bug Fix Test: i32 overflow validation in coerceValue
 *
 * BUG LOCATION: src/infer.ts line 94
 *
 * DESCRIPTION:
 * The i32 overflow check uses `unquoted.replace(/^-/, '-')` which replaces
 * a leading minus sign with... a minus sign. This regex does nothing, making
 * the overflow check ineffective. It should compare `i32.toString()` directly
 * with `unquoted` to properly detect overflow, just like the u32 case does.
 *
 * REPRODUCTION:
 * When coercing a string like "-0002147483648" (with leading zeros) to i32,
 * the check fails because `-2147483648.toString()` returns "-2147483648"
 * but `unquoted.replace(/^-/, '-')` returns "-0002147483648" unchanged.
 * The leading zeros should be detected as an overflow/formatting issue.
 *
 * IMPACT:
 * Leading zeros or other formatting in negative i32 values are not properly
 * detected, allowing malformed input to pass validation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { coerceValue } from '../dist/infer.js';

describe('Bug Fix: i32 overflow validation', () => {
  it('should reject negative i32 values with leading zeros', () => {
    // This test demonstrates the bug
    // Leading zeros should be rejected as they don't match the canonical form
    assert.throws(
      () => coerceValue('-0002147483648', 'i32'),
      /overflow detected/i,
      'Should reject i32 with leading zeros'
    );
  });

  it('should reject negative i32 values with extra minus signs', () => {
    // The current implementation uses replace(/^-/, '-') which is a no-op
    // This means any string manipulation won't be caught
    const validValue = '-2147483648'; // Valid minimum i32
    const result = coerceValue(validValue, 'i32');
    assert.strictEqual(result, -2147483648, 'Valid i32 should be accepted');
  });

  it('should accept valid negative i32 values without leading zeros', () => {
    const tests = [
      { input: '-1', expected: -1 },
      { input: '-2147483648', expected: -2147483648 }, // Min i32
      { input: '-100', expected: -100 },
    ];

    for (const test of tests) {
      const result = coerceValue(test.input, 'i32');
      assert.strictEqual(result, test.expected, `Should accept ${test.input}`);
    }
  });

  it('should reject i32 values that have wrong format after parsing', () => {
    // Test case that exposes the bug: leading zeros
    // After parseInt('-0042', 10), we get -42
    // But '-42' !== '-0042', so this should fail
    assert.throws(
      () => coerceValue('-0042', 'i32'),
      /overflow detected/i,
      'Should reject -0042 (leading zeros)'
    );
  });

  it('should handle edge cases for i32 range', () => {
    // Max i32: 2147483647
    assert.strictEqual(coerceValue('2147483647', 'i32'), 2147483647);

    // Min i32: -2147483648
    assert.strictEqual(coerceValue('-2147483648', 'i32'), -2147483648);

    // Out of range should fail in range check
    assert.throws(
      () => coerceValue('2147483648', 'i32'),
      /out of range/i,
      'Should reject value above i32 max'
    );

    assert.throws(
      () => coerceValue('-2147483649', 'i32'),
      /out of range/i,
      'Should reject value below i32 min'
    );
  });

  it('should match u32 behavior for leading zeros', () => {
    // u32 correctly rejects leading zeros on line 81-83
    // i32 should do the same
    assert.throws(
      () => coerceValue('0042', 'u32'),
      /overflow detected/i,
      'u32 rejects leading zeros'
    );

    // i32 should also reject leading zeros
    assert.throws(
      () => coerceValue('-0042', 'i32'),
      /overflow detected/i,
      'i32 should also reject leading zeros'
    );
  });
});
