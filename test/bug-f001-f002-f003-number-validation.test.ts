/**
 * BUG-F001, F002, F003: Number Validation Tests
 *
 * SEVERITY: MEDIUM
 * CATEGORY: Functional Bug - Input Validation
 *
 * DESCRIPTION:
 * parseInt and parseFloat are used without validating results.
 * Invalid numbers could produce NaN or Infinity, causing unexpected behavior.
 *
 * FILES:
 * - BUG-F001: src/parser/content-parser.ts:78, src/parser/block-parser.ts:152
 * - BUG-F002: src/parser/line-parser.ts:60-73
 * - BUG-F003: src/query/tokenizer.ts:137
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { decodeTONL } from '../dist/index.js';
import { TONLDocument } from '../dist/document.js';
import { TONLParseError } from '../dist/errors/index.js';

// BUG-F001: Array length validation
test('BUG-F001: Invalid array length should throw error', () => {
  const invalidTONL = 'items[abc]: 1, 2, 3';

  assert.throws(
    () => decodeTONL(invalidTONL),
    (err: any) => err instanceof TONLParseError && err.message.includes('array length'),
    'Should reject invalid array length'
  );
});

test('BUG-F001: Negative array length should throw error', () => {
  const invalidTONL = 'items[-5]: 1, 2, 3';

  assert.throws(
    () => decodeTONL(invalidTONL),
    TONLParseError,
    'Should reject negative array length'
  );
});

test('BUG-F001: Valid array length should work', () => {
  const validTONL = 'items[3]: 1, 2, 3';
  const result = decodeTONL(validTONL);

  assert.deepStrictEqual(result, { items: [1, 2, 3] });
});

// BUG-F002: Number parsing validation
test('BUG-F002: Extremely large integer should be handled safely', () => {
  // Numbers beyond MAX_SAFE_INTEGER
  const largeTONL = `value: ${Number.MAX_SAFE_INTEGER + 1000}`;

  // BUG-007 FIX: Should be preserved as string to prevent precision loss
  const result = decodeTONL(largeTONL);
  assert.ok(typeof result.value === 'string', 'Large integers should be preserved as strings');
  assert.ok(result.value === String(Number.MAX_SAFE_INTEGER + 1000), 'Value should match original');
});

test('BUG-F002: Valid numbers parse correctly', () => {
  const tonl = `
int: 42
negative: -100
float: 3.14
zero: 0
`;

  const result = decodeTONL(tonl.trim());
  assert.strictEqual(result.int, 42);
  assert.strictEqual(result.negative, -100);
  assert.strictEqual(result.float, 3.14);
  assert.strictEqual(result.zero, 0);
});

// BUG-F003: Query tokenizer number validation
test('BUG-F003: Query with extremely large number should handle safely', () => {
  const doc = TONLDocument.fromJSON({
    items: [
      { id: 1, value: 100 },
      { id: 2, value: 200 }
    ]
  });

  // Query with very large number
  const result = doc.query(`items[?(@.value < ${Number.MAX_VALUE})]`);
  assert.strictEqual(result.length, 2, 'Should handle large numbers in queries');
});

test('BUG-F003: Query with normal numbers works correctly', () => {
  const doc = TONLDocument.fromJSON({
    items: [
      { id: 1, score: 85 },
      { id: 2, score: 92 },
      { id: 3, score: 78 }
    ]
  });

  const result = doc.query('items[?(@.score > 80)]');
  assert.strictEqual(result.length, 2);
  assert.deepStrictEqual(result.map((r: any) => r.id), [1, 2]);
});

// Edge cases
test('Number validation: Zero is valid', () => {
  const tonl = 'count: 0';
  const result = decodeTONL(tonl);
  assert.strictEqual(result.count, 0);
});

test('Number validation: Negative zero is handled', () => {
  const tonl = 'value: -0';
  const result = decodeTONL(tonl);
  assert.ok(Object.is(result.value, -0) || result.value === 0);
});
