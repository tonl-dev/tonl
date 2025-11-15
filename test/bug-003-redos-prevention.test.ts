/**
 * BUG-003: ReDoS Attack Prevention Test
 *
 * Severity: HIGH
 *
 * Description: Test safeJsonParse function protects against ReDoS attacks
 * and memory exhaustion through malicious JSON input
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { safeJsonParse } from '../dist/utils/strings.js';

describe('BUG-003: ReDoS Attack Prevention', () => {
  test('should reject oversized JSON input', () => {
    // Create JSON string larger than 10MB limit
    const largeObject = {};
    for (let i = 0; i < 100000; i++) {
      largeObject[`key${i}`] = 'x'.repeat(100);
    }
    const largeJson = JSON.stringify(largeObject);

    assert.ok(largeJson.length > 10 * 1024 * 1024, 'Test data should be larger than 10MB');

    try {
      safeJsonParse(largeJson);
      assert.fail('Should have thrown error for oversized input');
    } catch (error: any) {
      assert.ok(error.message.includes('JSON input too large'),
        `Expected size error, got: ${error.message}`);
    }
  });

  test('should reject overly nested JSON', () => {
    // Create deeply nested JSON (more than 100 levels)
    let nested: any = {};
    let current = nested;

    for (let i = 0; i < 150; i++) {
      current.next = {};
      current = current.next;
    }

    const deeplyNestedJson = JSON.stringify(nested);

    try {
      safeJsonParse(deeplyNestedJson);
      assert.fail('Should have thrown error for deep nesting');
    } catch (error: any) {
      assert.ok(error.message.includes('nesting too deep'),
        `Expected nesting error, got: ${error.message}`);
    }
  });

  test('should reject JSON with too many objects', () => {
    // Create JSON with many objects (more than 10000)
    const manyObjects = [];
    for (let i = 0; i < 15000; i++) {
      manyObjects.push({ id: i, data: 'test' });
    }

    const manyObjectsJson = JSON.stringify(manyObjects);

    try {
      safeJsonParse(manyObjectsJson);
      assert.fail('Should have thrown error for too many objects');
    } catch (error: any) {
      assert.ok(error.message.includes('Too many objects'),
        `Expected object count error, got: ${error.message}`);
    }
  });

  test('should reject unbalanced brackets', () => {
    const unbalancedJson = '{"key": "value"';

    try {
      safeJsonParse(unbalancedJson);
      assert.fail('Should have thrown error for unbalanced brackets');
    } catch (error: any) {
      assert.ok(error.message.includes('unbalanced brackets'),
        `Expected unbalanced brackets error, got: ${error.message}`);
    }
  });

  test('should reject empty input', () => {
    try {
      safeJsonParse('');
      assert.fail('Should have thrown error for empty input');
    } catch (error: any) {
      assert.ok(error.message.includes('cannot be empty'),
        `Expected empty input error, got: ${error.message}`);
    }
  });

  test('should reject non-JSON format', () => {
    try {
      safeJsonParse('not json');
      assert.fail('Should have thrown error for invalid format');
    } catch (error: any) {
      assert.ok(error.message.includes('Invalid JSON format'),
        `Expected format error, got: ${error.message}`);
    }
  });

  test('should accept valid JSON within limits', () => {
    const validJson = JSON.stringify({
      users: [
        { id: 1, name: 'Alice', active: true },
        { id: 2, name: 'Bob', active: false }
      ],
      metadata: {
        version: '1.0',
        created: new Date().toISOString()
      }
    });

    const result = safeJsonParse(validJson);
    assert.ok(typeof result === 'object', 'Should parse valid JSON successfully');
    assert.ok((result as any).users, 'Should preserve object structure');
    assert.strictEqual((result as any).users.length, 2, 'Should preserve array data');
  });

  test('should handle reasonable nesting', () => {
    // Create JSON with acceptable nesting level (50 < 100)
    let nested: any = {};
    let current = nested;

    for (let i = 0; i < 50; i++) {
      current.next = {};
      current = current.next;
    }
    current.value = 'deep value';

    const reasonablyNestedJson = JSON.stringify(nested);

    const result = safeJsonParse(reasonablyNestedJson);
    assert.ok(result, 'Should parse reasonably nested JSON');

    // Navigate to the deep value
    current = result;
    for (let i = 0; i < 50; i++) {
      current = current.next;
    }
    assert.strictEqual(current.value, 'deep value', 'Should preserve deeply nested values');
  });

  test('should accept custom limits', () => {
    const customLimits = {
      maxNesting: 10,
      maxProperties: 100,
      maxArrayLength: 100
    };

    // Test with stricter limits
    let nested: any = {};
    let current = nested;

    for (let i = 0; i < 15; i++) { // Exceeds custom limit of 10
      current.next = {};
      current = current.next;
    }

    const deeplyNestedJson = JSON.stringify(nested);

    try {
      safeJsonParse(deeplyNestedJson, customLimits);
      assert.fail('Should have thrown error with custom limits');
    } catch (error: any) {
      assert.ok(error.message.includes('nesting too deep'),
        `Expected custom nesting error, got: ${error.message}`);
    }
  });

  test('should provide clear error messages', () => {
    const testCases = [
      { input: '', expectedError: 'cannot be empty' },
      { input: 'invalid', expectedError: 'Invalid JSON format' },
      { input: '{"unclosed": "value"', expectedError: 'unbalanced brackets' }
    ];

    for (const testCase of testCases) {
      try {
        safeJsonParse(testCase.input);
        assert.fail(`Should have thrown error for: ${testCase.input}`);
      } catch (error: any) {
        assert.ok(error.message.includes(testCase.expectedError),
          `Expected "${testCase.expectedError}" in error message: ${error.message}`);
      }
    }
  });
});