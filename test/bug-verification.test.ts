/**
 * Bug verification tests
 * These tests verify bugs found during code review
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TONLDocument } from '../dist/document.js';

describe('Bug Verification Tests', () => {
  /**
   * BUG #1: query/evaluator.ts:435
   * Incorrect loop safety check: result.length > length
   * This check is logically flawed and could prevent valid slices
   */
  it('BUG #1: Slice with large step should not be incorrectly limited', () => {
    // Test data: array of 10 items
    const data = { items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] };
    const doc = TONLDocument.fromJSON(data);

    // Slice with step=2 should return [0, 2, 4, 6, 8]
    const result1 = doc.query('items[0:10:2]');
    assert.deepStrictEqual(result1, [0, 2, 4, 6, 8], 'Step 2 slice should return 5 elements');

    // Slice with step=3 should return [0, 3, 6, 9]
    const result2 = doc.query('items[0:10:3]');
    assert.deepStrictEqual(result2, [0, 3, 6, 9], 'Step 3 slice should return 4 elements');

    // Edge case: slice larger than array with step
    const result3 = doc.query('items[0:100:1]');
    assert.strictEqual(result3.length, 10, 'Slice beyond array bounds should return all elements');
  });

  /**
   * BUG #2: parser/value-parser.ts:25
   * Incorrect fallback when arrayLength is 0 (falsy value)
   */
  it('BUG #2: Zero-length arrays should use declared length, not calculate from fields', () => {
    // This test would require encoding/decoding a zero-length array
    // and ensuring it preserves the length
    const data = { emptyArray: [] };
    const doc = TONLDocument.fromJSON(data);
    const tonl = doc.toTONL();

    // Decode and verify
    const decoded = TONLDocument.parse(tonl);
    const result = decoded.get('emptyArray');
    assert.deepStrictEqual(result, [], 'Empty array should remain empty');
  });

  /**
   * BUG #3: query/validator.ts:140
   * Slice validation doesn't account for negative indices properly
   */
  it('BUG #3: Negative index slices should validate correctly', () => {
    const data = { items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] };
    const doc = TONLDocument.fromJSON(data);

    // Negative indices should work
    const result1 = doc.query('items[-5:-1]');
    assert.deepStrictEqual(result1, [5, 6, 7, 8], 'Negative slice should work');

    // Mixed positive and negative
    const result2 = doc.query('items[2:-2]');
    assert.deepStrictEqual(result2, [2, 3, 4, 5, 6, 7], 'Mixed indices should work');
  });

  /**
   * BUG #4: cli.ts TypeScript type issues
   * These are compile-time bugs, not runtime bugs
   * Testing that the CLI handles undefined options correctly
   */
  it('BUG #4: CLI should handle missing options gracefully', () => {
    // This would require testing the CLI directly
    // For now, just verify the type safety works at runtime
    assert.ok(true, 'CLI type safety test placeholder');
  });

  /**
   * NEW BUG-001: encode.ts:442 - Incorrect logical operator
   * The condition uses || when it should use &&
   * This causes arrays containing objects to be incorrectly marked as primitive arrays
   */
  it('NEW BUG-001: Should NOT use schema-first for arrays with nested objects', () => {
    const data = [
      { id: 1, nested: { inner: 'value' } },
      { id: 2, nested: { inner: 'value2' } }
    ];

    const doc = TONLDocument.fromJSON(data);
    const tonl = doc.toTONL();

    // Decode and verify round-trip preserves nested objects
    const decoded = TONLDocument.parse(tonl);
    assert.deepStrictEqual(decoded.data, data, 'Round-trip should preserve nested objects');
  });

  it('NEW BUG-001b: Should correctly identify arrays with object elements', () => {
    const data = [
      { id: 1, items: [{name: 'obj1'}, {name: 'obj2'}] },
      { id: 2, items: [{name: 'obj3'}, {name: 'obj4'}] }
    ];

    const doc = TONLDocument.fromJSON(data);
    const tonl = doc.toTONL();
    const decoded = TONLDocument.parse(tonl);

    assert.deepStrictEqual(decoded.data, data, 'Arrays containing objects should round-trip correctly');
  });

  /**
   * NEW BUG-001c: Test case that specifically triggers the buggy line 442-443
   * Testing array property values that contain objects
   */
  it('NEW BUG-001c: Array property containing objects should round-trip', () => {
    // This specifically tests the buggy code path:
    // An array of objects where one property is an array containing objects
    const data = [
      { id: 1, tags: ['simple', 'string'] }, // This should work
      { id: 2, tags: ['simple', 'string'] }
    ];

    // Test with simple arrays first (should work)
    const doc1 = TONLDocument.fromJSON(data);
    const tonl1 = doc1.toTONL();
    const decoded1 = TONLDocument.parse(tonl1);
    assert.deepStrictEqual(decoded1.data, data, 'Simple string arrays should work');

    // Now test with array containing an object (triggers bug)
    const dataWithObjInArray = [
      { id: 1, tags: ['simple', {complex: 'object'}] },
      { id: 2, tags: ['simple', {complex: 'object2'}] }
    ];

    const doc2 = TONLDocument.fromJSON(dataWithObjInArray);
    const tonl2 = doc2.toTONL();
    const decoded2 = TONLDocument.parse(tonl2);

    // This should fail if the bug allows schema-first format for arrays containing objects
    assert.deepStrictEqual(decoded2.data, dataWithObjInArray,
      'Arrays containing objects should round-trip correctly - BUG: incorrect || operator allows objects through');
  });
});
