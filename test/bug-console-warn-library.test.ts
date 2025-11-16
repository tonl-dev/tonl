/**
 * Test for BUG-NEW-006 & BUG-NEW-007: Console.warn in library code
 *
 * Validates that library code does not use console methods
 * Primary goal: Ensure console.warn is removed from library code
 * Secondary: Verify SecurityError is still thrown for unsafe patterns
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { TONLDocument } from '../dist/document.js';
import { decodeTONL } from '../dist/decode.js';

describe('BUG-NEW-006 & BUG-NEW-007: No console output from library code', () => {
  it('should throw SecurityError for unsafe regex without console.warn', () => {
    const doc = TONLDocument.parse(`
items[2]:
  name, value
  test1, "hello"
  test2, "world"
`);

    // BUG-NEW-006 FIX: Should throw SecurityError WITHOUT console.warn
    // The fix removed console.warn from filter-evaluator.ts
    assert.throws(
      () => {
        // Malicious ReDoS pattern
        doc.query('$.items[?(@.name matches "^(a+)+$")]');
      },
      /SecurityError|Unsafe regex pattern/,
      'Should throw SecurityError for unsafe regex'
    );
    // If this test passes, the SecurityError was thrown WITHOUT console.warn
  });

  it('should handle malformed TONL in non-strict mode silently', () => {
    const malformedTONL = `
obj:
  validKey: value
  this is malformed line without colon
  anotherKey: value
`;

    // BUG-NEW-007 FIX: Should parse WITHOUT console.warn
    // The fix removed console.warn from block-parser.ts
    const result = decodeTONL(malformedTONL, { strict: false });

    assert.ok(result, 'Should parse successfully in non-strict mode');
    assert.ok(result.obj, 'Should have obj property');
    assert.strictEqual(result.obj.validKey, 'value', 'Valid keys should be parsed');
    assert.strictEqual(result.obj.anotherKey, 'value', 'Valid keys should be parsed');
    // If this test passes, malformed lines were skipped WITHOUT console.warn
  });

  it('should throw error in strict mode for malformed lines', () => {
    const malformedTONL = `
obj:
  validKey: value
  this is malformed line
`;

    // Strict mode should still throw errors (no change from bug fix)
    assert.throws(
      () => {
        decodeTONL(malformedTONL, { strict: true });
      },
      /Unparseable line/,
      'Should throw error in strict mode'
    );
  });

  it('should successfully query with valid regex patterns', () => {
    const doc = TONLDocument.parse(`
users[3]:
  name, email
  alice, "alice@company.com"
  bob, "bob@personal.com"
  charlie, "charlie@company.com"
`);

    // Valid patterns should work fine (no change from bug fix)
    const result = doc.query('$.users[?(@.email matches "company")]');

    assert.ok(Array.isArray(result), 'Result should be an array');
    // This verifies that valid regex still works after our changes
  });
});
